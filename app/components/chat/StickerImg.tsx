"use client";

import { useEffect, useState } from "react";

type StickerImgProps = {
  name: string;
};

export default function StickerImg({ name }: StickerImgProps) {
  const exts = ["png", "gif", "webp", "jpg"];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [name]);

  if (idx >= exts.length) return null;

  return (
    <img
      src={`/stickers/${name}.${exts[idx]}`}
      alt={name}
      onError={() => setIdx((i) => i + 1)}
      style={{
        maxWidth: 120,
    maxHeight: 120,
    width: "auto",
    height: "auto",
    display: "block",
    objectFit: "contain",
      }}
    />
  );
}