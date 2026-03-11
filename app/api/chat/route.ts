import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt } from "@/app/characters";
import fs from "fs";
import path from "path";

// OpenRouter client setup
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// ── GIPHY ─────────────────────────────────────────────────────────────────
const GIPHY_API_KEY = process.env.GIPHY_API_KEY;

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
    
    const files = fs.readdirSync(baseDir);
    return files
      .filter(file => /\.(png|gif|webp|jpg|jpeg)$/i.test(file))
      .map(file => file.replace(/\.(png|gif|webp|jpg|jpeg)$/i, ""));
  } catch {
    return [];
  }
}

// ── TYPES ─────────────────────────────────────────────────────────────────
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
  "nvidia/llama-3.1-nemotron-70b-instruct:free",
  "deepseek/deepseek-r1-distill-llama-70b:free",
  "meta-llama/llama-3.1-70b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "qwen/qwen-2.5-7b-instruct:free",
  "meta-llama/llama-3-8b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
  "google/gemini-2.5-flash-preview:free",
  "microsoft/phi-3-medium-128k-instruct:free",
  "xiaomi/mimo-v2-flash:free",
  "arcee-ai/trinity-large-preview:free",
];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function callModel(
  model: string,
  messages: ChatMessage[],
  systemPrompt: string
): Promise<string> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 1.0,
        presence_penalty: 0.6,
        frequency_penalty: 0.4,
        max_tokens: 180,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() ?? "";
  } catch (error) {
    console.error(`Error calling model ${model}:`, error);
    throw error;
  }
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
    // Check API key
    if (!OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY is not set");
      return NextResponse.json({
        role: "assistant",
        content: "API configuration error. Please check server settings.",
      });
    }

    const body = await req.json();

    const character: string = body.character ?? "aemeath";
    const playerName: string = body.playerName ?? "Rover";
    const playerKey: string = body.playerKey ?? "rover";
    const availableStickers = getAvailableStickers();
    const systemPrompt = buildSystemPrompt(character, playerName, playerKey, availableStickers);

    const rawMessages: { role: string; content: string; imageUrl?: string; stickerName?: string; gifUrl?: string; gifCaption?: string }[] =
      body.messages ?? [];

    // Process messages
    const messages: ChatMessage[] = rawMessages
      .filter((m) => ["user", "assistant"].includes(m.role))
      .map((m) => {
        // Handle messages WITH images (vision)
        if (m.imageUrl && m.role === "user") {
          const content: VisionMessage['content'] = [];
          
          if (m.content) {
            content.push({ type: "text", text: m.content });
          }
          
          content.push({ 
            type: "image_url", 
            image_url: { url: m.imageUrl } 
          });
          
          return {
            role: "user",
            content,
          } as VisionMessage;
        }
        
        // Handle messages WITHOUT images
        let finalContent = "";
        
        if (m.role === "user") {
          // Case 1: User sent a sticker
          if (m.stickerName) {
            const stickerDescription = m.stickerName
              .replace(/[-_]/g, ' ')
              .replace(/\b\w/g, l => l.toUpperCase());
            
            finalContent = m.content 
              ? `${m.content} [sent a ${stickerDescription} sticker]`
              : `[sent a ${stickerDescription} sticker]`;
          }
          // Case 2: User sent a GIF
          else if (m.gifUrl) {
            const caption = m.gifCaption ? `with caption: "${m.gifCaption}"` : "";
            finalContent = m.content
              ? `${m.content} [sent GIF ${caption}]`.trim()
              : `[sent GIF ${caption}]`.trim();
          }
          // Case 3: Regular text message
          else if (m.content) {
            finalContent = m.content;
          }
          // Case 4: Empty message
          else {
            return null;
          }
        } else {
          // Assistant messages
          finalContent = m.content || "";
        }
        
        if (!finalContent) return null;
        
        return {
          role: m.role as ChatRole,
          content: finalContent,
        } as TextMessage;
      })
      .filter((m): m is ChatMessage => m !== null);

    const hasImage = rawMessages.some((m) => m.imageUrl);
    const modelsToTry = hasImage ? [VISION_MODEL, ...TEXT_MODELS] : TEXT_MODELS;

    let rawContent = "";
    let lastError: Error | null = null;

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
        lastError = err;
        const status = err?.status ?? 0;
        console.warn(`[chat] ${model} failed (${status}):`, err.message);

        if (status === 429) {
          await sleep(800);
          continue;
        }

        // If vision model fails with image, try text models with image described
        if (model === VISION_MODEL && hasImage) {
          const textOnlyMessages: TextMessage[] = rawMessages
            .filter((m) => ["user", "assistant"].includes(m.role))
            .map((m) => {
              let content = m.content || "";
              if (m.imageUrl) {
                content = content ? `${content} [sent an image]` : "[sent an image]";
              }
              return {
                role: m.role as ChatRole,
                content,
              };
            })
            .filter(m => m.content);

          try {
            rawContent = await callModel(TEXT_MODELS[0], textOnlyMessages, systemPrompt);
            if (rawContent) break;
          } catch {}
        }
        continue;
      }
    }

    if (!rawContent) {
      console.error("All models failed:", lastError);
      return NextResponse.json({
        role: "assistant",
        content: "...all channels are busy right now. try again in a moment.",
      });
    }

    let { text, gifQuery, stickerName } = parseAIResponse(rawContent);

    // For Phrolova: strip formatting
    if (character === "phrolova") {
      text = text
        .replace(/^"+|"+$/g, "")
        .replace(/^\.\.\.\s*/g, "")
        .replace(/\s*\.\.\.$/g, "")
        .replace(/\.\.\./g, "")
        .trim();
    }

    const finalText = text || (stickerName || gifQuery ? "" : "...");

    // Fetch GIF if needed
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