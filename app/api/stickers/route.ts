// app/api/stickers/route.ts
// Returns a list of filenames from /public/stickers/
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const dir = path.join(process.cwd(), "public", "stickers");
    if (!fs.existsSync(dir)) {
      return NextResponse.json({ files: [] });
    }
    const files = fs.readdirSync(dir).filter(f =>
      /\.(png|gif|webp|jpg|jpeg)$/i.test(f)
    );
    return NextResponse.json({ files });
  } catch {
    return NextResponse.json({ files: [] });
  }
}