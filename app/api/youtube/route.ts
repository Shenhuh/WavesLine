// app/api/youtube/route.ts
import { NextRequest, NextResponse } from "next/server";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min cache
const MAX_DURATION_SECONDS = 20 * 60; // 20 minute hard cap

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

// Parse ISO 8601 duration (PT4M13S, PT1H2M3S, etc.) → seconds
function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const h = parseInt(match[1] ?? "0");
  const m = parseInt(match[2] ?? "0");
  const s = parseInt(match[3] ?? "0");

  return h * 3600 + m * 60 + s;
}

// Helper function to decode HTML entities in titles
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
  
  console.log('YouTube API request for query:', query);
  
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    console.error('Missing YOUTUBE_API_KEY environment variable');
    return NextResponse.json(
      { error: "Missing YOUTUBE_API_KEY" },
      { status: 500 }
    );
  }

  // Normalize cache key
  const cacheKey = query.trim().toLowerCase().replace(/\s+/g, " ");

  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    console.log('Returning cached results for:', query);
    return NextResponse.json({ results: cached.results });
  }

  try {
    // STEP 1 — Search videos
    const searchUrl =
      `https://www.googleapis.com/youtube/v3/search` +
      `?part=snippet` +
      `&type=video` +
      `&maxResults=15` + // Increased to 15 to have more after filtering
      `&videoEmbeddable=true` +
      `&order=relevance` +
      `&videoDefinition=high` +
      `&q=${encodeURIComponent(query)}` +
      `&key=${key}`;

    console.log('Fetching from YouTube API...');
    
    const searchRes = await fetch(searchUrl);

    if (!searchRes.ok) {
      const err = await searchRes.json().catch(() => ({}));
      console.error('YouTube API error:', err);
      return NextResponse.json(
        {
          error:
            err?.error?.message ??
            `YouTube API error ${searchRes.status}`,
        },
        { status: searchRes.status }
      );
    }

    const searchData = await searchRes.json();
    const items = searchData.items ?? [];

    console.log(`Found ${items.length} videos from search`);

    if (!items.length) {
      cache.set(cacheKey, {
        results: [],
        expiresAt: Date.now() + CACHE_TTL_MS,
      });

      return NextResponse.json({ results: [] });
    }

    // Collect safe video IDs
    const videoIds = items
      .map((item: any) => item.id?.videoId)
      .filter(Boolean)
      .join(",");

    if (!videoIds) {
      console.log('No valid video IDs found');
      return NextResponse.json({ results: [] });
    }

    // STEP 2 — Fetch durations
    const detailUrl =
      `https://www.googleapis.com/youtube/v3/videos` +
      `?part=contentDetails` +
      `&id=${videoIds}` +
      `&key=${key}`;

    const detailRes = await fetch(detailUrl);

    if (!detailRes.ok) {
      console.error('Failed to fetch video details:', await detailRes.text());
      return NextResponse.json(
        { error: "Failed to fetch video details" },
        { status: 500 }
      );
    }

    const detailData = await detailRes.json();

    const durationMap = new Map<string, number>();

    for (const v of detailData.items ?? []) {
      durationMap.set(
        v.id,
        parseDuration(v.contentDetails?.duration ?? "")
      );
    }

    // STEP 3 — Apply duration filter and format results
    const results: VideoResult[] = items
      .filter((item: any) => {
        const dur = durationMap.get(item.id?.videoId) ?? 0;
        return dur > 0 && dur <= MAX_DURATION_SECONDS;
      })
      .slice(0, 8) // Show up to 8 results
      .map((item: any) => ({
        id: item.id.videoId,
        title: decodeHtmlEntities(item.snippet.title),
        channel: decodeHtmlEntities(item.snippet.channelTitle),
        thumbnail: item.snippet.thumbnails?.medium?.url ?? 
                   item.snippet.thumbnails?.default?.url ?? "",
      }));

    console.log(`Filtered to ${results.length} results under ${MAX_DURATION_SECONDS/60} minutes`);

    // Log first few results for debugging
    results.slice(0, 3).forEach((r, i) => {
      console.log(`Result ${i+1}: ${r.title} (${r.id})`);
    });

    cache.set(cacheKey, {
      results,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json({ results });
  } catch (err: any) {
    console.error('Unexpected error in YouTube API route:', err);
    return NextResponse.json(
      { error: err.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}