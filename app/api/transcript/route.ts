// app/api/transcript/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get("id");
  if (!videoId) return NextResponse.json({ error: "Missing video id" }, { status: 400 });

  try {
    // Try youtube-transcript package
    const { YoutubeTranscript } = await import("youtube-transcript");
    const raw = await YoutubeTranscript.fetchTranscript(videoId);
    const transcript = raw.map((t: any) => ({
      text: t.text,
      offset: Math.round(t.offset / 1000), // convert ms to seconds
    }));
    return NextResponse.json({ transcript });
  } catch {
    // No transcript available
    return NextResponse.json({ transcript: null });
  }
}