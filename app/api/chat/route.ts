// app/api/chat/route.ts
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt } from "@/app/characters";
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

// ── GIPHY ─────────────────────────────────────────────────────────────────
const GIPHY_API_KEY = process.env.GIPHY_API_KEY!;

async function fetchGiphyGif(searchTerm: string): Promise<string | null> {
  if (!GIPHY_API_KEY) {
    console.log("[giphy] No API key found");
    return null;
  }
  try {
    console.log("[giphy] Searching for:", searchTerm);
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchTerm)}&limit=8&rating=pg-13`;
    const res = await fetch(url);
    if (!res.ok) {
      console.log("[giphy] API response not OK:", res.status);
      return null;
    }
    const data = await res.json();
    const results = data.data;
    if (!results?.length) {
      console.log("[giphy] No results found for:", searchTerm);
      return null;
    }
    const pick = results[Math.floor(Math.random() * results.length)];
    const gifUrl = pick.images?.downsized_medium?.url ?? pick.images?.downsized?.url ?? pick.images?.original?.url ?? null;
    console.log("[giphy] Found GIF:", gifUrl);
    return gifUrl;
  } catch (error) {
    console.log("[giphy] Error:", error);
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
    console.log("[stickers] Available:", results);
    return results;
  } catch { 
    console.log("[stickers] Error scanning");
    return []; 
  }
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
const VISION_MODEL = "qwen/qwen2.5-vl-72b-instruct:free";
const VISION_MODEL_FALLBACK = "qwen/qwen2.5-vl-32b-instruct:free";
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

// ── PARSE AI OUTPUT ───────────────────────────────────────────────────────
type ParsedMessage = { text: string; gifQuery: string | null; stickerName: string | null };

function parseSingleMessage(raw: string): ParsedMessage {
  let text = raw.trim();
  let gifQuery: string | null = null;
  let stickerName: string | null = null;

  // Match [GIF:search term] - case insensitive
  const gifMatch = text.match(/\[GIF:\s*([^\]]+)\s*\]/i);
  if (gifMatch) { 
    gifQuery = gifMatch[1].trim(); 
    text = text.replace(gifMatch[0], "").trim(); 
    console.log("[parse] Found GIF query:", gifQuery);
  }

  // Match [STICKER:filename] - case insensitive
  const stickerMatch = text.match(/\[STICKER:\s*([^\]]+)\s*\]/i);
  if (stickerMatch) { 
    stickerName = stickerMatch[1].trim(); 
    text = text.replace(stickerMatch[0], "").trim(); 
    console.log("[parse] Found sticker:", stickerName);
  }

  return { text, gifQuery, stickerName };
}

function parseAIResponse(raw: string): ParsedMessage[] {
  // Check if response contains ||| separators
  const parts = raw.split(/\s*\|\|\|\s*/).filter(p => p.trim());
  
  if (parts.length > 1) {
    console.log("[parse] Multiple messages detected:", parts.length);
    const parsed = parts.map(parseSingleMessage).filter(p => p.text || p.gifQuery || p.stickerName);
    return parsed.length > 0 ? parsed : [{ text: "...", gifQuery: null, stickerName: null }];
  }
  
  // Single message
  const parsed = parseSingleMessage(raw);
  return [parsed];
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[chat] Request body:", JSON.stringify(body, null, 2));

    const character: string = body.character ?? "aemeath";
    const playerName: string = body.playerName ?? "Rover";
    const playerKey: string = body.playerKey ?? "rover";
    const availableStickers = getAvailableStickers();
    
    // Enhance system prompt with clearer media instructions
    let systemPrompt = buildSystemPrompt(character, playerName, playerKey, availableStickers);
    
    // Add explicit media formatting instructions
    systemPrompt += `

[CRITICAL MEDIA FORMATTING RULES - YOU MUST FOLLOW THESE]:
- To send a GIF: Add [GIF:search term] at the END of your message
  Example: "That reminds me of something beautiful. [GIF:falling cherry blossoms]"
  Example for Phrolova: "Rain always makes me think of Ostina. [GIF:gentle rain]"
  
- To send a sticker: Add [STICKER:name] at the END of your message
  Example: "I understand. [STICKER:sad]"
  Example for Phrolova: "Your frequency is... complicated. [STICKER:listen]"

- ALWAYS include your text response first, THEN the media tag
- Valid sticker names: ${availableStickers.join(", ")}
- For GIFs, use descriptive search terms like: "gentle rain", "falling leaves", "starry night", "candle flicker"`;

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
        
        // Format user message content properly
        let text = m.content || "";
        
        // If this is a user message with media, format it clearly for the AI
        if (m.role === "user") {
          if (m.stickerName) {
            text = text ? `${text} [sent sticker: ${m.stickerName}]` : `[sent sticker: ${m.stickerName}]`;
          }
          if (m.gifUrl) {
            const caption = m.gifCaption || "a GIF";
            text = text ? `${text} [sent GIF: ${caption}]` : `[sent GIF: ${caption}]`;
          }
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
    }

    // 2. Vision models for images
    if (!rawContent && hasImage) {
      for (const vm of [VISION_MODEL, VISION_MODEL_FALLBACK]) {
        try {
          console.log("[chat] trying vision:", vm);
          rawContent = await callOpenRouter(vm, messages, systemPrompt);
          if (rawContent) { console.log("[chat] success:", vm); break; }
        } catch (err: any) {
          console.warn("[chat] vision failed:", vm, err.message);
        }
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

    // 3. OpenRouter fallbacks
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

    console.log("[chat] Raw response:", rawContent);

    // Parse multi-message response
    let parsed = parseAIResponse(rawContent);
    console.log("[chat] Parsed messages:", parsed);

    // Phrolova: strip quotes and clean up text
    if (character === "phrolova") {
      parsed = parsed.map(p => ({
        ...p,
        text: p.text
          .replace(/^"+|"+$/g, "")
          .replace(/^\.\.\.\s*/g, "")
          .replace(/\s*\.\.\.$/g, "")
          .trim()
      }));
    }

    // Process each message - fetch GIFs and map stickers
    const messagesOut = await Promise.all(parsed.map(async p => {
      let gifUrl: string | null = null;
      let stickerName: string | null = p.stickerName;
      
      // Fetch GIF if query exists
      if (p.gifQuery) {
        console.log("[chat] Fetching GIF for:", p.gifQuery);
        gifUrl = await fetchGiphyGif(p.gifQuery);
        if (!gifUrl) {
          console.log("[chat] Failed to fetch GIF for:", p.gifQuery);
        }
      }
      
      // Don't add extra text if we have media
      const finalText = p.text || "";
      
      return { 
        content: finalText, 
        gifUrl, 
        stickerName 
      };
    }));

    // Log what we're sending back
    console.log("[chat] Sending messages:", JSON.stringify(messagesOut, null, 2));

    return NextResponse.json({
      role: "assistant",
      messages: messagesOut,
      content: messagesOut[0]?.content ?? "...",
      gifUrl: messagesOut[0]?.gifUrl ?? null,
      stickerName: messagesOut[0]?.stickerName ?? null,
    });

  } catch (error: any) {
    console.error("[chat] fatal:", error.message);
    return NextResponse.json({ 
      role: "assistant", 
      messages: [{ content: "something broke. try again.", gifUrl: null, stickerName: null }], 
      content: "something broke. try again." 
    });
  }
}