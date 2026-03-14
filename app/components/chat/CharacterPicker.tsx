"use client";

import { useEffect, useRef, useState } from "react";
import Avatar from "@/app/components/chat/Avatar";

type CharacterOption = {
  key: string;
  name: string;
  avatar: string;
};

type CharacterPickerProps = {
  value: string;
  onChange: (key: string) => void;
  characters: CharacterOption[];
};

export default function CharacterPicker({
  value,
  onChange,
  characters,
}: CharacterPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = characters.find((c) => c.key === value) ?? characters[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          borderRadius: 8,
          background: "rgba(255,255,255,0.08)",
          border: `1px solid ${open ? "#c8a830" : "rgba(255,255,255,0.15)"}`,
          cursor: "pointer",
        }}
      >
        <Avatar
          src={selected.avatar}
          name={selected.name}
          size={28}
          color="#c8a830"
        />
        <span
          style={{
            flex: 1,
            color: "#e8e8ee",
            fontSize: 13,
            fontWeight: 600,
            textAlign: "left",
          }}
        >
          {selected.name}
        </span>
        <span style={{ color: "#888", fontSize: 9 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 200,
            background: "#1e2028",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            maxHeight: 200,
            overflowY: "auto",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}
        >
          {characters.map((character) => (
            <button
              key={character.key}
              onClick={() => {
                onChange(character.key);
                setOpen(false);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 12px",
                background:
                  character.key === value
                    ? "rgba(200,168,48,0.12)"
                    : "none",
                border: "none",
                cursor: "pointer",
                borderLeft:
                  character.key === value
                    ? "2px solid #c8a830"
                    : "2px solid transparent",
              }}
            >
              <Avatar
                src={character.avatar}
                name={character.name}
                size={24}
                color="#c8a830"
              />
              <span
                style={{
                  color: character.key === value ? "#c8a830" : "#b0b2be",
                  fontSize: 12,
                }}
              >
                {character.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}