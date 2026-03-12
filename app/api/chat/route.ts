// app/api/chat/route.ts
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt, getCharacterReferenceImages } from "@/app/characters/characters";
import fs from "fs";
import path from "path";

// Primary: DeepSeek direct API
const deepseekClient = new OpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY!,
});

// Fallback: OpenRouter free tier
const openrouterClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

// Vision: OpenAI gpt-4o-mini
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// ── GIPHY ─────────────────────────────────────────────────────────────────
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
    const gifUrl = pick.images?.downsized_medium?.url ?? pick.images?.downsized?.url ?? pick.images?.original?.url ?? null;
    console.log("[giphy] returning url:", gifUrl);
    return gifUrl;
  } catch {
    return null;
  }
}

// ── STICKER LIST ──────────────────────────────────────────────────────────
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

// ── TYPES ─────────────────────────────────────────────────────────────────
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

// ── MODELS ────────────────────────────────────────────────────────────────
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
  temperature: 1.0,
  presence_penalty: 0.6,
  frequency_penalty: 0.4,
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

async function callOpenAIVision(messages: ChatMessage[], systemPrompt: string, referenceImageUrl?: string, referenceImageChibiUrl?: string): Promise<string> {
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

// ── PARSE AI OUTPUT ───────────────────────────────────────────────────────
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

// ── MAIN HANDLER ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const character: string = body.character ?? "aemeath";
    const playerName: string = body.playerName ?? "Rover";
    const playerKey: string = body.playerKey ?? "rover";
    const unblockRequest: boolean = body.unblockRequest ?? false;
    const unblockAccepted: boolean = body.unblockAccepted ?? false;
    const availableStickers = getAvailableStickers();
    let systemPrompt = buildSystemPrompt(character, playerName, playerKey, availableStickers);
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const refImages = getCharacterReferenceImages(character);
    const referenceImageUrl = refImages.normal ? `${base}${refImages.normal}` : undefined;
    const referenceImageChibiUrl = refImages.chibi ? `${base}${refImages.chibi}` : undefined;

    // Inject unblock context
    if (unblockRequest) {
      systemPrompt += unblockAccepted
        ? `\n\n[UNBLOCK REQUEST]: The user sent you an unblock request. You decided to unblock them — reluctantly. Be mean about it. Make it clear this is not forgiveness.`
        : `\n\n[UNBLOCK REQUEST]: The user sent you an unblock request. You are keeping them blocked. Decline coldly. Do not explain yourself much.`;
    }

    const rawMessages: { role: string; content: string; imageUrl?: string; stickerName?: string; gifUrl?: string; gifCaption?: string }[] = body.messages ?? [];

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

    // 1. DeepSeek for text (best quality)
    if (!hasImage) {
      try {
        console.log("[chat] trying: deepseek-chat");
        rawContent = await callDeepSeek(messages, systemPrompt);
        if (rawContent) console.log("[chat] success: deepseek-chat");
      } catch (err: any) {
        console.warn("[chat] deepseek-chat failed:", err.message);
      }
      // DeepSeek failed — try gpt-4o-mini before OpenRouter
      if (!rawContent) {
        try {
          console.log("[chat] trying fallback: gpt-4o-mini");
          rawContent = await callOpenAIVision(messages, systemPrompt);
          if (rawContent) console.log("[chat] success: gpt-4o-mini");
        } catch (err: any) {
          console.warn("[chat] gpt-4o-mini failed:", err.message);
        }
      }
    }

    // 2. Vision: gpt-4o-mini for images
    if (!rawContent && hasImage) {
      try {
        console.log("[chat] trying vision: gpt-4o-mini");
        rawContent = await callOpenAIVision(messages, systemPrompt, referenceImageUrl, referenceImageChibiUrl);
        if (rawContent) console.log("[chat] success: gpt-4o-mini");
      } catch (err: any) {
        console.warn("[chat] gpt-4o-mini vision failed:", err.message);
      }
      // Vision failed — fall back to DeepSeek text-only
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

    // 3. GPT-4o-mini fallback if DeepSeek fails
    if (!rawContent) {
      try {
        console.log("[chat] fallback: gpt-4o-mini");
        rawContent = await callOpenAIVision(messages, systemPrompt);
        if (rawContent) console.log("[chat] success: gpt-4o-mini fallback");
      } catch (err: any) {
        console.warn("[chat] gpt-4o-mini fallback failed:", err.message);
      }
    }

    // 4. OpenRouter free fallbacks
    if (!rawContent) {
      for (const model of OPENROUTER_FALLBACKS) {
        try {
          console.log("[chat] fallback:", model);
          rawContent = await callOpenRouter(model, messages, systemPrompt);
          if (rawContent) { console.log("[chat] success:", model); break; }
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

    // Parse multi-message response
    let parsed = parseAIResponse(rawContent);

    // Parse ANN delta tag — MUST happen before any stripping
    let annoyanceDelta = 0;
    parsed = parsed.map(p => {
      const match = p.text.match(/\[ANN:([+-]\d+)\]/i);
      if (match) {
        annoyanceDelta += parseInt(match[1], 10);
        console.log(`[annoyance] tag found: ${match[0]} → delta ${annoyanceDelta}`);
        return { ...p, text: p.text.replace(/\[ANN:[+-]\d+\]/gi, '').trim() };
      }
      return p;
    });
    if (annoyanceDelta === 0) console.warn("[annoyance] no [ANN] tag found in response — AI may not be appending it");

    // Phrolova: strip quotes, ellipsis, and forbidden openers
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

    // Parse SING_SONG tag
    let singSong = false;
    parsed = parsed.map(p => {
      if (p.text.includes('[SING_SONG]')) {
        singSong = true;
        return { ...p, text: p.text.replace(/\[SING_SONG\]/gi, '').trim() };
      }
      return p;
    });

    // Drop messages that are empty or just punctuation after post-processing
    parsed = parsed.filter(p => p.text.replace(/^[.…\s]+$/, "").trim() || p.gifQuery || p.stickerName);
    if (parsed.length === 0) parsed = [{ text: character === "phrolova" ? "" : "...", gifQuery: null, stickerName: null }];

    // Phrolova: if a message has a sticker/gif but no text, drop the media — text is required
    if (character === "phrolova") {
      parsed = parsed.map(p => {
        if ((p.stickerName || p.gifQuery) && !p.text.trim()) {
          console.warn("[chat] phrolova sent sticker/gif with no text — dropping media");
          return { text: "", gifQuery: null, stickerName: null };
        }
        return p;
      });
      // Re-filter after potential drops
      parsed = parsed.filter(p => p.text.trim() || p.gifQuery || p.stickerName);
      if (parsed.length === 0) parsed = [{ text: "", gifQuery: null, stickerName: null }];
    }

    // Fetch GIFs
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
    return NextResponse.json({ role: "assistant", messages: [{ content: "something broke. try again.", gifUrl: null, stickerName: null }], content: "something broke. try again." });
  }
}