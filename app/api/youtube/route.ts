// app/api/youtube/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return NextResponse.json({ error: "Missing YOUTUBE_API_KEY" }, { status: 500 });

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=6&q=${encodeURIComponent(query)}&key=${key}`;
    const res = await fetch(url);
    const data = await res.json();

    const results = (data.items ?? []).map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url ?? "",
    }));

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}