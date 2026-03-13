// app/api/youtube/route.ts
import { NextRequest, NextResponse } from "next/server";

const CACHE_TTL_MS = 10 * 60 * 1000;
const MIN_DURATION_SECONDS = 62;   // blocks Shorts (≤60s) with a small buffer
const MAX_DURATION_SECONDS = 20 * 60;

type VideoResult = {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
};

type CacheEntry = {
  results: VideoResult[];
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] ?? "0");
  const m = parseInt(match[2] ?? "0");
  const s = parseInt(match[3] ?? "0");
  return h * 3600 + m * 60 + s;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'");
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");

  if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return NextResponse.json({ error: "Missing YOUTUBE_API_KEY" }, { status: 500 });

  const cacheKey = query.trim().toLowerCase().replace(/\s+/g, " ");
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return NextResponse.json({ results: cached.results });
  }

  try {
    const searchUrl =
      `https://www.googleapis.com/youtube/v3/search` +
      `?part=snippet` +
      `&type=video` +
      `&maxResults=20` +
      `&videoEmbeddable=true` +
      `&order=relevance` +
      `&videoDuration=medium` +  // medium = 4–20 min, cuts most Shorts at the API level
      `&videoDefinition=high` +
      `&q=${encodeURIComponent(query)}` +
      `&key=${key}`;

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      const err = await searchRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err?.error?.message ?? `YouTube API error ${searchRes.status}` },
        { status: searchRes.status }
      );
    }

    const searchData = await searchRes.json();
    const items = searchData.items ?? [];

    if (!items.length) {
      cache.set(cacheKey, { results: [], expiresAt: Date.now() + CACHE_TTL_MS });
      return NextResponse.json({ results: [] });
    }

    const videoIds = items
      .map((item: any) => item.id?.videoId)
      .filter(Boolean)
      .join(",");

    if (!videoIds) return NextResponse.json({ results: [] });

    const detailRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${key}`
    );
    if (!detailRes.ok) return NextResponse.json({ error: "Failed to fetch video details" }, { status: 500 });

    const detailData = await detailRes.json();
    const durationMap = new Map<string, number>();
    for (const v of detailData.items ?? []) {
      durationMap.set(v.id, parseDuration(v.contentDetails?.duration ?? ""));
    }

    const results: VideoResult[] = items
      .filter((item: any) => {
        const dur = durationMap.get(item.id?.videoId) ?? 0;
        // Both a minimum (kills Shorts) and a maximum (kills hour-long videos)
        return dur >= MIN_DURATION_SECONDS && dur <= MAX_DURATION_SECONDS;
      })
      .slice(0, 8)
      .map((item: any) => ({
        id: item.id.videoId,
        title: decodeHtmlEntities(item.snippet.title),
        channel: decodeHtmlEntities(item.snippet.channelTitle),
        thumbnail:
          item.snippet.thumbnails?.medium?.url ??
          item.snippet.thumbnails?.default?.url ??
          "",
      }));

    cache.set(cacheKey, { results, expiresAt: Date.now() + CACHE_TTL_MS });
    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unexpected error" }, { status: 500 });
  }
}