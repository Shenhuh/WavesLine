"use client";

import StickerImg from "@/app/components/chat/StickerImg";
import type { RefObject } from "react";

type ActiveChar = {
  name: string;
  color: string;
};

type ChatInputBarProps = {
  activeChar: ActiveChar;
  blocked: boolean;
  loading: boolean;
  input: string;
  attachedImage: { url: string; name: string } | null;
  showMediaPicker: boolean;
  mediaTab: "stickers" | "gif";
  gifSearch: string;
  gifCaption: string;
  gifResults: { url: string; preview: string }[];
  gifLoading: boolean;
  stickers: string[];
  unblockLoading: boolean;

  fileInputRef: RefObject<HTMLInputElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
  mediaPickerRef: RefObject<HTMLDivElement | null>;

  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onOpenFilePicker: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachedImage: () => void;

  onToggleMediaPicker: () => void;
  onMediaTabChange: (tab: "stickers" | "gif") => void;
  onGifSearchChange: (value: string) => void;
  onGifCaptionChange: (value: string) => void;

  onSendSticker: (filename: string) => void;
  onSendGif: (gifUrl: string) => void;
  onRequestUnblock: () => void;
};

export default function ChatInputBar({
  activeChar,
  blocked,
  loading,
  input,
  attachedImage,
  showMediaPicker,
  mediaTab,
  gifSearch,
  gifCaption,
  gifResults,
  gifLoading,
  stickers,
  unblockLoading,
  fileInputRef,
  inputRef,
  mediaPickerRef,
  onInputChange,
  onSendMessage,
  onOpenFilePicker,
  onFileChange,
  onRemoveAttachedImage,
  onToggleMediaPicker,
  onMediaTabChange,
  onGifSearchChange,
  onGifCaptionChange,
  onSendSticker,
  onSendGif,
  onRequestUnblock,
}: ChatInputBarProps) {
  return (
    <div
      style={{
        background: "#d4d6d8",
        borderTop: "1px solid rgba(0,0,0,0.1)",
        padding: "8px 12px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {attachedImage && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 8px",
            background: "rgba(0,0,0,0.06)",
            borderRadius: 8,
          }}
        >
          <img
            src={attachedImage.url}
            alt="preview"
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              objectFit: "cover",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              flex: 1,
              color: "#666",
              fontSize: 11,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {attachedImage.name}
          </span>
          <button
            onClick={onRemoveAttachedImage}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#999",
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.gif"
          style={{ display: "none" }}
          onChange={onFileChange}
        />

        <div ref={mediaPickerRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={onToggleMediaPicker}
            disabled={loading}
            style={{
              width: 32,
              height: 32,
              borderRadius: 7,
              background: showMediaPicker ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.08)",
              border: "none",
              cursor: "pointer",
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            🎭
          </button>

          {showMediaPicker && (
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: 0,
                width: "min(290px,80vw)",
                height: 280,
                background: "#1e2028",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                boxShadow: "0 8px 40px rgba(0,0,0,0.7)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                animation: "slideUp 0.2s ease",
                zIndex: 100,
              }}
            >
              <div
                style={{
                  display: "flex",
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                  flexShrink: 0,
                }}
              >
                {(["stickers", "gif"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => onMediaTabChange(tab)}
                    style={{
                      flex: 1,
                      padding: "9px 0",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: mediaTab === tab ? "#e8e8ee" : "#404258",
                      fontSize: 11,
                      fontWeight: mediaTab === tab ? 700 : 400,
                      borderBottom:
                        mediaTab === tab
                          ? `2px solid ${activeChar.color || "#c8a830"}`
                          : "2px solid transparent",
                    }}
                  >
                    {tab === "stickers" ? "🎴 Stickers" : "🎞 GIF"}
                  </button>
                ))}
              </div>

              {mediaTab === "stickers" && (
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: 8,
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 6,
                  }}
                >
                  {stickers.length === 0 && (
                    <div
                      style={{
                        gridColumn: "1/-1",
                        textAlign: "center",
                        color: "#404258",
                        fontSize: 11,
                        padding: "20px 0",
                      }}
                    >
                      No stickers yet
                    </div>
                  )}

                  {stickers.map((file) => {
                    const name = file.replace(/\.(png|gif|webp|jpg)$/i, "");
                    return (
                      <button
                        key={file}
                        onClick={() => onSendSticker(name)}
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          borderRadius: 7,
                          padding: 4,
                          cursor: "pointer",
                          aspectRatio: "1",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <StickerImg name={name} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {mediaTab === "gif" && (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ padding: "6px 8px 3px", flexShrink: 0 }}>
                    <input
                      style={{
                        width: "100%",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 7,
                        padding: "5px 9px",
                        color: "#e8e8ee",
                        fontSize: 11,
                        outline: "none",
                        fontFamily: "inherit",
                        boxSizing: "border-box",
                      }}
                      placeholder="Search GIFs..."
                      value={gifSearch}
                      onChange={(e) => onGifSearchChange(e.target.value)}
                    />
                  </div>

                  <div style={{ padding: "0 8px 5px", flexShrink: 0 }}>
                    <input
                      style={{
                        width: "100%",
                        background: "rgba(255,255,255,0.06)",
                        border: `1px solid ${
                          gifCaption.trim()
                            ? (activeChar.color || "#c8a830") + "80"
                            : "rgba(255,255,255,0.08)"
                        }`,
                        borderRadius: 7,
                        padding: "5px 9px",
                        color: "#e8e8ee",
                        fontSize: 11,
                        outline: "none",
                        fontFamily: "inherit",
                        boxSizing: "border-box",
                      }}
                      placeholder="Describe your GIF (required)..."
                      value={gifCaption}
                      onChange={(e) => onGifCaptionChange(e.target.value)}
                    />
                    {!gifCaption.trim() && (
                      <p style={{ color: "#e04040", fontSize: 9, margin: "2px 0 0 2px" }}>
                        Required
                      </p>
                    )}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      padding: "0 8px 8px",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 5,
                      gridAutoRows: "90px",
                    }}
                  >
                    {gifLoading && (
                      <div
                        style={{
                          gridColumn: "1/-1",
                          color: "#404258",
                          fontSize: 11,
                          textAlign: "center",
                          padding: "16px 0",
                        }}
                      >
                        Searching...
                      </div>
                    )}

                    {!gifLoading && gifResults.length === 0 && (
                      <div
                        style={{
                          gridColumn: "1/-1",
                          color: "#404258",
                          fontSize: 11,
                          textAlign: "center",
                          padding: "16px 0",
                        }}
                      >
                        Search above
                      </div>
                    )}

                    {gifResults.map((g, idx) => (
                      <button
                        key={idx}
                        onClick={() => onSendGif(g.url)}
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 7,
                          padding: 0,
                          cursor: gifCaption.trim() ? "pointer" : "not-allowed",
                          overflow: "hidden",
                          opacity: gifCaption.trim() ? 1 : 0.3,
                          height: "90px",
                        }}
                      >
                        <img
                          src={g.preview}
                          alt="gif"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={onOpenFilePicker}
          disabled={loading}
          style={{
            width: 32,
            height: 32,
            borderRadius: 7,
            background: attachedImage
              ? (activeChar.color || "#c8a830") + "30"
              : "rgba(0,0,0,0.08)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
              stroke={attachedImage ? activeChar.color || "#c8a830" : "#777"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {blocked ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 12, color: "#999", fontStyle: "italic" }}>
              You have been blocked.
            </span>
            <button
              onClick={onRequestUnblock}
              disabled={unblockLoading}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                background: unblockLoading ? "rgba(0,0,0,0.08)" : "#1e2028",
                border: "none",
                color: unblockLoading ? "#999" : "white",
                fontSize: 12,
                cursor: unblockLoading ? "default" : "pointer",
                flexShrink: 0,
              }}
            >
              {unblockLoading ? "Requesting..." : "Request Unblock"}
            </button>
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              style={{
                flex: 1,
                background: "#eaebec",
                border: `1px solid ${
                  input.length >= 180 ? "#e04040" : "rgba(0,0,0,0.1)"
                }`,
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 13,
                color: "#1e2030",
                outline: "none",
                fontFamily: "inherit",
              }}
              value={input}
              maxLength={200}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSendMessage()}
              placeholder={`Message ${activeChar.name}...`}
              disabled={loading}
            />

            <button
              onClick={onSendMessage}
              disabled={loading || (!input.trim() && !attachedImage)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background:
                  input.trim() || attachedImage ? "#1e2028" : "rgba(0,0,0,0.1)",
                border: "none",
                cursor: input.trim() || attachedImage ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.15s",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22 2L11 13"
                  stroke={input.trim() || attachedImage ? "white" : "#999"}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M22 2L15 22L11 13L2 9L22 2Z"
                  stroke={input.trim() || attachedImage ? "white" : "#999"}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </>
        )}
      </div>

      {!blocked && input.length >= 150 && (
        <p
          style={{
            margin: "2px 0 0",
            textAlign: "right",
            fontSize: 10,
            color: input.length >= 180 ? "#e04040" : "#aaa",
          }}
        >
          {200 - input.length}/200
        </p>
      )}
    </div>
  );
}