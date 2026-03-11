// app/api/giphy/route.ts
// Proxies Giphy search so we don't expose the API key to the client
import { NextRequest, NextResponse } from "next/server";

const GIPHY_API_KEY = "BX7XI91TvLK241SWPUJVfhvfgQtPRKw1"; // Replace with your key

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ results: [] });

  try {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=12&rating=pg-13`;
    const res = await fetch(url);
    const data = await res.json();

    const results = (data.data ?? []).map((g: any) => ({
      url: g.images.original.url,
      preview: g.images.fixed_height_small.url,  // smaller for grid preview
    }));

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[giphy] error:", err);
    return NextResponse.json({ results: [] });
  }
}