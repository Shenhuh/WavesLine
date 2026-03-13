// app/api/stickers/route.ts
// Returns a list of all available sticker names from /public/stickers
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

let _cache: string[] | null = null;

function scanStickers(): string[] {
  if (_cache) return _cache;
  try {
    const baseDir = path.join(process.cwd(), "public", "stickers");
    if (!fs.existsSync(baseDir)) return (_cache = []);
    const results: string[] = [];
    function scan(dir: string, prefix: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          scan(path.join(dir, entry.name), prefix + entry.name + "/");
        } else if (/\.(png|gif|webp|jpg|jpeg)$/i.test(entry.name)) {
          results.push(prefix + entry.name.replace(/\.(png|gif|webp|jpg|jpeg)$/i, ""));
        }
      }
    }
    scan(baseDir, "");
    return (_cache = results);
  } catch {
    return (_cache = []);
  }
}

export async function GET() {
  return NextResponse.json({ files: scanStickers() });
}