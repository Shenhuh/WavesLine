"use client";

import type { RefObject } from "react";

type LTInvite = {
  status?: "pending" | "accepted" | "declined";
  query?: string;
};

type ChatMsg = {
  role?: string;
  content?: string;
  gifUrl?: string | null;
  stickerName?: string | null;
  stickerUrl?: string | null;
  imageUrl?: string | null;
  listenTogether?: LTInvite | null;
};

type ActiveChar = {
  name?: string;
  avatar?: string;
  color?: string;
};

type Player = {
  name?: string;
  avatar?: string;
};

type ChatMessagesProps = {
  activeChar: ActiveChar;
  activeMsgs?: ChatMsg[];
  player?: Player;
  loading?: boolean;
  typingForActive?: boolean;
  messagesEndRef?: RefObject<HTMLDivElement | null>;
  onAcceptLTInvite?: (msgIndex: number) => void;
  onDeclineLTInvite?: (msgIndex: number) => void;
};

function getStickerSrc(msg: ChatMsg) {
  if (msg.stickerUrl) return msg.stickerUrl;
  if (msg.stickerName) return `/stickers/${msg.stickerName}.png`;
  return null;
}

export default function ChatMessages({
  activeChar,
  activeMsgs = [],
  player,
  loading = false,
  typingForActive = false,
  messagesEndRef,
  onAcceptLTInvite,
  onDeclineLTInvite,
}: ChatMessagesProps) {
  const safeMsgs = Array.isArray(activeMsgs) ? activeMsgs : [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-3">
        <div className="flex min-h-full flex-col gap-3">
          {safeMsgs.map((msg, index) => {
            const role = msg.role ?? "assistant";
            const isUser = role === "user";
            const stickerSrc = getStickerSrc(msg);

            return (
              <div
                key={`${role}-${index}`}
                className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={[
                    "max-w-[82%] rounded-2xl px-3 py-2 shadow-sm",
                    isUser
                      ? "bg-[#6d5dfc] text-white"
                      : "border border-black/5 bg-white/90 text-[#1d1f2a]",
                  ].join(" ")}
                >
                  {(msg.content ?? "").trim() !== "" && (
                    <div className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">
                      {msg.content}
                    </div>
                  )}

                  {msg.imageUrl && (
                    <img
                      src={msg.imageUrl}
                      alt="attachment"
                      className="mt-2 max-h-[280px] max-w-[220px] rounded-xl object-contain"
                    />
                  )}

                  {msg.gifUrl && (
                    <img
                      src={msg.gifUrl}
                      alt="gif"
                      className="mt-2 max-h-[220px] max-w-[220px] rounded-xl object-contain"
                    />
                  )}

                  {stickerSrc && (
                    <img
                      src={stickerSrc}
                      alt={msg.stickerName ?? "sticker"}
                      className="mt-2 max-h-[160px] max-w-[160px] rounded-xl object-contain"
                    />
                  )}

                  {msg.listenTogether && (
                    <div className="mt-2 rounded-xl bg-black/5 px-3 py-2 text-[12px]">
                      <div className="font-medium">Listen Together invite</div>

                      {msg.listenTogether.query && (
                        <div className="mt-1 opacity-80">
                          {msg.listenTogether.query}
                        </div>
                      )}

                      {msg.listenTogether.status === "pending" && (
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => onAcceptLTInvite?.(index)}
                            className="rounded-lg bg-[#6d5dfc] px-3 py-1.5 text-white"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeclineLTInvite?.(index)}
                            className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[#1d1f2a]"
                          >
                            Decline
                          </button>
                        </div>
                      )}

                      {msg.listenTogether.status === "accepted" && (
                        <div className="mt-2 text-emerald-600">Accepted</div>
                      )}

                      {msg.listenTogether.status === "declined" && (
                        <div className="mt-2 text-rose-600">Declined</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {(loading || typingForActive) && (
            <div className="flex w-full justify-start">
              <div className="max-w-[82%] rounded-2xl border border-black/5 bg-white/90 px-3 py-2 text-[#1d1f2a] shadow-sm">
                <div className="text-[13px] opacity-70">
                  {activeChar?.name ?? "Typing"} is typing...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}