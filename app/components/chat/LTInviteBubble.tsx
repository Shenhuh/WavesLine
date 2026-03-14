"use client";

import Avatar from "@/app/components/chat/Avatar";

type Message = {
  role: string;
  content: string;
  time?: string;
  imageUrl?: string;
  gifUrl?: string;
  stickerName?: string;
  gifCaption?: string;
  isBlock?: boolean;
  isLTInvite?: boolean;
  ltInviteVideoId?: string;
  ltInviteTitle?: string;
  ltInviteChannel?: string;
  ltInviteAccepted?: boolean;
};

type LTInviteBubbleProps = {
  msg: Message;
  charName: string;
  charColor: string;
  charAvatar: string;
  onAccept: () => void;
  onDecline: () => void;
};

export default function LTInviteBubble({
  msg,
  charName,
  charColor,
  charAvatar,
  onAccept,
  onDecline,
}: LTInviteBubbleProps) {
  const pending = msg.ltInviteAccepted === undefined;
  const accepted = msg.ltInviteAccepted === true;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap: 8,
        alignItems: "flex-end",
        marginBottom: 6,
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <Avatar src={charAvatar} name={charName} size={30} color={charColor} />
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: "12px 16px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          maxWidth: "72%",
          border: `2px solid ${charColor}`,
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 18V5l12-2v13"
              stroke={charColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="6" cy="18" r="3" stroke={charColor} strokeWidth="2" />
            <circle cx="18" cy="16" r="3" stroke={charColor} strokeWidth="2" />
          </svg>
          <span
            style={{
              color: charColor,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            LISTEN TOGETHER INVITE
          </span>
        </div>

        <p
          style={{
            color: "#1e2030",
            fontSize: 14,
            fontWeight: 700,
            margin: "0 0 4px",
          }}
        >
          {msg.ltInviteTitle || "Join me watching a video"}
        </p>

        {msg.ltInviteChannel && (
          <p style={{ color: "#666", fontSize: 12, margin: "0 0 12px" }}>
            📺 {msg.ltInviteChannel}
          </p>
        )}

        {msg.content && (
          <p
            style={{
              color: "#444",
              fontSize: 13,
              margin: "0 0 16px",
              fontStyle: "italic",
              padding: "8px 12px",
              background: "#f5f5f5",
              borderRadius: 8,
              borderLeft: `3px solid ${charColor}`,
            }}
          >
            "{msg.content}"
          </p>
        )}

        {pending ? (
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              onClick={onAccept}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 8,
                background: charColor,
                border: "none",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              🎵 Join Session
            </button>

            <button
              onClick={onDecline}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 8,
                background: "#f0f0f0",
                border: "1px solid #ddd",
                color: "#666",
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#e5e5e5")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#f0f0f0")
              }
            >
              ✗ Not Now
            </button>
          </div>
        ) : (
          <p
            style={{
              fontSize: 12,
              margin: "8px 0 0",
              color: accepted ? charColor : "#999",
              fontStyle: "italic",
              textAlign: "center",
              padding: "4px",
              background: accepted ? `${charColor}10` : "#f5f5f5",
              borderRadius: 4,
            }}
          >
            {accepted ? "✓ You've joined the session" : "✗ Invite declined"}
          </p>
        )}
      </div>
    </div>
  );
}