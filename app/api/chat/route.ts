// app/api/chat/route.ts
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt } from "@/app/characters";
import fs from "fs";
import path from "path";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

// ── GIPHY ─────────────────────────────────────────────────────────────────
const GIPHY_API_KEY = process.env.GIPHY_API_KEY!;

async function fetchGiphyGif(searchTerm: string): Promise<string | null> {
  if (!GIPHY_API_KEY || GIPHY_API_KEY === "YOUR_GIPHY_API_KEY_HERE") return null;
  try {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchTerm)}&limit=8&rating=pg-13`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const results = data.data;
    if (!results?.length) return null;
    const pick = results[Math.floor(Math.random() * results.length)];
    // Use downsized_medium — always a proper .gif, smaller than original
    return pick.images?.downsized_medium?.url ?? pick.images?.downsized?.url ?? pick.images?.original?.url ?? null;
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
const VISION_MODEL = "meta-llama/llama-3.2-11b-vision-instruct:free";
const TEXT_MODELS = [
  "openrouter/free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-27b-it:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "deepseek/deepseek-r1-0528:free",
  "qwen/qwen3-8b:free",
  "openrouter/auto",
];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function callModel(
  model: string,
  messages: ChatMessage[],
  systemPrompt: string
): Promise<string> {
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system" as const, content: systemPrompt },
      ...(messages as any),
    ],
    temperature: 1.0,
    presence_penalty: 0.6,
    frequency_penalty: 0.4,
    max_tokens: 180,
  });
  return response.choices?.[0]?.message?.content?.trim() ?? "";
}

// ── PARSE AI OUTPUT ───────────────────────────────────────────────────────
function parseAIResponse(raw: string): {
  text: string;
  gifQuery: string | null;
  stickerName: string | null;
} {
  let text = raw;
  let gifQuery: string | null = null;
  let stickerName: string | null = null;

  const gifMatch = text.match(/\[GIF:([^\]]+)\]/i);
  if (gifMatch) {
    gifQuery = gifMatch[1].trim();
    text = text.replace(gifMatch[0], "").trim();
  }

  const stickerMatch = text.match(/\[STICKER:([^\]]+)\]/i);
  if (stickerMatch) {
    stickerName = stickerMatch[1].trim();
    text = text.replace(stickerMatch[0], "").trim();
  }

  return { text, gifQuery, stickerName };
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const character: string = body.character ?? "aemeath";
    const playerName: string = body.playerName ?? "Rover";
    const playerKey: string = body.playerKey ?? "rover";
    const availableStickers = getAvailableStickers();
    const systemPrompt = buildSystemPrompt(character, playerName, playerKey, availableStickers);

    const rawMessages: { role: string; content: string; imageUrl?: string; stickerName?: string; gifUrl?: string; gifCaption?: string }[] =
      body.messages ?? [];

    const messages: ChatMessage[] = rawMessages
      .filter((m) => ["user", "assistant"].includes(m.role))
      .map((m) => {
        if (m.imageUrl && m.role === "user") {
          return {
            role: "user" as const,
            content: [
              ...(m.content ? [{ type: "text" as const, text: m.content }] : []),
              { type: "image_url" as const, image_url: { url: m.imageUrl } },
            ],
          } as VisionMessage;
        }
        // Build text content — inject sticker/gif descriptions so AI can react
        let text = m.content.replace(/\[(GIF|STICKER):[^\]]+\]/gi, "").trim();
        if (!text && m.role === "user") {
          if (m.stickerName) text = `[${playerName} sent a sticker: ${m.stickerName}]`;
          else if (m.gifUrl) text = m.gifCaption ? `[${playerName} sent a GIF: ${m.gifCaption}]` : `[${playerName} sent a GIF]`;
        } else if (m.role === "user") {
          if (m.stickerName) text += ` [also sent a sticker: ${m.stickerName}]`;
          else if (m.gifUrl) text += m.gifCaption ? ` [also sent a GIF: ${m.gifCaption}]` : ` [also sent a GIF]`;
        }
        return {
          role: m.role as ChatRole,
          content: text || "[sent something]",
        };
      });

    const hasImage = rawMessages.some((m) => m.imageUrl);
    const modelsToTry = hasImage ? [VISION_MODEL, ...TEXT_MODELS] : TEXT_MODELS;

    let rawContent = "";

    for (const model of modelsToTry) {
      try {
        console.log("[chat] trying:", model);
        rawContent = await callModel(model, messages, systemPrompt);
        if (rawContent) {
          console.log("[chat] success:", model);
          break;
        }
        console.warn("[chat] empty from", model);
      } catch (err: any) {
        const status = err?.status ?? 0;
        console.warn(`[chat] ${model} failed (${status}):`, err.message);

        // Rate limited — wait briefly then try next
        if (status === 429) {
          await sleep(800);
          continue;
        }

        // Vision model failed with image — retry text-only
        if (model === VISION_MODEL && hasImage) {
          const textOnly: TextMessage[] = rawMessages
            .filter((m) => ["user", "assistant"].includes(m.role))
            .map((m) => ({
              role: m.role as ChatRole,
              content: m.imageUrl
                ? [m.content, "[sent an image]"].filter(Boolean).join(" ")
                : m.content,
            }));
          try {
            rawContent = await callModel(TEXT_MODELS[0], textOnly, systemPrompt);
            if (rawContent) break;
          } catch {}
        }
        continue;
      }
    }

    if (!rawContent) {
      return NextResponse.json({
        role: "assistant",
        content: "...all channels are busy right now. try again in a moment.",
      });
    }

    let { text, gifQuery, stickerName } = parseAIResponse(rawContent);

    // For Phrolova: strip leading/trailing quotes and ellipsis patterns
    if (character === "phrolova") {
      text = text
        .replace(/^"+|"+$/g, "")        // remove wrapping quotes
        .replace(/^\.\.\.\s*/g, "") // remove leading ...
        .replace(/\s*\.\.\.$/g, "") // remove trailing ...
        .replace(/\.\.\./g, "")      // remove any remaining ...
        .trim();
    }

    // If AI returned only a media tag and no text, that's fine — but if truly empty, use fallback
    const finalText = text || (stickerName || gifQuery ? "" : "...");

    // Fetch GIF — failure here should never crash the whole response
    let gifUrl: string | null = null;
    if (gifQuery) {
      gifUrl = await fetchGiphyGif(gifQuery);
    }

    return NextResponse.json({
      role: "assistant",
      content: finalText,
      gifUrl,
      stickerName,
    });
  } catch (error: any) {
    console.error("[chat] fatal:", error.message);
    return NextResponse.json({
      role: "assistant",
      content: "something broke on my end. try again.",
    });
  }
}