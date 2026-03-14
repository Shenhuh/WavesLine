"use client";

type ChatHeaderProps = {
  isMobile: boolean;
  characterName: string;
  characterColor: string;
  isTyping: boolean;
  ltDeclineCooldown: number;
  onBack: () => void;
  onOpenListenTogether: () => void;
};

export default function ChatHeader({
  isMobile,
  characterName,
  characterColor,
  isTyping,
  ltDeclineCooldown,
  onBack,
  onOpenListenTogether,
}: ChatHeaderProps) {
  return (
    <div
      style={{
        height: 44,
        background: "#e0e1e3",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
        display: "flex",
        alignItems: "center",
        padding: isMobile ? "0 10px" : "0 20px",
        flexShrink: 0,
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {isMobile && (
          <button
            onClick={onBack}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#888",
              fontSize: 22,
              padding: "0 6px 0 0",
            }}
          >
            ‹
          </button>
        )}

        <span style={{ color: "#1e2030", fontSize: 15, fontWeight: 700 }}>
          {characterName}
        </span>

        {isTyping && (
          <span
            style={{
              color: "#888",
              fontSize: 11,
              fontStyle: "italic",
              marginLeft: 10,
            }}
          >
            typing...
          </span>
        )}
      </div>

      <button
        onClick={onOpenListenTogether}
        title={
          ltDeclineCooldown
            ? `Cooldown: ${ltDeclineCooldown}s`
            : "Listen Together"
        }
        style={{
          background: ltDeclineCooldown
            ? "rgba(0,0,0,0.06)"
            : `${characterColor}18`,
          border: `1px solid ${
            ltDeclineCooldown
              ? "rgba(0,0,0,0.1)"
              : characterColor + "50"
          }`,
          cursor: ltDeclineCooldown ? "not-allowed" : "pointer",
          color: ltDeclineCooldown ? "#aaa" : characterColor,
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontSize: 11,
          fontWeight: 600,
          padding: "5px 10px",
          borderRadius: 20,
          opacity: ltDeclineCooldown ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
          if (!ltDeclineCooldown) {
            e.currentTarget.style.background = `${characterColor}30`;
          }
        }}
        onMouseLeave={(e) => {
          if (!ltDeclineCooldown) {
            e.currentTarget.style.background = `${characterColor}18`;
          }
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 18V5l12-2v13"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="6"
            cy="18"
            r="3"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle
            cx="18"
            cy="16"
            r="3"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
        <span>
          {ltDeclineCooldown
            ? `Wait ${ltDeclineCooldown}s`
            : "Listen Together"}
        </span>
      </button>
    </div>
  );
}