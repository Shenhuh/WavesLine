import { NextRequest, NextResponse } from "next/server";

const cache = new Map<string, { text: string; offset: number }[] | null>();

const MAX_LINES = 200;

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get("id");
  if (!videoId) {
    return NextResponse.json({ error: "Missing video id" }, { status: 400 });
  }

  if (cache.has(videoId)) {
    return NextResponse.json({ transcript: cache.get(videoId) });
  }

  try {
    const { YoutubeTranscript } = await import("youtube-transcript");
    const raw = await YoutubeTranscript.fetchTranscript(videoId);

    const transcript = raw.slice(0, MAX_LINES).map((t: any) => ({
      text: t.text.replace(/\n/g, " ").trim(),
      offset: t.offset > 1000
        ? Math.round(t.offset / 1000)
        : Math.round(t.offset),
    }));

    cache.set(videoId, transcript);
    return NextResponse.json({ transcript });

  } catch {
    cache.set(videoId, null);
    return NextResponse.json({ transcript: null });
  }
}