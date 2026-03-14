"use client";

import Avatar from "@/app/components/chat/Avatar";
import StickerImg from "@/app/components/chat/StickerImg";
import LTInviteBubble from "@/app/components/chat/LTInviteBubble";
import type { Message } from "@/app/lib/chat/types";
import type { RefObject } from "react";

type CharacterInfo = {
  name: string;
  color: string;
  avatar: string;
};

type PlayerInfo = {
  name: string;
  avatar: string;
};

type ChatMessagesProps = {
  activeChar: CharacterInfo;
  activeMsgs: Message[];
  player: PlayerInfo;
  loading: boolean;
  typingForActive: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onAcceptLTInvite: (msgIndex: number) => void;
  onDeclineLTInvite: (msgIndex: number) => void;
};

export default function ChatMessages({
  activeChar,
  activeMsgs,
  player,
  loading,
  typingForActive,
  messagesEndRef,
  onAcceptLTInvite,
  onDeclineLTInvite,
}: ChatMessagesProps) {
  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <span
          style={{
            background: "rgba(0,0,0,0.06)",
            color: "#888",
            fontSize: 11,
            padding: "3px 14px",
            borderRadius: 20,
          }}
        >
          ▲ You are now friends with {activeChar.name}
        </span>
      </div>

      {activeMsgs.map((m, i) => {
        if (m.role === "system") {
          return (
            <div key={i} style={{ textAlign: "center", padding: "4px 16px" }}>
              <span style={{ fontSize: 11, color: "#999", fontStyle: "italic" }}>
                {m.content}
              </span>
            </div>
          );
        }

        if (m.isLTInvite) {
          return (
            <LTInviteBubble
              key={i}
              msg={m}
              charName={activeChar.name}
              charColor={activeChar.color}
              charAvatar={activeChar.avatar}
              onAccept={() => onAcceptLTInvite(i)}
              onDecline={() => onDeclineLTInvite(i)}
            />
          );
        }

        const isUser = m.role === "user";
        const name = isUser ? player.name : activeChar.name;
        const avatar = isUser ? player.avatar : activeChar.avatar;
        const avatarColor = isUser ? "#5060b0" : activeChar.color;
        const prevMsg = activeMsgs[i - 1];
        const nextMsg = activeMsgs[i + 1];
        const showLabel = !prevMsg || prevMsg.role !== m.role;
        const isLastInGroup = !nextMsg || nextMsg.role !== m.role;

        return (
          <div key={i} style={{ marginBottom: 6 }}>
            {showLabel && (
              <p
                style={{
                  fontSize: 11,
                  color: "#888",
                  margin: isUser ? "8px 40px 3px 0" : "8px 0 3px 44px",
                  textAlign: isUser ? "right" : "left",
                }}
              >
                {name}
              </p>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 8,
                flexDirection: isUser ? "row-reverse" : "row",
              }}
            >
              {isLastInGroup ? (
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  <Avatar
                    src={avatar}
                    name={name}
                    size={30}
                    color={avatarColor}
                  />
                </div>
              ) : (
                <div style={{ width: 30, flexShrink: 0 }} />
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  alignItems: isUser ? "flex-end" : "flex-start",
                  maxWidth: "68%",
                }}
              >
                {m.gifUrl && (
                  <div style={{ borderRadius: 12, overflow: "hidden", maxWidth: 220 }}>
                    {m.gifUrl.includes(".mp4") ? (
                      <video
                        src={m.gifUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{
                          display: "block",
                          width: "100%",
                          maxHeight: 160,
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <img
                        src={m.gifUrl}
                        alt="gif"
                        style={{
                          display: "block",
                          width: "100%",
                          maxHeight: 160,
                          objectFit: "cover",
                        }}
                      />
                    )}
                  </div>
                )}

                {m.stickerName && <StickerImg name={m.stickerName} />}

                {(m.content || m.imageUrl) && (
                  <div
                    style={{
                      padding: m.imageUrl && !m.content ? "4px" : "10px 16px",
                      fontSize: 13,
                      lineHeight: 1.55,
                      background: isUser ? "#1e2028" : "#ffffff",
                      color: isUser ? "#d8daee" : "#1e2030",
                      borderRadius: 12,
                      boxShadow: isUser ? "none" : "0 1px 3px rgba(0,0,0,0.08)",
                      overflow: "hidden",
                    }}
                  >
                    {m.imageUrl && (
                      <img
                        src={m.imageUrl}
                        alt="attachment"
                        style={{
                          display: "block",
                          maxWidth: 200,
                          maxHeight: 160,
                          borderRadius: 6,
                          marginBottom: m.content ? 6 : 0,
                          objectFit: "cover",
                        }}
                      />
                    )}
                    {m.content}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {loading && typingForActive && (
        <div style={{ marginBottom: 6 }}>
          <p style={{ fontSize: 11, color: "#888", margin: "8px 0 3px 44px" }}>
            {activeChar.name}
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <Avatar
                src={activeChar.avatar}
                name={activeChar.name}
                size={30}
                color={activeChar.color}
              />
            </div>
            <div
              style={{
                padding: "10px 16px",
                background: "#ffffff",
                borderRadius: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                display: "flex",
                gap: 4,
                alignItems: "center",
              }}
            >
              {[0, 1, 2].map((j) => (
                <div
                  key={j}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "#aaa",
                    animation: "bounce 1.2s infinite",
                    animationDelay: `${j * 0.18}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}