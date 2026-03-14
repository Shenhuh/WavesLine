"use client";

import { useState } from "react";

type AvatarProps = {
  src: string;
  name: string;
  size?: number;
  color?: string;
};

export default function Avatar({
  src,
  name,
  size = 36,
  color = "#888",
}: AvatarProps) {
  const [err, setErr] = useState(false);

  if (!err) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setErr(true)}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          display: "block",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 700,
        fontSize: size * 0.38,
        userSelect: "none",
      }}
    >
      {name[0]}
    </div>
  );
}