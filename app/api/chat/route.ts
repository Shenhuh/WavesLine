// app/api/chat/route.ts
// Only the relevant change is in the listenTogether system prompt block.
// Drop this section in to replace the existing listenTogether block in your route.ts.

// ── LISTEN TOGETHER SYSTEM PROMPT ADDON ──────────────────────────────────
// Replace the existing `if (listenTogether)` block with this:

/*
  if (listenTogether) {
    const angle: string = body.listenTogetherAngle ?? "";
    const priorReactions: string[] = body.priorReactions ?? [];
    const priorList = priorReactions.length > 0
      ? `\n\nYour last ${priorReactions.length} reactions (you MUST say something completely different):\n${priorReactions.map((r, i) => `${i + 1}. "${r}"`).join("\n")}`
      : "";

    systemPrompt += `\n\n═══ LISTEN TOGETHER MODE ═══
You are watching a video together with ${playerName}. You must react AUTHENTICALLY and with VARIETY.

STRICT RULES:
1. NEVER say anything semantically similar to your prior reactions listed below
2. React to a SPECIFIC, CONCRETE detail — not vague impressions
3. Forbidden phrases (never use): "melody is familiar", "hollow echo", "something once warm", "dissonant yet", "frequencies", "resonates"
4. Your reaction angle for this message: ${angle || "anything you haven't commented on yet"}
5. Keep it to 1-2 sentences
6. Be genuinely in-character — your personality should color the reaction
${priorList}
═══════════════════════════`;
  }
*/

// ── FULL UPDATED ROUTE ────────────────────────────────────────────────────
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt, getCharacterReferenceImages } from "@/app/characters/characters";
import fs from "fs";
import path from "path";

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

async function fetchGiphyGif(searchTerm: string): Promise<string | null> {
  if (!GIPHY_API_KEY) return null;
  try {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchTerm)}&limit=8&rating=pg-13`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const results = data.data;
    if (!results?.length) return null;
    const pick = results[Math.floor(Math.random() * results.length)];
    return pick.images?.downsized_medium?.url ?? pick.images?.downsized?.url ?? pick.images?.original?.url ?? null;
  } catch {
    return null;
  }
}

function getAvailableStickers(): string[] {
  try {
    const baseDir = path.join(process.cwd(), "public", "stickers");
    if (!fs.existsSync(baseDir)) return [];
    const results: string[] = [];
    function scan(dir: string, prefix: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          scan(path.join(dir, entry.name), prefix + entry.name + "/");
        } else if (/\.(png|gif|webp|jpg|jpeg)$/i.test(entry.name)) {
          const nameOnly = entry.name.replace(/\.(png|gif|webp|jpg|jpeg)$/i, "");
          results.push(prefix + nameOnly);
        }
      }
    }
    scan(baseDir, "");
    return results;
  } catch { return []; }
}

type ChatRole = "user" | "assistant" | "system";
type TextMessage = { role: ChatRole; content: string };
type VisionMessage = {
  role: "user";
  content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  >;
};
type ChatMessage = TextMessage | VisionMessage;

const OPENROUTER_FALLBACKS = [
  "meta-llama/llama-3.1-8b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-27b-it:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "qwen/qwen3-8b:free",
  "openrouter/auto",
];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const PARAMS = {
  temperature: 1.3,
  presence_penalty: 1.0,
  frequency_penalty: 0.8,
  max_tokens: 180,
};

async function callDeepSeek(messages: ChatMessage[], systemPrompt: string): Promise<string> {
  const response = await deepseekClient.chat.completions.create({
    model: "deepseek-chat",
    messages: [{ role: "system" as const, content: systemPrompt }, ...(messages as any)],
    ...PARAMS,
  });
  return response.choices?.[0]?.message?.content?.trim() ?? "";
}

async function callOpenRouter(model: string, messages: ChatMessage[], systemPrompt: string): Promise<string> {
  const response = await openrouterClient.chat.completions.create({
    model,
    messages: [{ role: "system" as const, content: systemPrompt }, ...(messages as any)],
    ...PARAMS,
  });
  return response.choices?.[0]?.message?.content?.trim() ?? "";
}

async function callOpenAIVision(
  messages: ChatMessage[],
  systemPrompt: string,
  referenceImageUrl?: string,
  referenceImageChibiUrl?: string
): Promise<string> {
  const extraMessages: any[] = (referenceImageUrl || referenceImageChibiUrl) ? [{
    role: "user",
    content: [
      { type: "text", text: "These are reference images of yourself so you know what you look like — normal and chibi versions:" },
      ...(referenceImageUrl ? [{ type: "image_url", image_url: { url: referenceImageUrl, detail: "low" } }] : []),
      ...(referenceImageChibiUrl ? [{ type: "image_url", image_url: { url: referenceImageChibiUrl, detail: "low" } }] : []),
    ]
  }, {
    role: "assistant",
    content: "Understood. I recognize my own appearance from these references."
  }] : [];

  const response = await openaiClient.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system" as const, content: systemPrompt },
      ...extraMessages,
      ...(messages as any)
    ],
    ...PARAMS,
  });
  return response.choices?.[0]?.message?.content?.trim() ?? "";
}

type ParsedMessage = { text: string; gifQuery: string | null; stickerName: string | null };

function parseSingleMessage(raw: string): ParsedMessage {
  let text = raw.trim();
  let gifQuery: string | null = null;
  let stickerName: string | null = null;

  const gifMatch = text.match(/\[GIF:([^\]]+)\]/i);
  if (gifMatch) { gifQuery = gifMatch[1].trim(); text = text.replace(gifMatch[0], "").trim(); }

  const stickerMatch = text.match(/\[STICKER:([^\]]+)\]/i);
  if (stickerMatch) { stickerName = stickerMatch[1].trim(); text = text.replace(stickerMatch[0], "").trim(); }

  return { text, gifQuery, stickerName };
}

function parseAIResponse(raw: string): ParsedMessage[] {
  const parts = raw.split(/\s*\|\|\|\s*/).filter(p => p.trim());
  const parsed = parts.map(parseSingleMessage).filter(p => p.text || p.gifQuery || p.stickerName);
  return parsed.length > 0 ? parsed : [{ text: "...", gifQuery: null, stickerName: null }];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const character: string = body.character ?? "aemeath";
    const playerName: string = body.playerName ?? "Rover";
    const playerKey: string = body.playerKey ?? "rover";
    const unblockRequest: boolean = body.unblockRequest ?? false;
    const unblockAccepted: boolean = body.unblockAccepted ?? false;
    const listenTogether: boolean = body.listenTogether ?? false;
    const listenTogetherAngle: string = body.listenTogetherAngle ?? "";
    const priorReactions: string[] = body.priorReactions ?? [];
    const availableStickers = getAvailableStickers();

    let systemPrompt = buildSystemPrompt(character, playerName, playerKey, availableStickers);

    // ── LISTEN TOGETHER SYSTEM ADDON ──────────────────────────────────────
    if (listenTogether) {
      const priorList = priorReactions.length > 0
        ? `\n\nYour last ${priorReactions.length} reactions (you MUST say something completely different — not just rephrased):\n${priorReactions.map((r, i) => `${i + 1}. "${r}"`).join("\n")}`
        : "";

      systemPrompt += `\n\n═══ LISTEN TOGETHER MODE ═══
You are watching a video together with ${playerName}. React authentically and with VARIETY.

STRICT RULES:
1. NEVER repeat or rephrase anything in the "prior reactions" list below
2. Each reaction must focus on a DIFFERENT aspect than all prior ones
3. React to something SPECIFIC and CONCRETE — not vague impressions
4. BANNED phrases (never say): "melody is familiar", "hollow echo", "something once warm", 
   "dissonant yet", "frequencies", "resonates with", "certain beauty", "melancholy"
5. Max 1-2 sentences
6. Let your character's personality shape the reaction
7. Current focus angle: ${listenTogetherAngle || "something you haven't mentioned yet"}
${priorList}
═══════════════════════════`;
    }

    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const refImages = getCharacterReferenceImages(character);
    const referenceImageUrl = refImages.normal ? `${base}${refImages.normal}` : undefined;
    const referenceImageChibiUrl = refImages.chibi ? `${base}${refImages.chibi}` : undefined;

    if (unblockRequest) {
      systemPrompt += unblockAccepted
        ? `\n\n[UNBLOCK REQUEST]: The user sent you an unblock request. You decided to unblock them — reluctantly. Be mean about it. Make it clear this is not forgiveness.`
        : `\n\n[UNBLOCK REQUEST]: The user sent you an unblock request. You are keeping them blocked. Decline coldly. Do not explain yourself much.`;
    }

    const rawMessages: {
      role: string; content: string;
      imageUrl?: string; stickerName?: string; gifUrl?: string; gifCaption?: string;
    }[] = body.messages ?? [];

    const messages: ChatMessage[] = rawMessages
      .filter(m => ["user", "assistant"].includes(m.role))
      .map(m => {
        if (m.imageUrl && m.role === "user") {
          return {
            role: "user" as const,
            content: [
              ...(m.content ? [{ type: "text" as const, text: m.content }] : []),
              { type: "image_url" as const, image_url: { url: m.imageUrl } },
            ],
          } as VisionMessage;
        }
        let text = m.content.replace(/\[(GIF|STICKER):[^\]]+\]/gi, "").trim();
        if (!text && m.role === "user") {
          if (m.stickerName) text = `[${playerName} sent a sticker: ${m.stickerName}]`;
          else if (m.gifUrl) text = m.gifCaption ? `[${playerName} sent a GIF: ${m.gifCaption}]` : `[${playerName} sent a GIF]`;
        } else if (m.role === "user") {
          if (m.stickerName) text += ` [also sent a sticker: ${m.stickerName}]`;
          else if (m.gifUrl) text += m.gifCaption ? ` [also sent a GIF: ${m.gifCaption}]` : ` [also sent a GIF]`;
        }
        return { role: m.role as ChatRole, content: text || "[sent something]" };
      });

    const hasImage = rawMessages.some(m => m.imageUrl);
    let rawContent = "";

    if (!hasImage) {
      try {
        rawContent = await callDeepSeek(messages, systemPrompt);
      } catch (err: any) {
        console.warn("[chat] deepseek-chat failed:", err.message);
      }
      if (!rawContent) {
        try {
          rawContent = await callOpenAIVision(messages, systemPrompt);
        } catch (err: any) {
          console.warn("[chat] gpt-4o-mini failed:", err.message);
        }
      }
    }

    if (!rawContent && hasImage) {
      try {
        rawContent = await callOpenAIVision(messages, systemPrompt, referenceImageUrl, referenceImageChibiUrl);
      } catch (err: any) {
        console.warn("[chat] gpt-4o-mini vision failed:", err.message);
      }
      if (!rawContent) {
        const textOnly: TextMessage[] = rawMessages
          .filter(m => ["user", "assistant"].includes(m.role))
          .map(m => ({
            role: m.role as ChatRole,
            content: m.imageUrl ? [m.content, "[sent an image]"].filter(Boolean).join(" ") : m.content,
          }));
        try { rawContent = await callDeepSeek(textOnly, systemPrompt); } catch {}
      }
    }

    if (!rawContent) {
      try {
        rawContent = await callOpenAIVision(messages, systemPrompt);
      } catch (err: any) {
        console.warn("[chat] gpt-4o-mini fallback failed:", err.message);
      }
    }

    if (!rawContent) {
      for (const model of OPENROUTER_FALLBACKS) {
        try {
          rawContent = await callOpenRouter(model, messages, systemPrompt);
          if (rawContent) break;
        } catch (err: any) {
          if ((err?.status ?? 0) === 429) await sleep(800);
          continue;
        }
      }
    }

    if (!rawContent) {
      return NextResponse.json({
        role: "assistant",
        messages: [{ content: "all channels are busy right now. try again in a moment.", gifUrl: null, stickerName: null }],
        content: "all channels are busy right now. try again in a moment.",
      });
    }

    let parsed = parseAIResponse(rawContent);

    let annoyanceDelta = 0;
    parsed = parsed.map(p => {
      const match = p.text.match(/\[ANN:([+-]\d+)\]/i);
      if (match) {
        annoyanceDelta += parseInt(match[1], 10);
        return { ...p, text: p.text.replace(/\[ANN:[+-]\d+\]/gi, "").trim() };
      }
      return p;
    });

    if (character === "phrolova") {
      parsed = parsed.map(p => ({
        ...p,
        text: p.text
          .replace(/^"+|"+$/g, "")
          .replace(/^\.\.\.\s*/g, "")
          .replace(/\s*\.\.\.$/g, "")
          .replace(/\.\.\./g, "")
          .replace(/^Your frequency\b[^\n]*[.!?]\s*/i, "")
          .replace(/^\[sent something\]\s*/i, "")
          .replace(/^\[sent a sticker[^\]]*\]\s*/i, "")
          .replace(/^\[sent a gif[^\]]*\]\s*/i, "")
          .trim()
      }));
    }

    let singSong = false;
    parsed = parsed.map(p => {
      if (p.text.includes("[SING_SONG]")) {
        singSong = true;
        return { ...p, text: p.text.replace(/\[SING_SONG\]/gi, "").trim() };
      }
      return p;
    });

    parsed = parsed.filter(p => p.text.replace(/^[.…\s]+$/, "").trim() || p.gifQuery || p.stickerName);
    if (parsed.length === 0) parsed = [{ text: character === "phrolova" ? "" : "...", gifQuery: null, stickerName: null }];

    if (character === "phrolova") {
      parsed = parsed.map(p => {
        if ((p.stickerName || p.gifQuery) && !p.text.trim()) {
          return { text: "", gifQuery: null, stickerName: null };
        }
        return p;
      });
      parsed = parsed.filter(p => p.text.trim() || p.gifQuery || p.stickerName);
      if (parsed.length === 0) parsed = [{ text: "", gifQuery: null, stickerName: null }];
    }

    const messagesOut = await Promise.all(parsed.map(async p => {
      let gifUrl: string | null = null;
      if (p.gifQuery) gifUrl = await fetchGiphyGif(p.gifQuery);
      const finalText = p.text || (p.stickerName || gifUrl ? "" : (character === "phrolova" ? "" : "..."));
      return { content: finalText, gifUrl, stickerName: p.stickerName ?? null };
    }));

    return NextResponse.json({
      role: "assistant",
      messages: messagesOut,
      content: messagesOut[0]?.content ?? "...",
      gifUrl: messagesOut[0]?.gifUrl ?? null,
      stickerName: messagesOut[0]?.stickerName ?? null,
      singSong,
      annoyanceDelta,
    });

  } catch (error: any) {
    console.error("[chat] fatal:", error.message);
    return NextResponse.json({
      role: "assistant",
      messages: [{ content: "something broke. try again.", gifUrl: null, stickerName: null }],
      content: "something broke. try again.",
    });
  }
}