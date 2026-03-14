"use client";

type WavesLineLogoProps = {
  size?: number;
};

export default function WavesLineLogo({
  size = 20,
}: WavesLineLogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle
        cx="16"
        cy="16"
        r="15"
        fill="#2a2c35"
        stroke="#c8a830"
        strokeWidth="1.5"
      />
      <path
        d="M8 19 C10 13,14 11,16 16 C18 21,22 19,24 13"
        stroke="#c8a830"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="16" cy="16" r="2.5" fill="#c8a830" />
    </svg>
  );
}