import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt } from "@/app/characters";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const character: string = body.character ?? "waveline";
    const playerName: string = body.playerName ?? "Traveler";
    const playerKey: string = body.playerKey ?? "rover";
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = body.messages ?? [];

    // Debug log so you can verify in terminal what's coming in
    console.log("[chat] character:", character, "| player:", playerName, "(", playerKey, ")");

    const systemPrompt = buildSystemPrompt(character, playerName, playerKey);

   const response = await client.chat.completions.create({
  model: "meta-llama/llama-3.1-8b-instruct",
  messages: [
    { 
      role: "system", 
      content: systemPrompt 
    },
    ...messages,
  ],
  temperature: 0.9,       // Higher = more personality, less robot
  presence_penalty: 0.8,  // Forces the AI to talk about new things
  frequency_penalty: 0.5, // Prevents repetitive "lore-dump" phrases
  max_tokens: 120,
});

    const choice = response.choices?.[0];
    let content = "";

    if (typeof choice?.message?.content === "string") {
      content = choice.message.content.trim();
    } else if (Array.isArray(choice?.message?.content)) {
      content = (choice.message.content as any[])
        .map((c) => c?.text ?? "")
        .join("")
        .trim();
    } else if (typeof (choice as any)?.text === "string") {
      content = ((choice as any).text as string).trim();
    }

    if (!content) {
      console.warn("[chat] Empty response from model");
      content = "...";
    }

    return NextResponse.json({ role: "assistant", content });

  } catch (error: any) {
    console.error("[chat] OpenRouter error:", error.message);
    return NextResponse.json({ error: "AI failed to respond." }, { status: 500 });
  }
}