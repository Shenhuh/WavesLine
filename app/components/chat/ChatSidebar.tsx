"use client";

import Avatar from "@/app/components/chat/Avatar";

type ChatCharacter = {
  name: string;
  color: string;
  avatar: string;
  title: string;
  annoyanceThreshold: number;
  annoyanceBlockMessage: string;
};

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

type ToastState = {
  key: string;
  name: string;
  preview: string;
} | null;

type ChatSidebarProps = {
  isMobile: boolean;
  mobileView: "sidebar" | "chat";
  contacts: string[];
  activeChat: string | null;
  typingFor: string | null;
  unread: Record<string, boolean>;
  allMessages: Record<string, Message[]>;
  characters: Record<string, ChatCharacter>;
  toast: ToastState;
  onShowAddContact: () => void;
  onOpenChat: (key: string) => void;
  onClearToast: () => void;
};

export default function ChatSidebar({
  isMobile,
  mobileView,
  contacts,
  activeChat,
  typingFor,
  unread,
  allMessages,
  characters,
  toast,
  onShowAddContact,
  onOpenChat,
  onClearToast,
}: ChatSidebarProps) {
  return (
    <div
      style={{
        width: isMobile ? "100%" : "clamp(160px,24%,210px)",
        display: isMobile && mobileView === "chat" ? "none" : "flex",
        flexDirection: "column",
        background: "#2e3038",
        overflow: "hidden",
      }}
    >
      <button
        onClick={onShowAddContact}
        style={{
          margin: "8px 8px 4px",
          padding: "8px 12px",
          borderRadius: 8,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "rgba(255,255,255,0.06)")
        }
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#c8c9d0",
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          +
        </div>
        <span style={{ color: "#9a9cb0", fontSize: 12 }}>Add Contact</span>
      </button>

      <div style={{ flex: 1, overflowY: "auto", padding: "2px 8px 8px" }}>
        {contacts.length === 0 && (
          <p
            style={{
              color: "#4a4c58",
              fontSize: 11,
              textAlign: "center",
              padding: "28px 8px",
              lineHeight: 1.6,
            }}
          >
            No contacts yet.
            <br />
            Add someone!
          </p>
        )}

        {contacts.map((key) => {
          const ch = characters[key];
          const isActive = activeChat === key;
          const isTyping = typingFor === key;
          const hasUnread = unread[key] === true;
          const msgs = allMessages[key] ?? [];
          const last = msgs[msgs.length - 1];

          const preview = isTyping
            ? "typing..."
            : last?.isLTInvite
              ? "🎵 Listen Together invite"
              : last?.content
                ? last.content.length > 20
                  ? last.content.slice(0, 20) + "…"
                  : last.content
                : last?.stickerName
                  ? "sent a sticker"
                  : last?.gifUrl
                    ? "sent a GIF"
                    : ch.title;

          return (
            <button
              key={key}
              onClick={() => onOpenChat(key)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                marginBottom: 3,
                borderRadius: 8,
                background: isActive
                  ? "linear-gradient(90deg,#f0ede4,#e8e5da)"
                  : "rgba(255,255,255,0.04)",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                boxShadow: isActive ? "inset 3px 0 0 #c8a830" : "none",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                }
              }}
            >
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    overflow: "hidden",
                  }}
                >
                  <Avatar
                    src={ch.avatar}
                    name={ch.name}
                    size={36}
                    color={ch.color}
                  />
                </div>

                {(isTyping || hasUnread) && (
                  <div
                    style={{
                      position: "absolute",
                      top: -1,
                      right: -1,
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: isTyping ? "#c8a830" : "#e04040",
                      border: "2px solid #2e3038",
                      animation: isTyping ? "pulse 1s infinite" : "none",
                    }}
                  />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    color: isActive
                      ? "#1e2030"
                      : hasUnread
                        ? "#e0e0ee"
                        : "#b0b2c0",
                    fontSize: 12,
                    fontWeight: hasUnread || isActive ? 700 : 500,
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ch.name}
                </p>
                <p
                  style={{
                    color: isTyping
                      ? "#c8a830"
                      : isActive
                        ? "#6a6858"
                        : "#5a5c6a",
                    fontSize: 10,
                    margin: "2px 0 0",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontStyle: isTyping ? "italic" : "normal",
                  }}
                >
                  {preview}
                </p>
              </div>

              {hasUnread && !isActive && (
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#e04040",
                    flexShrink: 0,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {toast && (
        <button
          onClick={() => {
            onOpenChat(toast.key);
            onClearToast();
          }}
          style={{
            margin: "0 8px 8px",
            padding: "8px 12px",
            borderRadius: 8,
            background: "#1a1c22",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
            textAlign: "left",
            animation: "slideUp 0.25s ease",
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "#c8a830",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ color: "#1a1400", fontSize: 9, fontWeight: 800 }}>
              ✓
            </span>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                color: "#c8a830",
                fontSize: 11,
                fontWeight: 700,
                margin: 0,
              }}
            >
              {toast.name}
            </p>
            <p
              style={{
                color: "#606070",
                fontSize: 10,
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {toast.preview}
            </p>
          </div>
        </button>
      )}
    </div>
  );
}