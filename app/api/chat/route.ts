// app/api/chat/route.ts
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt, getCharacterReferenceImages } from "@/app/characters/characters";
import fs from "fs";
import path from "path";

/* ───────────────── CLIENTS ───────────────── */

const deepseekClient = new OpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY!,
});

const openrouterClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const GIPHY_API_KEY = process.env.GIPHY_API_KEY!;

/* ───────────────── PERFORMANCE LIMITS ───────────────── */

const MAX_HISTORY = 20;
const MAX_INPUT_CHARS = 1200;

/* ───────────────── STICKER CACHE ───────────────── */

let _stickerCache: string[] | null = null;

function getAvailableStickers(): string[] {
  if (_stickerCache) return _stickerCache;

  try {
    const baseDir = path.join(process.cwd(), "public", "stickers");
    if (!fs.existsSync(baseDir)) return (_stickerCache = []);

    const results: string[] = [];

    function scan(dir: string, prefix: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          scan(path.join(dir, entry.name), prefix + entry.name + "/");
        } else if (/\.(png|gif|webp|jpg|jpeg)$/i.test(entry.name)) {
          results.push(prefix + entry.name.replace(/\.(png|gif|webp|jpg|jpeg)$/i, ""));
        }
      }
    }

    scan(baseDir, "");
    return (_stickerCache = results);
  } catch {
    return (_stickerCache = []);
  }
}

/* ───────────────── GIF CACHE ───────────────── */

const gifCache = new Map<string, string>();

async function fetchGiphyGif(searchTerm: string): Promise<string | null> {
  if (!GIPHY_API_KEY) return null;

  if (gifCache.has(searchTerm)) {
    return gifCache.get(searchTerm)!;
  }

  try {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchTerm)}&limit=8&rating=pg-13`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const results = data.data;

    if (!results?.length) return null;

    const pick = results[Math.floor(Math.random() * results.length)];

    const gif =
      pick.images?.downsized_medium?.url ??
      pick.images?.downsized?.url ??
      pick.images?.original?.url ??
      null;

    if (gif) gifCache.set(searchTerm, gif);

    return gif;
  } catch {
    return null;
  }
}

/* ───────────────── TYPES ───────────────── */

type ChatRole = "user" | "assistant" | "system";

type TextMessage = {
  role: ChatRole;
  content: string;
};

type VisionMessage = {
  role: "user";
  content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  >;
};

type ChatMessage = TextMessage | VisionMessage;

/* ───────────────── MODEL ORDER ───────────────── */

const OPENROUTER_FALLBACKS = [
  "meta-llama/llama-3.1-8b-instruct:free",
  "qwen/qwen3-8b:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "google/gemma-3-27b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/* ───────────────── PARAMS ───────────────── */

const PARAMS = {
  temperature: 1.3,
  presence_penalty: 1.0,
  frequency_penalty: 0.8,
  max_tokens: 180,
};

const PARAMS_LT = {
  temperature: 1.2,
  presence_penalty: 0.7,
  frequency_penalty: 0.5,
  max_tokens: 80,
};

/* ───────────────── MODEL CALLERS ───────────────── */

async function callDeepSeek(messages: ChatMessage[], systemPrompt: string, params = PARAMS) {
  const response = await deepseekClient.chat.completions.create({
    model: "deepseek-chat",
    messages: [{ role: "system", content: systemPrompt }, ...(messages as any)],
    ...params,
  });

  return response.choices?.[0]?.message?.content?.trim() ?? "";
}

async function callOpenRouter(model: string, messages: ChatMessage[], systemPrompt: string, params = PARAMS) {
  const response = await openrouterClient.chat.completions.create({
    model,
    messages: [{ role: "system", content: systemPrompt }, ...(messages as any)],
    ...params,
  });

  return response.choices?.[0]?.message?.content?.trim() ?? "";
}

async function callOpenAIVision(
  messages: ChatMessage[],
  systemPrompt: string,
  referenceImageUrl?: string,
  referenceImageChibiUrl?: string
) {
  const extra: any[] = [];

  if (referenceImageUrl || referenceImageChibiUrl) {
    extra.push({
      role: "user",
      content: [
        { type: "text", text: "Reference images of yourself:" },
        ...(referenceImageUrl ? [{ type: "image_url", image_url: { url: referenceImageUrl } }] : []),
        ...(referenceImageChibiUrl ? [{ type: "image_url", image_url: { url: referenceImageChibiUrl } }] : []),
      ],
    });
  }

  const response = await openaiClient.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: systemPrompt }, ...extra, ...(messages as any)],
    ...PARAMS,
  });

  return response.choices?.[0]?.message?.content?.trim() ?? "";
}

/* ───────────────── RESPONSE PARSER ───────────────── */

type ParsedMessage = {
  text: string;
  gifQuery: string | null;
  stickerName: string | null;
  annoyanceDelta: number;
  listenTogether?: {
    videoId: string;
    title: string;
    channel: string;
  } | null;
};

function parseAIResponse(raw: string): ParsedMessage[] {
  const parts = raw.split(/\s*\|\|\|\s*/).filter(Boolean);

  return parts.map(p => {
    let text = p.trim();

    let gifQuery: string | null = null;
    let stickerName: string | null = null;
    let annoyanceDelta = 0;
    let listenTogether: { videoId: string; title: string; channel: string } | null = null;

    /* ───── Extract ANN tag ───── */

    const annMatch = text.match(/\[ANN:([+-]?\d+)\]/i);

    if (annMatch) {
      annoyanceDelta = parseInt(annMatch[1], 10) || 0;
      text = text.replace(annMatch[0], "");
    }

    /* ───── Extract GIF tag ───── */

    const gifMatch = text.match(/\[GIF:([^\]]+)\]/i);

    if (gifMatch) {
      gifQuery = gifMatch[1];
      text = text.replace(gifMatch[0], "");
    }

    /* ───── Extract Sticker tag ───── */

    const stickerMatch = text.match(/\[STICKER:([^\]]+)\]/i);

    if (stickerMatch) {
      stickerName = stickerMatch[1];
      text = text.replace(stickerMatch[0], "");
    }

    /* ───── Extract LISTEN_TOGETHER tag ───── */

    const ltMatch = text.match(/\[LISTEN_TOGETHER:([^\]]+)\]/i);

    if (ltMatch) {
      const parts = ltMatch[1].split(':');
      if (parts.length >= 1) {
        listenTogether = {
          videoId: parts[0]?.trim() || 'dQw4w9WgXcQ',
          title: parts[1]?.trim() || 'A video',
          channel: parts[2]?.trim() || 'YouTube',
        };
      }
      text = text.replace(ltMatch[0], "").trim();
    }

    return {
      text: text.trim(),
      gifQuery,
      stickerName,
      annoyanceDelta,
      listenTogether,
    };
  });
}

/* ───────────────── MAIN ROUTE ───────────────── */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const character = body.character ?? "aemeath";
    const playerName = body.playerName ?? "Rover";
    const playerKey = body.playerKey ?? "rover";

    const listenTogether = body.listenTogether;
    const transcript = body.ltTranscript;
    const videoTitle = body.ltVideoTitle;
    const currentTime = body.ltCurrentTime;

    const rawMessages = (body.messages ?? []).slice(-MAX_HISTORY);

    const availableStickers = getAvailableStickers();

    let systemPrompt = buildSystemPrompt(
      character,
      playerName,
      playerKey,
      availableStickers
    );

    // Add Listen Together instructions to the system prompt
    systemPrompt += `

IMPORTANT: You can invite the user to watch videos together using the LISTEN_TOGETHER tag format:
[LISTEN_TOGETHER:videoId:Video Title:Channel Name]

Examples:
- [LISTEN_TOGETHER:dQw4w9WgXcQ:Augusta Gameplay Showcase:Kuro Games]
- [LISTEN_TOGETHER:abc123xyz:Character Trailer:Wuthering Waves]

Use this when:
- The user asks you to watch something
- You find content relevant to the conversation
- You want to share a video with the user

The tag will be replaced with an interactive invite bubble in the chat.
Place it at the end of your message, like: "I found this great video! [LISTEN_TOGETHER:dQw4w9WgXcQ:Augusta Gameplay:Kuro Games]"
`;

    /* ───────── LISTEN TOGETHER CONTEXT ───────── */

    if (listenTogether && transcript) {
      systemPrompt += `

You and the user are watching a YouTube video together.

Video title:
${videoTitle ?? "unknown"}

Current playback time:
${Math.floor(currentTime ?? 0)} seconds

Transcript excerpt:
${transcript}

React naturally to the content of the video.
Do not repeat transcript lines word-for-word.
Comment on what is happening in the scene.`;
    }

    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    const refs = getCharacterReferenceImages(character);

    const referenceImageUrl = refs.normal ? `${base}${refs.normal}` : undefined;
    const referenceImageChibiUrl = refs.chibi ? `${base}${refs.chibi}` : undefined;

    const messages: ChatMessage[] = rawMessages.map((m: any) => ({
      role: m.role,
      content: m.content?.slice(0, MAX_INPUT_CHARS) ?? "",
    }));

    const hasImage = rawMessages.some((m: any) => m.imageUrl);

    const params = listenTogether ? PARAMS_LT : PARAMS;

    let rawContent = "";

    if (!hasImage) {
      try {
        rawContent = await callDeepSeek(messages, systemPrompt, params);
      } catch {}

      if (!rawContent) {
        try {
          rawContent = await callOpenAIVision(messages, systemPrompt);
        } catch {}
      }

      if (!rawContent) {
        for (const model of OPENROUTER_FALLBACKS) {
          try {
            rawContent = await callOpenRouter(model, messages, systemPrompt, params);
            if (rawContent) break;
          } catch (err: any) {
            if (err?.status === 429) await sleep(800);
          }
        }
      }
    } else {
      try {
        rawContent = await callOpenAIVision(
          messages,
          systemPrompt,
          referenceImageUrl,
          referenceImageChibiUrl
        );
      } catch {}

      if (!rawContent) {
        try {
          rawContent = await callDeepSeek(messages, systemPrompt);
        } catch {}
      }
    }

    if (!rawContent) {
      return NextResponse.json({
        role: "assistant",
        messages: [{ content: "all channels busy.", gifUrl: null, stickerName: null }],
      });
    }

    const parsed = parseAIResponse(rawContent);

    const messagesOut = await Promise.all(
      parsed.map(async p => {
        let gifUrl: string | null = null;

        if (p.gifQuery) {
          gifUrl = await fetchGiphyGif(p.gifQuery);
        }

        // If this part has a listenTogether tag, we need to include it in the content
        let content = p.text;
        if (p.listenTogether) {
          // Add the LISTEN_TOGETHER tag back to the content so the frontend can detect it
          content += ` [LISTEN_TOGETHER:${p.listenTogether.videoId}:${p.listenTogether.title}:${p.listenTogether.channel}]`;
        }

        return {
          content: content,
          gifUrl,
          stickerName: p.stickerName ?? null,
        };
      })
    );

    return NextResponse.json({
      role: "assistant",
      messages: messagesOut,
      content: messagesOut[0]?.content ?? "",
      gifUrl: messagesOut[0]?.gifUrl ?? null,
      stickerName: messagesOut[0]?.stickerName ?? null,
    });

  } catch (err: any) {
    console.error(err);

    return NextResponse.json({
      role: "assistant",
      messages: [{ content: "something broke.", gifUrl: null, stickerName: null }],
    });
  }
}