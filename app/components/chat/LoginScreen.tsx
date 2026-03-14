"use client";

import Avatar from "@/app/components/chat/Avatar";
import WavesLineLogo from "@/app/components/chat/WavesLineLogo";
import CharacterPicker from "@/app/components/chat/CharacterPicker";

type CharacterOption = {
  key: string;
  name: string;
  avatar: string;
};

type LoginScreenProps = {
  selectedKey: string;
  selectedCharacter: CharacterOption;
  characters: CharacterOption[];
  onChangeCharacter: (key: string) => void;
  onOpen: () => void;
};

export default function LoginScreen({
  selectedKey,
  selectedCharacter,
  characters,
  onChangeCharacter,
  onOpen,
}: LoginScreenProps) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1a1c24",
        fontFamily: "'Segoe UI',system-ui,sans-serif",
      }}
    >
      <div
        style={{
          background: "#22242e",
          border: "1px solid rgba(200,168,48,0.2)",
          borderRadius: 18,
          padding: 36,
          width: 300,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 22,
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <WavesLineLogo size={28} />
          <span
            style={{
              color: "#c8a830",
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: "0.12em",
            }}
          >
            WAVESLINE
          </span>
        </div>

        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            overflow: "hidden",
            border: "2px solid rgba(200,168,48,0.35)",
          }}
        >
          <Avatar
            src={selectedCharacter.avatar}
            name={selectedCharacter.name}
            size={72}
            color="#c8a830"
          />
        </div>

        <div style={{ width: "100%" }}>
          <p
            style={{
              color: "#555768",
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Choose your resonator
          </p>

          <CharacterPicker
            value={selectedKey}
            onChange={onChangeCharacter}
            characters={characters}
          />
        </div>

        <button
          onClick={onOpen}
          style={{
            width: "100%",
            padding: "11px 0",
            borderRadius: 10,
            background: "linear-gradient(135deg,#c8a830,#a88820)",
            border: "none",
            color: "#1a1400",
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
            letterSpacing: "0.06em",
          }}
        >
          OPEN WAVESLINE →
        </button>
      </div>
    </div>
  );
}