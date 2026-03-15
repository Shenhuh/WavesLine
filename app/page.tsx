"use client";
import { useState, useRef, useEffect } from "react";
import ListenTogether, { type SessionEvent } from "./components/ListenTogether";

import Avatar from "@/app/components/chat/Avatar";
import WavesLineLogo from "@/app/components/chat/WavesLineLogo";
import AddContactModal from "@/app/components/chat/AddContactModal";
import ActiveUsersCounter from "@/app/components/chat/ActiveUsersCounter";
import {
  ALL_CHARACTERS,
  CHAT_CHARACTERS,
  PHROLOVA_SONG,
} from "@/app/lib/chat/constants";
import type { Message } from "@/app/lib/chat/types";
import { decodeHtml, getTime } from "@/app/lib/chat/utils";
import LoginScreen from "@/app/components/chat/LoginScreen";
import ChatSidebar from "@/app/components/chat/ChatSidebar";
import ChatHeader from "@/app/components/chat/ChatHeader";
import ChatMessages from "@/app/components/chat/ChatMessages";
import ChatInputBar from "@/app/components/chat/ChatInputBar";
import MMDPortrait from "@/app/components/MMDPortrait";
import {
  PORTRAIT_CONFIGS,
  type PortraitCharacterKey,
  type PortraitMood,
} from "@/app/lib/mmd/portraitConfig";

export default function Home() {
  const [player, setPlayer] = useState<typeof ALL_CHARACTERS[0] | null>(null);
  const [selectedKey, setSelectedKey] = useState(ALL_CHARACTERS[0].key);
  const [contacts, setContacts] = useState<string[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [blockedChats, setBlockedChats] = useState<Record<string, boolean>>({});
  const [unblockLoading, setUnblockLoading] = useState(false);
  const [annoyance, setAnnoyance] = useState<Record<string, number>>({});
  const [showListenTogether, setShowListenTogether] = useState(false);
  const [ltDeclineCooldown, setLtDeclineCooldown] = useState(0);
  const [ltInviteVideoId, setLtInviteVideoId] = useState<string | null>(null);
  const [ltInviteTitle, setLtInviteTitle] = useState<string | null>(null);
  const [ltInviteChannel, setLtInviteChannel] = useState<string | null>(null);

  const ltCooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [allMessages, setAllMessages] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [unread, setUnread] = useState<Record<string, boolean>>({});
  const [typingFor, setTypingFor] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    key: string;
    name: string;
    preview: string;
  } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedImage, setAttachedImage] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaTab, setMediaTab] = useState<"stickers" | "gif">("stickers");
  const [gifSearch, setGifSearch] = useState("");
  const [gifCaption, setGifCaption] = useState("");
  const [gifResults, setGifResults] = useState<
    { url: string; preview: string }[]
  >([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [stickers, setStickers] = useState<string[]>([]);
  const mediaPickerRef = useRef<HTMLDivElement>(null);
  const activeChatRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const blockingRef = useRef<Record<string, boolean>>({});
  activeChatRef.current = activeChat;
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState<"sidebar" | "chat">("sidebar");
  const [portraitMood, setPortraitMood] = useState<PortraitMood>("neutral");
  const ltSessionRef = useRef<Record<string, boolean>>({});

  function isPortraitMood(value: unknown): value is PortraitMood {
  return (
    value === "neutral" ||
    value === "focused" ||
    value === "curious" ||
    value === "concerned" ||
    value === "annoyed" ||
    value === "calm"
  );
}

  function syncChatStateFromReply(chatKey: string, reply: any) {
    if (typeof reply.blocked === "boolean") {
      setBlockedChats((prev) => ({ ...prev, [chatKey]: reply.blocked }));
      blockingRef.current[chatKey] = reply.blocked;
    }

    if (reply.session?.annoyance != null) {
      setAnnoyance((prev) => ({
        ...prev,
        [chatKey]: reply.session.annoyance,
      }));
    }

   if (isPortraitMood(reply.mood) && chatKey === activeChatRef.current) {
  setPortraitMood(reply.mood);
}
  }

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages, loading, activeChat]);

  useEffect(() => {
    fetch("/api/stickers")
      .then((r) => r.json())
      .then((d) => setStickers(d.files ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        mediaPickerRef.current &&
        !mediaPickerRef.current.contains(e.target as Node)
      ) {
        setShowMediaPicker(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function handleSessionUpdate(chatKey: string, event: SessionEvent) {
    if (event.type === "session_ended") {
      delete ltSessionRef.current[chatKey];
    }
  }

  function startLTCooldown(seconds = 60) {
    setLtDeclineCooldown(seconds);
    if (ltCooldownTimer.current) clearInterval(ltCooldownTimer.current);
    ltCooldownTimer.current = setInterval(() => {
      setLtDeclineCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(ltCooldownTimer.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  const gifDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleGifInput(val: string) {
    setGifSearch(val);
    if (gifDebounce.current) clearTimeout(gifDebounce.current);
    gifDebounce.current = setTimeout(async () => {
      if (!val.trim()) {
        setGifResults([]);
        return;
      }
      setGifLoading(true);
      try {
        const r = await fetch(`/api/giphy?q=${encodeURIComponent(val)}`);
        const d = await r.json();
        setGifResults(d.results ?? []);
      } catch {
        setGifResults([]);
      }
      setGifLoading(false);
    }, 500);
  }

  async function triggerAIReply(chatKey: string, messages: Message[]) {
    if (!player) return;
    setTypingFor(chatKey);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map(
            ({ role, content, imageUrl, stickerName, gifUrl, gifCaption }) => ({
              role,
              content,
              imageUrl,
              stickerName,
              gifUrl,
              gifCaption,
            })
          ),
          character: chatKey,
          playerName: player.name,
          playerKey: player.key,
        }),
      });

      const reply = await res.json();
      console.log("reply.blocked =", reply.blocked);
console.log("reply.annoyanceDelta =", reply.annoyanceDelta);
console.log("reply.session =", reply.session);
      syncChatStateFromReply(chatKey, reply);

      const rawContent: string =
        reply.messages?.[0]?.content ?? reply.content ?? "";
      const ltData =
        reply.listenTogether ?? reply.messages?.[0]?.listenTogether ?? null;

      console.log("AI Reply received:", rawContent);
      console.log("LT data:", ltData);
      console.log("Returned mood:", reply.mood);
      console.log("Returned blocked:", reply.blocked);
      console.log("Returned annoyance:", reply.session?.annoyance);

      if (ltData?.query) {
        const searchQuery = ltData.query.trim();
        const spokenText = rawContent.trim();

        console.log("🎵 Listen Together query:", searchQuery);

        let realVideoId = "";
        let realTitle = "";
        let realChannel = "";

        try {
          const searchRes = await fetch(
            `/api/youtube?q=${encodeURIComponent(searchQuery)}`
          );
          const searchData = await searchRes.json();

          if (searchData.results && searchData.results.length > 0) {
            const firstResult = searchData.results[0];
            realVideoId = firstResult.id;
            realTitle = firstResult.title;
            realChannel = firstResult.channel;

            console.log("✅ Found real video as first result:", {
              videoId: realVideoId,
              title: realTitle,
              channel: realChannel,
            });
          } else {
            console.log("❌ No search results found for:", searchQuery);

            if (spokenText) {
              setAllMessages((prev) => ({
                ...prev,
                [chatKey]: [
                  ...(prev[chatKey] ?? []),
                  {
                    role: "assistant",
                    content: spokenText,
                    time: getTime(),
                  },
                ],
              }));
            }

            setAllMessages((prev) => ({
              ...prev,
              [chatKey]: [
                ...(prev[chatKey] ?? []),
                {
                  role: "assistant",
                  content: "I couldn't find a playable video for that right now.",
                  time: getTime(),
                },
              ],
            }));

            setTypingFor(null);
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error("Error searching YouTube:", error);

          if (spokenText) {
            setAllMessages((prev) => ({
              ...prev,
              [chatKey]: [
                ...(prev[chatKey] ?? []),
                {
                  role: "assistant",
                  content: spokenText,
                  time: getTime(),
                },
              ],
            }));
          }

          setAllMessages((prev) => ({
            ...prev,
            [chatKey]: [
              ...(prev[chatKey] ?? []),
              {
                role: "assistant",
                content: "I couldn't open Listen Together right now.",
                time: getTime(),
              },
            ],
          }));

          setTypingFor(null);
          setLoading(false);
          return;
        }

        if (spokenText) {
          setAllMessages((prev) => ({
            ...prev,
            [chatKey]: [
              ...(prev[chatKey] ?? []),
              {
                role: "assistant",
                content: spokenText,
                time: getTime(),
              },
            ],
          }));

          await new Promise((r) => setTimeout(r, 500));
        }

        setAllMessages((prev) => ({
          ...prev,
          [chatKey]: [
            ...(prev[chatKey] ?? []),
            {
              role: "assistant",
              content: "",
              time: getTime(),
              isLTInvite: true,
              ltInviteVideoId: realVideoId,
              ltInviteTitle: decodeHtml(realTitle),
              ltInviteChannel: decodeHtml(realChannel),
              ltInviteAccepted: undefined,
            },
          ],
        }));

        console.log("🎬 Invite sent with real video:", {
          id: realVideoId,
          title: realTitle,
        });

        setTypingFor(null);
        setLoading(false);
        return;
      }

      const replyMsgs: {
        content: string;
        gifUrl?: string;
        stickerName?: string;
        listenTogether?: {
          query: string;
        } | null;
      }[] = reply.messages ?? [
        {
          content: reply.content,
          gifUrl: reply.gifUrl,
          stickerName: reply.stickerName,
          listenTogether: reply.listenTogether ?? null,
        },
      ];

      for (let i = 0; i < replyMsgs.length; i++) {
        if (i > 0) {
          await new Promise((r) =>
            setTimeout(r, 600 + Math.random() * 400)
          );
        }

        const m = replyMsgs[i];
        let cleanContent = m.content ?? "";

        if (cleanContent.includes("[LISTEN_TOGETHER:")) {
          cleanContent = cleanContent
            .replace(/\[LISTEN_TOGETHER:[^\]]+\]/g, "")
            .trim();
        }

        if (cleanContent.includes("[STICKER:")) {
          cleanContent = cleanContent.replace(/\[STICKER:[^\]]+\]/g, "").trim();
        }

        setAllMessages((prev) => ({
          ...prev,
          [chatKey]: [
            ...(prev[chatKey] ?? []),
            {
              role: "assistant",
              content: cleanContent,
              time: getTime(),
              gifUrl: m.gifUrl ?? undefined,
              stickerName: m.stickerName ?? undefined,
            },
          ],
        }));
      }

      if (activeChatRef.current !== chatKey) {
        setUnread((prev) => ({ ...prev, [chatKey]: true }));
        const last = replyMsgs[replyMsgs.length - 1]?.content ?? "";
        setToast({
          key: chatKey,
          name: CHAT_CHARACTERS[chatKey]?.name || chatKey,
          preview: last.length > 30 ? last.slice(0, 30) + "…" : last || "New message",
        });
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 4000);
      }

      if (reply.singSong && !blockingRef.current[chatKey + "_song"]) {
        blockingRef.current[chatKey + "_song"] = true;

        await new Promise((r) => setTimeout(r, 600));
        setAllMessages((prev) => ({
          ...prev,
          [chatKey]: [
            ...(prev[chatKey] ?? []),
            { role: "assistant", content: "Fine.", time: getTime() },
          ],
        }));

        await new Promise((r) => setTimeout(r, 800));
        setAllMessages((prev) => ({
          ...prev,
          [chatKey]: [
            ...(prev[chatKey] ?? []),
            { role: "assistant", content: "*begins to play*", time: getTime() },
          ],
        }));

        for (const line of PHROLOVA_SONG) {
          await new Promise((r) => setTimeout(r, 900 + Math.random() * 500));
          setAllMessages((prev) => ({
            ...prev,
            [chatKey]: [
              ...(prev[chatKey] ?? []),
              { role: "assistant", content: line, time: getTime() },
            ],
          }));
        }

        await new Promise((r) => setTimeout(r, 1200));
        const updatedMsgs = [
          ...messages,
          {
            role: "assistant" as const,
            content: "[just finished singing her song for you]",
          },
        ];
        await triggerAIReply(chatKey, updatedMsgs);

        if (!blockingRef.current[chatKey]) {
          blockingRef.current[chatKey] = true;
          await new Promise((r) => setTimeout(r, 800));
          setAllMessages((prev) => ({
            ...prev,
            [chatKey]: [
              ...(prev[chatKey] ?? []),
              {
                role: "assistant",
                content: "[Phrolova has blocked you]",
                time: getTime(),
                isBlock: true,
              },
            ],
          }));
          setBlockedChats((prev) => ({ ...prev, [chatKey]: true }));
        }

        blockingRef.current[chatKey + "_song"] = false;
        return;
      }
    } catch (error) {
      console.error("Error in AI reply:", error);
      setAllMessages((prev) => ({
        ...prev,
        [chatKey]: [
          ...(prev[chatKey] ?? []),
          {
            role: "assistant",
            content: "signal lost.",
            time: getTime(),
          },
        ],
      }));
    }

    setTypingFor(null);
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function acceptLTInvite(chatKey: string, msgIndex: number) {
    console.log("Accepting LT invite for", chatKey);

    const msg = allMessages[chatKey]?.[msgIndex];

    setAllMessages((prev) => ({
      ...prev,
      [chatKey]: prev[chatKey].map((m, i) =>
        i === msgIndex ? { ...m, ltInviteAccepted: true } : m
      ),
    }));

    setLtInviteVideoId(msg?.ltInviteVideoId || null);
    setLtInviteTitle(msg?.ltInviteTitle || null);
    setLtInviteChannel(msg?.ltInviteChannel || null);

    setShowListenTogether(true);
  }

  function declineLTInvite(chatKey: string, msgIndex: number) {
    console.log("Declining LT invite for", chatKey);
    setAllMessages((prev) => ({
      ...prev,
      [chatKey]: prev[chatKey].map((m, i) =>
        i === msgIndex ? { ...m, ltInviteAccepted: false } : m
      ),
    }));
    startLTCooldown(60);
  }

  async function requestUnblock() {
  if (!activeChat || unblockLoading || !player) return;

  const chatKey = activeChat;
  setUnblockLoading(true);

  const accepted = Math.random() < 0.2;

  try {
    if (!accepted) {
      await new Promise((r) => setTimeout(r, 800));

      // no chat bubble added here
      // optional: set a small UI status somewhere else if you want
      // setUnblockStatus("Your request was ignored.");

      setUnblockLoading(false);
      return;
    }

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [],
        character: chatKey,
        playerName: player.name,
        playerKey: player.key,
        userId: player.key,
        userMessage: "",
        unblockRequest: true,
        unblockAccepted: true,
      }),
    });

    const reply = await res.json();
    syncChatStateFromReply(chatKey, reply);

    // do NOT append reply.messages to chat
    // only update state

    blockingRef.current[chatKey] = !!reply.blocked;

    setAnnoyance((prev) => ({
      ...prev,
      [chatKey]: reply.session?.annoyance ?? prev[chatKey] ?? 0,
    }));

    setBlockedChats((prev) => ({
      ...prev,
      [chatKey]: !!reply.blocked,
    }));
  } catch {
    // optional silent failure
    // or set a small UI status outside chat
    // setUnblockStatus("Failed to send unblock request.");
  } finally {
    setUnblockLoading(false);
  }
}

  function addContact(key: string) {
    setContacts((prev) => [...prev, key]);
    setAllMessages((prev) => ({ ...prev, [key]: [] }));
    setActiveChat(key);
    setUnread((prev) => ({ ...prev, [key]: false }));
    setBlockedChats((prev) => ({ ...prev, [key]: false }));
    setAnnoyance((prev) => ({ ...prev, [key]: 0 }));

    setPortraitMood("neutral");
    setShowAddContact(false);
    if (isMobile) setMobileView("chat");
  }

  function openChat(key: string) {
  setActiveChat(key);
  setUnread((prev) => ({ ...prev, [key]: false }));
  setToast((prev) => (prev?.key === key ? null : prev));
  setPortraitMood("neutral");

  if (isMobile) setMobileView("chat");
}

  async function sendMessage() {
    if ((!input.trim() && !attachedImage) || loading || !player || !activeChat) {
      return;
    }

    const chatKey = activeChat;
    const msg: Message = {
      role: "user",
      content: input,
      time: getTime(),
      ...(attachedImage ? { imageUrl: attachedImage.url } : {}),
    };

    const updated = [...(allMessages[chatKey] ?? []), msg];
    setAllMessages((prev) => ({ ...prev, [chatKey]: updated }));
    setInput("");
    setAttachedImage(null);
    setTimeout(() => inputRef.current?.focus(), 100);
    triggerAIReply(chatKey, updated);
  }

  function sendSticker(filename: string) {
    if (!activeChat || !player) return;
    const chatKey = activeChat;
    const msg: Message = {
      role: "user",
      content: "",
      time: getTime(),
      stickerName: filename,
    };
    const updated = [...(allMessages[chatKey] ?? []), msg];
    setAllMessages((prev) => ({ ...prev, [chatKey]: updated }));
    setShowMediaPicker(false);
    triggerAIReply(chatKey, updated);
  }

  function sendGifFromPicker(gifUrl: string) {
    if (!activeChat || !player || !gifCaption.trim()) return;
    const chatKey = activeChat;
    const msg: Message = {
      role: "user",
      content: "",
      time: getTime(),
      gifUrl,
      gifCaption: gifCaption.trim(),
    };
    const updated = [...(allMessages[chatKey] ?? []), msg];
    setAllMessages((prev) => ({ ...prev, [chatKey]: updated }));
    setGifCaption("");
    setShowMediaPicker(false);
    triggerAIReply(chatKey, updated);
  }

  const activeChar = activeChat ? CHAT_CHARACTERS[activeChat] : null;
  const activeMsgs = activeChat ? allMessages[activeChat] ?? [] : [];
  const selChar =
    ALL_CHARACTERS.find((c) => c.key === selectedKey) ?? ALL_CHARACTERS[0];
  const hasPortrait =
  !!activeChat && Object.prototype.hasOwnProperty.call(PORTRAIT_CONFIGS, activeChat);

const activePortraitKey = hasPortrait
  ? (activeChat as PortraitCharacterKey)
  : null;
  if (!player) {
    return (
      <LoginScreen
        selectedKey={selectedKey}
        selectedCharacter={selChar}
        characters={ALL_CHARACTERS}
        onChangeCharacter={setSelectedKey}
        onOpen={() => setPlayer(selChar)}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "center",
        background: "#14151c",
        fontFamily: "'Segoe UI',system-ui,sans-serif",
        position: "relative",
      }}
    >
      {showAddContact && (
        <AddContactModal
          existing={contacts}
          characters={CHAT_CHARACTERS}
          onAdd={addContact}
          onCancel={() => setShowAddContact(false)}
        />
      )}

      <div
        style={{
          width: isMobile ? "100vw" : "min(820px,98vw)",
          height: isMobile ? "100dvh" : "min(560px,96vh)",
          borderRadius: isMobile ? 0 : 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 32px 80px rgba(0,0,0,0.9)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div
          style={{
            height: 40,
            background: "#1e2028",
            display: "flex",
            alignItems: "center",
            padding: "0 14px",
            gap: 8,
            flexShrink: 0,
            borderBottom: "1px solid rgba(0,0,0,0.3)",
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: "rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <WavesLineLogo size={14} />
          </div>

          <span
            style={{
              color: "#c8c9d0",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.06em",
            }}
          >
            WavesLine
          </span>

          <div style={{ flex: 1 }} />
          <ActiveUsersCounter />

          <button
            onClick={() => setPlayer(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: "3px 10px 3px 5px",
              cursor: "pointer",
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
                width: 22,
                height: 22,
                borderRadius: "50%",
                overflow: "hidden",
              }}
            >
              <Avatar
                src={player.avatar}
                name={player.name}
                size={22}
                color="#c8a830"
              />
            </div>
            <span style={{ color: "#9a9cb0", fontSize: 11 }}>{player.name}</span>
          </button>

          {[
            { icon: "⚙", hov: "#c8c9d0" },
            { icon: "!", hov: "#e0a020" },
            { icon: "✕", hov: "#e05050" },
          ].map(({ icon, hov }, i) => (
            <button
              key={i}
              onClick={i === 2 ? () => setPlayer(null) : undefined}
              style={{
                width: 26,
                height: 26,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(255,255,255,0.25)",
                fontSize: 13,
                borderRadius: 4,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = hov)}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "rgba(255,255,255,0.25)")
              }
            >
              {icon}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <ChatSidebar
            isMobile={isMobile}
            mobileView={mobileView}
            contacts={contacts}
            activeChat={activeChat}
            typingFor={typingFor}
            unread={unread}
            allMessages={allMessages}
            characters={CHAT_CHARACTERS}
            toast={toast}
            onShowAddContact={() => setShowAddContact(true)}
            onOpenChat={openChat}
            onClearToast={() => setToast(null)}
          />

          <div
            style={{
              flex: 1,
              display:
                isMobile && mobileView === "sidebar" ? "none" : "flex",
              overflow: "hidden",
              minWidth: 0,
            }}
          >
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                background: "#e0e1e3",
                overflow: "hidden",
                minWidth: 0,
              }}
            >
              {!activeChat && (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 10,
                    opacity: 0.2,
                  }}
                >
                  <WavesLineLogo size={44} />
                  <p style={{ color: "#333", fontSize: 12 }}>
                    Select a contact
                  </p>
                </div>
              )}

              {activeChat && activeChar && (
                <>
                  <ChatHeader
                    isMobile={isMobile}
                    characterName={activeChar.name}
                    characterColor={activeChar.color}
                    isTyping={typingFor === activeChat}
                    ltDeclineCooldown={ltDeclineCooldown}
                    onBack={() => setMobileView("sidebar")}
                    onOpenListenTogether={() => {
                      if (!ltDeclineCooldown) setShowListenTogether(true);
                    }}
                  />

                  {isMobile && activePortraitKey && (
  <div
    style={{
      padding: "8px 10px 0 10px",
      flexShrink: 0,
    }}
  >
    <div
      style={{
        width: "100%",
        height: 158,
        borderRadius: 16,
        overflow: "hidden",
        background: "#1a1c24",
        boxShadow: "0 8px 18px rgba(0,0,0,0.18)",
        border: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      <MMDPortrait
        character={activePortraitKey}
        mood={portraitMood}
        className="w-full h-full"
        debugMorphs={true}
      />
    </div>
  </div>
)}

                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      gap: isMobile ? 10 : 14,
                      padding: isMobile
                        ? "10px 10px 0 10px"
                        : "14px 14px 0 14px",
                      overflow: "hidden",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        minHeight: 0,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div style={{ flex: 1, minHeight: 0 }}>
                        <ChatMessages
                          activeChar={activeChar}
                          activeMsgs={activeMsgs}
                          player={player}
                          loading={loading}
                          typingForActive={typingFor === activeChat}
                          messagesEndRef={messagesEndRef}
                          onAcceptLTInvite={(msgIndex) =>
                            acceptLTInvite(activeChat, msgIndex)
                          }
                          onDeclineLTInvite={(msgIndex) =>
                            declineLTInvite(activeChat, msgIndex)
                          }
                        />
                      </div>
                    </div>

                    {!isMobile && activePortraitKey && (
  <aside
    style={{
      width: 180,
      flexShrink: 0,
      display: "flex",
      justifyContent: "flex-end",
    }}
  >
    <div
      style={{
        position: "sticky",
        top: 0,
        width: 180,
        height: 250,
        borderRadius: 14,
        overflow: "hidden",
        background: "#1a1c24",
        boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
        border: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      <MMDPortrait
        character={activePortraitKey}
        mood={portraitMood}
        className="w-full h-full"
      />
    </div>
  </aside>
)}
                  </div>

                  <ChatInputBar
                    activeChar={activeChar}
                    blocked={!!blockedChats[activeChat]}
                    loading={loading}
                    input={input}
                    attachedImage={attachedImage}
                    showMediaPicker={showMediaPicker}
                    mediaTab={mediaTab}
                    gifSearch={gifSearch}
                    gifCaption={gifCaption}
                    gifResults={gifResults}
                    gifLoading={gifLoading}
                    stickers={stickers}
                    unblockLoading={unblockLoading}
                    fileInputRef={fileInputRef}
                    inputRef={inputRef}
                    mediaPickerRef={mediaPickerRef}
                    onInputChange={setInput}
                    onSendMessage={sendMessage}
                    onOpenFilePicker={() => fileInputRef.current?.click()}
                    onFileChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) =>
                        setAttachedImage({
                          url: ev.target?.result as string,
                          name: file.name,
                        });
                      reader.readAsDataURL(file);
                      e.target.value = "";
                    }}
                    onRemoveAttachedImage={() => setAttachedImage(null)}
                    onToggleMediaPicker={() => setShowMediaPicker((o) => !o)}
                    onMediaTabChange={setMediaTab}
                    onGifSearchChange={handleGifInput}
                    onGifCaptionChange={setGifCaption}
                    onSendSticker={sendSticker}
                    onSendGif={sendGifFromPicker}
                    onRequestUnblock={requestUnblock}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showListenTogether && activeChar && player && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
          }}
        >
          <ListenTogether
            characterKey={activeChat!}
            characterName={activeChar.name}
            characterColor={activeChar.color}
            characterAvatar={activeChar.avatar}
            playerName={player.name}
            playerKey={player.key}
            playerAvatar={player.avatar}
            onClose={() => {
              setShowListenTogether(false);
              setLtInviteVideoId(null);
              setLtInviteTitle(null);
              setLtInviteChannel(null);
            }}
            onDecline={() => {
              setShowListenTogether(false);
              startLTCooldown(60);
              setLtInviteVideoId(null);
              setLtInviteTitle(null);
              setLtInviteChannel(null);
            }}
            onSessionUpdate={(event) => handleSessionUpdate(activeChat!, event)}
            sharedMessages={allMessages[activeChat!] ?? []}
            onAddMessage={(msg) => {
              const chatKey = activeChat!;
              setAllMessages((prev) => ({
                ...prev,
                [chatKey]: [...(prev[chatKey] ?? []), msg],
              }));
            }}
            onBlock={async (blockMsg: string) => {
              setShowListenTogether(false);
              const chatKey = activeChat!;
              await new Promise((r) => setTimeout(r, 400));
              setAllMessages((p) => ({
                ...p,
                [chatKey]: [
                  ...(p[chatKey] ?? []),
                  { role: "assistant", content: blockMsg, time: getTime() },
                ],
              }));
              await new Promise((r) => setTimeout(r, 600));
              setAllMessages((p) => ({
                ...p,
                [chatKey]: [
                  ...(p[chatKey] ?? []),
                  {
                    role: "assistant",
                    content: "[has blocked you]",
                    time: getTime(),
                    isBlock: true,
                  },
                ],
              }));
              setBlockedChats((p) => ({ ...p, [chatKey]: true }));
              blockingRef.current[chatKey] = true;
              setAnnoyance((p) => ({ ...p, [chatKey]: 0 }));
              setLtInviteVideoId(null);
              setLtInviteTitle(null);
              setLtInviteChannel(null);
            }}
            initialVideoId={ltInviteVideoId}
            initialVideoTitle={ltInviteTitle}
            initialVideoChannel={ltInviteChannel}
          />
        </div>
      )}

      <style>{`
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-4px)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes slideUp{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.15);border-radius:3px}
      `}</style>
    </div>
  );
}