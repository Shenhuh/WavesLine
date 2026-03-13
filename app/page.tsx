"use client";
import { useState, useRef, useEffect } from "react";
import ListenTogether, { type SessionEvent } from "./components/ListenTogether";

// ── PHROLOVA'S SONG — prebuilt, zero tokens ───────────────────────────────
const PHROLOVA_SONG = [
  "Hi, it's been a while",
  "Since the last time that I saw your smile",
  "What a perfect fit",
  "The last piece have fallen into place",
  "I've been craving to touch you",
  "Like moonlight stroking your face",
  "My dear reverie, come hold me near",
  "Come dance with me in a rosy haze of yesterday",
  "Reverie, don't drift away",
  "Please keep me here in your warm embrace",
  "I'll trade anything for you, for one more day",
  "I'll perfume your dreams",
  "With scent of flowers and summer breeze",
  "Does it matter if it's true?",
  "It feels a lot more real",
  "When we whistle through the field",
  "When I sing this song for you",
  "My dear reverie, come hold me near",
  "Come dance with me in a rosy haze of yesterday",
  "Reverie, don't let me go",
  "If sanity means I have to hit the road",
  "Then I don't wanna know anywhere the wind blows",
];

const ALL_CHARACTERS = [
  { key: "rover_m", name: "Male Rover",   avatar: "/avatars/rover_m.png" },
  { key: "rover_f", name: "Female Rover", avatar: "/avatars/rover_f.png" },
];

const CHAT_CHARACTERS: Record<string, { name: string; color: string; avatar: string; title: string; annoyanceThreshold: number; annoyanceBlockMessage: string }> = {
  aemeath:  { name: "Aemeath",  color: "#e8702a", avatar: "/avatars/aemeath.png",  title: "Digital Ghost of Startorch", annoyanceThreshold: 100, annoyanceBlockMessage: ". . ." },
  phrolova: { name: "Phrolova", color: "#9d6fdf", avatar: "/avatars/phrolova.png", title: "Former Overseer",              annoyanceThreshold: 75,  annoyanceBlockMessage: "I have tolerated enough. Do not contact me again." },
};

// ── Extended message type with LT invite fields ───────────────────────────
type Message = {
  role: string;
  content: string;
  time?: string;
  imageUrl?: string;
  gifUrl?: string;
  stickerName?: string;
  gifCaption?: string;
  isBlock?: boolean;
  // AI-initiated Listen Together invite
  isLTInvite?: boolean;
  ltInviteVideoId?: string;
  ltInviteTitle?: string;
  ltInviteChannel?: string;
  ltInviteAccepted?: boolean; // undefined=pending, true=accepted, false=declined
};

function decodeHtml(str: string): string {
  return str
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
function getTime() { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

function WavesLineLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="15" fill="#2a2c35" stroke="#c8a830" strokeWidth="1.5"/>
      <path d="M8 19 C10 13,14 11,16 16 C18 21,22 19,24 13" stroke="#c8a830" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <circle cx="16" cy="16" r="2.5" fill="#c8a830"/>
    </svg>
  );
}

function Avatar({ src, name, size = 36, color = "#888" }: { src: string; name: string; size?: number; color?: string }) {
  const [err, setErr] = useState(false);
  if (!err) return <img src={src} alt={name} onError={() => setErr(true)} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block", flexShrink: 0 }} />;
  return <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: size * 0.38, userSelect: "none" }}>{name[0]}</div>;
}

function StickerImg({ name }: { name: string }) {
  const exts = ["png", "gif", "webp", "jpg"];
  const [idx, setIdx] = useState(0);
  if (idx >= exts.length) return null;
  return <img src={`/stickers/${name}.${exts[idx]}`} alt="sticker" onError={() => setIdx(i => i + 1)} style={{ width: 90, height: 90, objectFit: "contain" }} />;
}

function CharacterPicker({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sel = ALL_CHARACTERS.find(c => c.key === value) ?? ALL_CHARACTERS[0];
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.08)", border: `1px solid ${open ? "#c8a830" : "rgba(255,255,255,0.15)"}`, cursor: "pointer" }}>
        <Avatar src={sel.avatar} name={sel.name} size={28} color="#c8a830" />
        <span style={{ flex: 1, color: "#e8e8ee", fontSize: 13, fontWeight: 600, textAlign: "left" }}>{sel.name}</span>
        <span style={{ color: "#888", fontSize: 9 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 200, background: "#1e2028", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, maxHeight: 200, overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
          {ALL_CHARACTERS.map(c => (
            <button key={c.key} onClick={() => { onChange(c.key); setOpen(false); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", background: c.key === value ? "rgba(200,168,48,0.12)" : "none", border: "none", cursor: "pointer", borderLeft: c.key === value ? "2px solid #c8a830" : "2px solid transparent" }}>
              <Avatar src={c.avatar} name={c.name} size={24} color="#c8a830" />
              <span style={{ color: c.key === value ? "#c8a830" : "#b0b2be", fontSize: 12 }}>{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AddContactModal({ existing, onAdd, onCancel }: { existing: string[]; onAdd: (k: string) => void; onCancel: () => void }) {
  const available = Object.keys(CHAT_CHARACTERS).filter(k => !existing.includes(k));
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#2a2c38", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: 20, width: 280, boxShadow: "0 20px 60px rgba(0,0,0,0.8)", display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ color: "#e8e8ee", fontSize: 14, fontWeight: 700, margin: 0 }}>Add Contact</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {available.length === 0 && <p style={{ color: "#555", fontSize: 12, textAlign: "center", padding: "12px 0" }}>All contacts added!</p>}
          {available.map(key => {
            const ch = CHAT_CHARACTERS[key];
            return (
              <button key={key} onClick={() => onAdd(key)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(200,168,48,0.1)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}>
                <Avatar src={ch.avatar} name={ch.name} size={38} color={ch.color} />
                <div>
                  <p style={{ color: "#e8e8ee", fontSize: 13, fontWeight: 600, margin: 0 }}>{ch.name}</p>
                  <p style={{ color: ch.color, fontSize: 11, margin: 0 }}>{ch.title}</p>
                </div>
              </button>
            );
          })}
        </div>
        <button onClick={onCancel} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 0", color: "#888", fontSize: 12, cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

// ── AI-initiated Listen Together invite bubble ────────────────────────────
function LTInviteBubble({
  msg, charName, charColor, charAvatar, onAccept, onDecline,
}: {
  msg: Message; charName: string; charColor: string; charAvatar: string;
  onAccept: () => void; onDecline: () => void;
}) {
  const pending = msg.ltInviteAccepted === undefined;
  const accepted = msg.ltInviteAccepted === true;
  
  return (
    <div style={{ display: "flex", flexDirection: "row", gap: 8, alignItems: "flex-end", marginBottom: 6 }}>
      <div style={{ width: 30, height: 30, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
        <Avatar src={charAvatar} name={charName} size={30} color={charColor} />
      </div>
      <div style={{ 
        background: "#fff", 
        borderRadius: 12, 
        padding: "12px 16px", 
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)", 
        maxWidth: "72%", 
        border: `2px solid ${charColor}`,
        position: "relative"
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 18V5l12-2v13" stroke={charColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="6" cy="18" r="3" stroke={charColor} strokeWidth="2"/>
            <circle cx="18" cy="16" r="3" stroke={charColor} strokeWidth="2"/>
          </svg>
          <span style={{ color: charColor, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>LISTEN TOGETHER INVITE</span>
        </div>
        
        {/* Video info */}
        <p style={{ color: "#1e2030", fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>
          {msg.ltInviteTitle || "Join me watching a video"}
        </p>
        {msg.ltInviteChannel && (
          <p style={{ color: "#666", fontSize: 12, margin: "0 0 12px" }}>
            📺 {msg.ltInviteChannel}
          </p>
        )}
        
        {/* Spoken text (if any) */}
        {msg.content && (
          <p style={{ 
            color: "#444", 
            fontSize: 13, 
            margin: "0 0 16px", 
            fontStyle: "italic",
            padding: "8px 12px",
            background: "#f5f5f5",
            borderRadius: 8,
            borderLeft: `3px solid ${charColor}`
          }}>
            "{msg.content}"
          </p>
        )}
        
        {/* Buttons */}
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
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
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
                transition: "all 0.2s"
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#e5e5e5")}
              onMouseLeave={e => (e.currentTarget.style.background = "#f0f0f0")}
            >
              ✗ Not Now
            </button>
          </div>
        ) : (
          <p style={{ 
            fontSize: 12, 
            margin: "8px 0 0", 
            color: accepted ? charColor : "#999", 
            fontStyle: "italic",
            textAlign: "center",
            padding: "4px",
            background: accepted ? `${charColor}10` : "#f5f5f5",
            borderRadius: 4
          }}>
            {accepted ? "✓ You've joined the session" : "✗ Invite declined"}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Active Users Counter ──────────────────────────────────────────────────
function ActiveUsersCounter() {
  const [activeCount, setActiveCount] = useState<number>(1);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected">("connected");

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    const connectSSE = () => {
      try {
        eventSource = new EventSource("/api/active-users");
        eventSource.onopen = () => {
          setConnectionStatus("connected");
          if (reconnectTimeout) { clearTimeout(reconnectTimeout); reconnectTimeout = null; }
        };
        eventSource.onmessage = (event) => {
          try {
            if (event.data && !event.data.startsWith(":")) {
              const data = JSON.parse(event.data);
              if (typeof data.count === "number") setActiveCount(data.count);
            }
          } catch {}
        };
        eventSource.onerror = () => {
          setConnectionStatus("disconnected");
          eventSource?.close();
          if (!reconnectTimeout) {
            reconnectTimeout = setTimeout(() => { reconnectTimeout = null; connectSSE(); }, 3000);
          }
        };
      } catch {}
    };
    connectSSE();
    return () => { eventSource?.close(); if (reconnectTimeout) clearTimeout(reconnectTimeout); };
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 8px", background: "rgba(255,255,255,0.06)", borderRadius: 20, border: "1px solid rgba(200,168,48,0.15)" }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: connectionStatus === "connected" ? "#4ade80" : "#f87171", animation: connectionStatus === "connected" ? "pulse 2s infinite" : "none" }} />
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c8a830" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round"/>
      </svg>
      <span style={{ color: "#e8e8ee", fontSize: 11, fontWeight: 600 }}>{activeCount}</span>
      <span style={{ color: connectionStatus === "connected" ? "#9a9cb0" : "#f87171", fontSize: 10 }}>
        {connectionStatus === "connected" ? "online" : "offline"}
      </span>
    </div>
  );
}

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
  const [toast, setToast] = useState<{ key: string; name: string; preview: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedImage, setAttachedImage] = useState<{ url: string; name: string } | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaTab, setMediaTab] = useState<"stickers" | "gif">("stickers");
  const [gifSearch, setGifSearch] = useState("");
  const [gifCaption, setGifCaption] = useState("");
  const [gifResults, setGifResults] = useState<{ url: string; preview: string }[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [stickers, setStickers] = useState<string[]>([]);
  const mediaPickerRef = useRef<HTMLDivElement>(null);
  const activeChatRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const blockingRef = useRef<Record<string, boolean>>({});
  activeChatRef.current = activeChat;
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState<"sidebar" | "chat">("sidebar");

  // ── LT session cleanup ────────────────────────────────────────────────────
  const ltSessionRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [allMessages, loading, activeChat]);
  useEffect(() => { fetch("/api/stickers").then(r => r.json()).then(d => setStickers(d.files ?? [])).catch(() => {}); }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (mediaPickerRef.current && !mediaPickerRef.current.contains(e.target as Node)) setShowMediaPicker(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
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
      setLtDeclineCooldown(prev => {
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
      if (!val.trim()) { setGifResults([]); return; }
      setGifLoading(true);
      try { const r = await fetch(`/api/giphy?q=${encodeURIComponent(val)}`); const d = await r.json(); setGifResults(d.results ?? []); } catch { setGifResults([]); }
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
        messages: messages.map(({ role, content, imageUrl, stickerName, gifUrl, gifCaption }) => ({ 
          role, 
          content, 
          imageUrl, 
          stickerName, 
          gifUrl, 
          gifCaption 
        })),
        character: chatKey,
        playerName: player.name,
        playerKey: player.key,
      }),
    });
    
    const reply = await res.json();
    
    const rawContent: string = reply.messages?.[0]?.content ?? reply.content ?? "";
    
    console.log('AI Reply received:', rawContent);
    
    const ltMatch = rawContent.match(/\[LISTEN_TOGETHER:([^\]]+)\]/);
    
    if (ltMatch) {
      console.log('🎵 Listen Together invite detected!', ltMatch[1]);
      
      const parts = ltMatch[1].split(':');
      
      // Extract what the AI wants to show
      const videoId = parts[0]?.trim(); // We'll ignore this
      const title = parts[1]?.trim() || ''; // This is what we'll search for
      const channel = parts[2]?.trim() || '';
      
      // IMPORTANT: Remove the tag completely from the spoken text
      const spokenText = rawContent.replace(ltMatch[0], '').trim();
      
      // Use the TITLE from the AI to search YouTube
      let searchQuery = title;
      
      // If the title is generic, make it more specific
      if (searchQuery && !searchQuery.toLowerCase().includes('wuthering waves')) {
        searchQuery = `Wuthering Waves ${searchQuery}`;
      }
      
      console.log('Searching YouTube for title:', searchQuery);
      
      let realVideoId = videoId; // Start with AI's ID as fallback
      let realTitle = title;
      let realChannel = channel;
      
      try {
        // Search YouTube using the title from AI
        const searchRes = await fetch(`/api/youtube?q=${encodeURIComponent(searchQuery)}`);
        const searchData = await searchRes.json();
        
        if (searchData.results && searchData.results.length > 0) {
          // Take the FIRST result - this will be the most relevant video
          const firstResult = searchData.results[0];
          realVideoId = firstResult.id;
          realTitle = firstResult.title;
          realChannel = firstResult.channel;
          
          console.log('✅ Found real video as first result:', { 
            videoId: realVideoId, 
            title: realTitle,
            channel: realChannel 
          });
        } else {
          console.log('❌ No search results found for:', searchQuery);
        }
      } catch (error) {
        console.error('Error searching YouTube:', error);
      }
      
      // Add the spoken text first if it exists (WITHOUT the tag)
      if (spokenText) {
        setAllMessages(prev => ({
          ...prev,
          [chatKey]: [...(prev[chatKey] ?? []), { 
            role: "assistant", 
            content: spokenText, // This has the tag removed
            time: getTime() 
          }],
        }));
        
        await new Promise(r => setTimeout(r, 500));
      }
      
      // Add the invite bubble with the REAL video ID from search
      setAllMessages(prev => ({
        ...prev,
        [chatKey]: [...(prev[chatKey] ?? []), {
          role: "assistant",
          content: "", // Empty content - just the invite bubble
          time: getTime(),
          isLTInvite: true,
          ltInviteVideoId: realVideoId,
          ltInviteTitle: decodeHtml(realTitle),
          ltInviteChannel: decodeHtml(realChannel),
          ltInviteAccepted: undefined,
        }],
      }));
      
      console.log('🎬 Invite sent with real video:', { 
        id: realVideoId, 
        title: realTitle 
      });
      
      setTypingFor(null);
      setLoading(false);
      return;
    }

    // If no LT invite, handle normal reply
    const replyMsgs: { content: string; gifUrl?: string; stickerName?: string }[] =
      reply.messages ?? [{ content: reply.content, gifUrl: reply.gifUrl, stickerName: reply.stickerName }];
    
    for (let i = 0; i < replyMsgs.length; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
      const m = replyMsgs[i];
      
      // Final safety check: If any content somehow still has the tag, remove it
      let cleanContent = m.content ?? "";
      if (cleanContent.includes('[LISTEN_TOGETHER:')) {
        cleanContent = cleanContent.replace(/\[LISTEN_TOGETHER:[^\]]+\]/, '').trim();
      }
      
      setAllMessages(prev => ({
        ...prev,
        [chatKey]: [...(prev[chatKey] ?? []), {
          role: "assistant", 
          content: cleanContent, 
          time: getTime(),
          gifUrl: m.gifUrl ?? undefined, 
          stickerName: m.stickerName ?? undefined,
        }],
      }));
    }

    if (activeChatRef.current !== chatKey) {
      setUnread(prev => ({ ...prev, [chatKey]: true }));
      const last = replyMsgs[replyMsgs.length - 1]?.content ?? "";
      setToast({ key: chatKey, name: CHAT_CHARACTERS[chatKey]?.name || chatKey, preview: last.length > 30 ? last.slice(0, 30) + "…" : last || "New message" });
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 4000);
    }

    // Handle annoyance delta
    if (reply.annoyanceDelta != null && !blockedChats[chatKey]) {
      const char = CHAT_CHARACTERS[chatKey];
      const threshold = char?.annoyanceThreshold ?? 100;
      const blockMsg = char?.annoyanceBlockMessage ?? "I have had enough.";
      setAnnoyance(prev => {
        const current = prev[chatKey] ?? 0;
        const next = Math.min(100, Math.max(0, current + reply.annoyanceDelta));
        if (next >= threshold) {
          if (blockingRef.current[chatKey]) return { ...prev, [chatKey]: next };
          blockingRef.current[chatKey] = true;
          setTimeout(async () => {
            await new Promise(r => setTimeout(r, 400));
            setAllMessages(p => ({ ...p, [chatKey]: [...(p[chatKey] ?? []), { role: "assistant", content: blockMsg, time: getTime() }] }));
            await new Promise(r => setTimeout(r, 600));
            setAllMessages(p => ({ ...p, [chatKey]: [...(p[chatKey] ?? []), { role: "assistant", content: "[has blocked you]", time: getTime(), isBlock: true }] }));
            setBlockedChats(p => ({ ...p, [chatKey]: true }));
          }, 0);
          return { ...prev, [chatKey]: 0 };
        }
        return { ...prev, [chatKey]: next };
      });
    }

    // Auto-play prebuilt song
    if (reply.singSong && !blockingRef.current[chatKey + "_song"]) {
      blockingRef.current[chatKey + "_song"] = true;
      await new Promise(r => setTimeout(r, 600));
      setAllMessages(prev => ({ ...prev, [chatKey]: [...(prev[chatKey] ?? []), { role: "assistant", content: "Fine.", time: getTime() }] }));
      await new Promise(r => setTimeout(r, 800));
      setAllMessages(prev => ({ ...prev, [chatKey]: [...(prev[chatKey] ?? []), { role: "assistant", content: "*begins to play*", time: getTime() }] }));
      for (const line of PHROLOVA_SONG) {
        await new Promise(r => setTimeout(r, 900 + Math.random() * 500));
        setAllMessages(prev => ({ ...prev, [chatKey]: [...(prev[chatKey] ?? []), { role: "assistant", content: line, time: getTime() }] }));
      }
      await new Promise(r => setTimeout(r, 1200));
      const updatedMsgs = [...messages, { role: "assistant" as const, content: "[just finished singing her song for you]" }];
      await triggerAIReply(chatKey, updatedMsgs);
      if (!blockingRef.current[chatKey]) {
        blockingRef.current[chatKey] = true;
        await new Promise(r => setTimeout(r, 800));
        setAllMessages(prev => ({ ...prev, [chatKey]: [...(prev[chatKey] ?? []), { role: "assistant", content: "[Phrolova has blocked you]", time: getTime(), isBlock: true }] }));
        setBlockedChats(prev => ({ ...prev, [chatKey]: true }));
      }
      blockingRef.current[chatKey + "_song"] = false;
      return;
    }
  } catch (error) {
    console.error('Error in AI reply:', error);
    setAllMessages(prev => ({ 
      ...prev, 
      [chatKey]: [...(prev[chatKey] ?? []), { 
        role: "assistant", 
        content: "signal lost.", 
        time: getTime() 
      }] 
    }));
  }
  setTypingFor(null); 
  setLoading(false);
  setTimeout(() => inputRef.current?.focus(), 50);
}
  // ── Accept / decline AI-initiated LT invite ───────────────────────────────
  function acceptLTInvite(chatKey: string, msgIndex: number) {
    console.log('Accepting LT invite for', chatKey);
    
    const msg = allMessages[chatKey]?.[msgIndex];
    
    setAllMessages(prev => ({
      ...prev,
      [chatKey]: prev[chatKey].map((m, i) => i === msgIndex ? { ...m, ltInviteAccepted: true } : m),
    }));
    
    setLtInviteVideoId(msg?.ltInviteVideoId || null);
    setLtInviteTitle(msg?.ltInviteTitle || null);
    setLtInviteChannel(msg?.ltInviteChannel || null);
    
    setShowListenTogether(true);
  }
  
  function declineLTInvite(chatKey: string, msgIndex: number) {
    console.log('Declining LT invite for', chatKey);
    setAllMessages(prev => ({
      ...prev,
      [chatKey]: prev[chatKey].map((m, i) => i === msgIndex ? { ...m, ltInviteAccepted: false } : m),
    }));
    startLTCooldown(60);
  }

  async function requestUnblock() {
    if (!activeChat || unblockLoading) return;
    const chatKey = activeChat;
    if (!player) return;
    setUnblockLoading(true);
    const accepted = Math.random() < 0.20;
    if (!accepted) {
      await new Promise(r => setTimeout(r, 800));
      setAllMessages(prev => ({ ...prev, [chatKey]: [...(prev[chatKey] ?? []), { role: "system", content: "Your request was ignored.", time: getTime() }] }));
      setUnblockLoading(false);
      return;
    }
    const messages = allMessages[chatKey] ?? [];
    const context = [...messages, { role: "user" as const, content: "[sent an unblock request]" }];
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: context.map(({ role, content }) => ({ role, content })), character: chatKey, playerName: player.name, playerKey: player.key, unblockRequest: true, unblockAccepted: true }),
      });
      const reply = await res.json();
      const replyMsgs = reply.messages ?? [{ content: reply.content }];
      for (let i = 0; i < replyMsgs.length; i++) {
        if (i > 0) await new Promise(r => setTimeout(r, 600));
        const m = replyMsgs[i];
        setAllMessages(prev => ({ ...prev, [chatKey]: [...(prev[chatKey] ?? []), { role: "assistant", content: m.content ?? "", time: getTime() }] }));
      }
      blockingRef.current[chatKey] = false;
      setAnnoyance(prev => ({ ...prev, [chatKey]: 0 }));
      setBlockedChats(prev => ({ ...prev, [chatKey]: false }));
    } catch {
      setAllMessages(prev => ({ ...prev, [chatKey]: [...(prev[chatKey] ?? []), { role: "assistant", content: "...", time: getTime() }] }));
    }
    setUnblockLoading(false);
  }

  function addContact(key: string) {
    setContacts(prev => [...prev, key]); 
    setAllMessages(prev => ({ ...prev, [key]: [] }));
    setActiveChat(key); 
    setUnread(prev => ({ ...prev, [key]: false })); 
    setShowAddContact(false);
    if (isMobile) setMobileView("chat");
  }
  
  function openChat(key: string) {
    setActiveChat(key); 
    setUnread(prev => ({ ...prev, [key]: false }));
    setToast(prev => prev?.key === key ? null : prev);
    if (isMobile) setMobileView("chat");
  }
  
  async function sendMessage() {
    if ((!input.trim() && !attachedImage) || loading || !player || !activeChat) return;
    const chatKey = activeChat;
    const msg: Message = { role: "user", content: input, time: getTime(), ...(attachedImage ? { imageUrl: attachedImage.url } : {}) };
    const updated = [...(allMessages[chatKey] ?? []), msg];
    setAllMessages(prev => ({ ...prev, [chatKey]: updated })); 
    setInput(""); 
    setAttachedImage(null);
    setTimeout(() => inputRef.current?.focus(), 100);
    triggerAIReply(chatKey, updated);
  }
  
  function sendSticker(filename: string) {
    if (!activeChat || !player) return;
    const chatKey = activeChat;
    const msg: Message = { role: "user", content: "", time: getTime(), stickerName: filename };
    const updated = [...(allMessages[chatKey] ?? []), msg];
    setAllMessages(prev => ({ ...prev, [chatKey]: updated })); 
    setShowMediaPicker(false);
    triggerAIReply(chatKey, updated);
  }
  
  function sendGifFromPicker(gifUrl: string) {
    if (!activeChat || !player || !gifCaption.trim()) return;
    const chatKey = activeChat;
    const msg: Message = { role: "user", content: "", time: getTime(), gifUrl, gifCaption: gifCaption.trim() };
    const updated = [...(allMessages[chatKey] ?? []), msg];
    setAllMessages(prev => ({ ...prev, [chatKey]: updated })); 
    setGifCaption(""); 
    setShowMediaPicker(false);
    triggerAIReply(chatKey, updated);
  }

  const activeChar = activeChat ? CHAT_CHARACTERS[activeChat] : null;
  const activeMsgs = activeChat ? (allMessages[activeChat] ?? []) : [];
  const selChar = ALL_CHARACTERS.find(c => c.key === selectedKey) ?? ALL_CHARACTERS[0];

  // ── LOGIN ────────────────────────────────────────────────────────────────
  if (!player) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1c24", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ background: "#22242e", border: "1px solid rgba(200,168,48,0.2)", borderRadius: 18, padding: 36, width: 300, display: "flex", flexDirection: "column", alignItems: "center", gap: 22, boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><WavesLineLogo size={28} /><span style={{ color: "#c8a830", fontSize: 15, fontWeight: 800, letterSpacing: "0.12em" }}>WAVESLINE</span></div>
        <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", border: "2px solid rgba(200,168,48,0.35)" }}><Avatar src={selChar.avatar} name={selChar.name} size={72} color="#c8a830" /></div>
        <div style={{ width: "100%" }}>
          <p style={{ color: "#555768", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Choose your resonator</p>
          <CharacterPicker value={selectedKey} onChange={setSelectedKey} />
        </div>
        <button onClick={() => setPlayer(selChar)}
          style={{ width: "100%", padding: "11px 0", borderRadius: 10, background: "linear-gradient(135deg,#c8a830,#a88820)", border: "none", color: "#1a1400", fontSize: 13, fontWeight: 800, cursor: "pointer", letterSpacing: "0.06em" }}>
          OPEN WAVESLINE →
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "center", background: "#14151c", fontFamily: "'Segoe UI',system-ui,sans-serif", position: "relative" }}>
      {showAddContact && <AddContactModal existing={contacts} onAdd={addContact} onCancel={() => setShowAddContact(false)} />}

      <div style={{ width: isMobile ? "100vw" : "min(820px,98vw)", height: isMobile ? "100dvh" : "min(560px,96vh)", borderRadius: isMobile ? 0 : 12, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.9)", border: "1px solid rgba(255,255,255,0.05)" }}>

        {/* TOP BAR */}
        <div style={{ height: 40, background: "#1e2028", display: "flex", alignItems: "center", padding: "0 14px", gap: 8, flexShrink: 0, borderBottom: "1px solid rgba(0,0,0,0.3)" }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><WavesLineLogo size={14} /></div>
          <span style={{ color: "#c8c9d0", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em" }}>WavesLine</span>
          <div style={{ flex: 1 }} />
          <ActiveUsersCounter />
          <button onClick={() => setPlayer(null)}
            style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "3px 10px 3px 5px", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", overflow: "hidden" }}><Avatar src={player.avatar} name={player.name} size={22} color="#c8a830" /></div>
            <span style={{ color: "#9a9cb0", fontSize: 11 }}>{player.name}</span>
          </button>
          {[{ icon: "⚙", hov: "#c8c9d0" }, { icon: "!", hov: "#e0a020" }, { icon: "✕", hov: "#e05050" }].map(({ icon, hov }, i) => (
            <button key={i} onClick={i === 2 ? () => setPlayer(null) : undefined}
              style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", fontSize: 13, borderRadius: 4 }}
              onMouseEnter={e => (e.currentTarget.style.color = hov)} onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}>
              {icon}
            </button>
          ))}
        </div>

        {/* BODY */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* SIDEBAR */}
          <div style={{ width: isMobile ? "100%" : "clamp(160px,24%,210px)", display: isMobile && mobileView === "chat" ? "none" : "flex", flexDirection: "column", background: "#2e3038", overflow: "hidden" }}>
            <button onClick={() => setShowAddContact(true)}
              style={{ margin: "8px 8px 4px", padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#c8c9d0", fontSize: 20, flexShrink: 0 }}>+</div>
              <span style={{ color: "#9a9cb0", fontSize: 12 }}>Add Contact</span>
            </button>
            <div style={{ flex: 1, overflowY: "auto", padding: "2px 8px 8px" }}>
              {contacts.length === 0 && <p style={{ color: "#4a4c58", fontSize: 11, textAlign: "center", padding: "28px 8px", lineHeight: 1.6 }}>No contacts yet.<br />Add someone!</p>}
              {contacts.map(key => {
                const ch = CHAT_CHARACTERS[key];
                const isActive = activeChat === key;
                const isTyping = typingFor === key;
                const hasUnread = unread[key] === true;
                const msgs = allMessages[key] ?? [];
                const last = msgs[msgs.length - 1];
                const preview = isTyping ? "typing..."
                  : last?.isLTInvite ? "🎵 Listen Together invite"
                  : last?.content ? (last.content.length > 20 ? last.content.slice(0, 20) + "…" : last.content)
                  : last?.stickerName ? "sent a sticker"
                  : last?.gifUrl ? "sent a GIF"
                  : ch.title;
                return (
                  <button key={key} onClick={() => openChat(key)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 3, borderRadius: 8, background: isActive ? "linear-gradient(90deg,#f0ede4,#e8e5da)" : "rgba(255,255,255,0.04)", border: "none", cursor: "pointer", textAlign: "left", boxShadow: isActive ? "inset 3px 0 0 #c8a830" : "none" }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden" }}><Avatar src={ch.avatar} name={ch.name} size={36} color={ch.color} /></div>
                      {(isTyping || hasUnread) && <div style={{ position: "absolute", top: -1, right: -1, width: 9, height: 9, borderRadius: "50%", background: isTyping ? "#c8a830" : "#e04040", border: "2px solid #2e3038", animation: isTyping ? "pulse 1s infinite" : "none" }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: isActive ? "#1e2030" : hasUnread ? "#e0e0ee" : "#b0b2c0", fontSize: 12, fontWeight: hasUnread || isActive ? 700 : 500, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch.name}</p>
                      <p style={{ color: isTyping ? "#c8a830" : isActive ? "#6a6858" : "#5a5c6a", fontSize: 10, margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontStyle: isTyping ? "italic" : "normal" }}>{preview}</p>
                    </div>
                    {hasUnread && !isActive && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#e04040", flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
            {toast && (
              <button onClick={() => { openChat(toast.key); setToast(null); }}
                style={{ margin: "0 8px 8px", padding: "8px 12px", borderRadius: 8, background: "#1a1c22", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, textAlign: "left", animation: "slideUp 0.25s ease" }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#c8a830", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ color: "#1a1400", fontSize: 9, fontWeight: 800 }}>✓</span></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "#c8a830", fontSize: 11, fontWeight: 700, margin: 0 }}>{toast.name}</p>
                  <p style={{ color: "#606070", fontSize: 10, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{toast.preview}</p>
                </div>
              </button>
            )}
          </div>

          {/* CHAT PANEL */}
          <div style={{ flex: 1, display: isMobile && mobileView === "sidebar" ? "none" : "flex", flexDirection: "column", background: "#e0e1e3", overflow: "hidden" }}>
            {!activeChat && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10, opacity: 0.2 }}>
                <WavesLineLogo size={44} />
                <p style={{ color: "#333", fontSize: 12 }}>Select a contact</p>
              </div>
            )}
            {activeChat && activeChar && (<>
              {/* Chat header */}
              <div style={{ height: 44, background: "#e0e1e3", borderBottom: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", padding: isMobile ? "0 10px" : "0 20px", flexShrink: 0, justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {isMobile && <button onClick={() => setMobileView("sidebar")} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 22, padding: "0 6px 0 0" }}>‹</button>}
                  <span style={{ color: "#1e2030", fontSize: 15, fontWeight: 700 }}>{activeChar.name}</span>
                  {typingFor === activeChat && <span style={{ color: "#888", fontSize: 11, fontStyle: "italic", marginLeft: 10 }}>typing...</span>}
                </div>
                <button
                  onClick={() => !ltDeclineCooldown && setShowListenTogether(true)}
                  title={ltDeclineCooldown ? `Cooldown: ${ltDeclineCooldown}s` : "Listen Together"}
                  style={{ background: ltDeclineCooldown ? "rgba(0,0,0,0.06)" : `${activeChar.color}18`, border: `1px solid ${ltDeclineCooldown ? "rgba(0,0,0,0.1)" : activeChar.color + "50"}`, cursor: ltDeclineCooldown ? "not-allowed" : "pointer", color: ltDeclineCooldown ? "#aaa" : activeChar.color, display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 20, opacity: ltDeclineCooldown ? 0.6 : 1 }}
                  onMouseEnter={e => { if (!ltDeclineCooldown) e.currentTarget.style.background = `${activeChar.color}30`; }}
                  onMouseLeave={e => { if (!ltDeclineCooldown) e.currentTarget.style.background = `${activeChar.color}18`; }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <span>{ltDeclineCooldown ? `Wait ${ltDeclineCooldown}s` : "Listen Together"}</span>
                </button>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                  <span style={{ background: "rgba(0,0,0,0.06)", color: "#888", fontSize: 11, padding: "3px 14px", borderRadius: 20 }}>▲ You are now friends with {activeChar.name}</span>
                </div>

                {activeMsgs.map((m, i) => {
                  if (m.role === "system") return (
                    <div key={i} style={{ textAlign: "center", padding: "4px 16px" }}>
                      <span style={{ fontSize: 11, color: "#999", fontStyle: "italic" }}>{m.content}</span>
                    </div>
                  );

                  if (m.isLTInvite) {
                    return (
                      <LTInviteBubble
                        key={i} 
                        msg={m}
                        charName={activeChar.name} 
                        charColor={activeChar.color} 
                        charAvatar={activeChar.avatar}
                        onAccept={() => acceptLTInvite(activeChat, i)}
                        onDecline={() => declineLTInvite(activeChat, i)}
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
                      {showLabel && <p style={{ fontSize: 11, color: "#888", margin: isUser ? "8px 40px 3px 0" : "8px 0 3px 44px", textAlign: isUser ? "right" : "left" }}>{name}</p>}
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flexDirection: isUser ? "row-reverse" : "row" }}>
                        {isLastInGroup
                          ? <div style={{ width: 30, height: 30, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}><Avatar src={avatar} name={name} size={30} color={avatarColor} /></div>
                          : <div style={{ width: 30, flexShrink: 0 }} />}
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: isUser ? "flex-end" : "flex-start", maxWidth: "68%" }}>
                          {m.gifUrl && (
                            <div style={{ borderRadius: 12, overflow: "hidden", maxWidth: 220 }}>
                              {m.gifUrl.includes(".mp4")
                                ? <video src={m.gifUrl} autoPlay loop muted playsInline style={{ display: "block", width: "100%", maxHeight: 160, objectFit: "cover" }} />
                                : <img src={m.gifUrl} alt="gif" style={{ display: "block", width: "100%", maxHeight: 160, objectFit: "cover" }} />}
                            </div>
                          )}
                          {m.stickerName && <StickerImg name={m.stickerName} />}
                          {(m.content || m.imageUrl) && (
                            <div style={{ padding: m.imageUrl && !m.content ? "4px" : "10px 16px", fontSize: 13, lineHeight: 1.55, background: isUser ? "#1e2028" : "#ffffff", color: isUser ? "#d8daee" : "#1e2030", borderRadius: 12, boxShadow: isUser ? "none" : "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden" }}>
                              {m.imageUrl && <img src={m.imageUrl} alt="attachment" style={{ display: "block", maxWidth: 200, maxHeight: 160, borderRadius: 6, marginBottom: m.content ? 6 : 0, objectFit: "cover" }} />}
                              {m.content}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {loading && typingFor === activeChat && (
                  <div style={{ marginBottom: 6 }}>
                    <p style={{ fontSize: 11, color: "#888", margin: "8px 0 3px 44px" }}>{activeChar.name}</p>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}><Avatar src={activeChar.avatar} name={activeChar.name} size={30} color={activeChar.color} /></div>
                      <div style={{ padding: "10px 16px", background: "#ffffff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", display: "flex", gap: 4, alignItems: "center" }}>
                        {[0,1,2].map(j => <div key={j} style={{ width: 5, height: 5, borderRadius: "50%", background: "#aaa", animation: "bounce 1.2s infinite", animationDelay: `${j*0.18}s` }} />)}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* INPUT BAR */}
              <div style={{ background: "#d4d6d8", borderTop: "1px solid rgba(0,0,0,0.1)", padding: "8px 12px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {attachedImage && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", background: "rgba(0,0,0,0.06)", borderRadius: 8 }}>
                    <img src={attachedImage.url} alt="preview" style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                    <span style={{ flex: 1, color: "#666", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{attachedImage.name}</span>
                    <button onClick={() => setAttachedImage(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: 14 }}>✕</button>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input ref={fileInputRef} type="file" accept="image/*,.gif" style={{ display: "none" }}
                    onChange={e => {
                      const file = e.target.files?.[0]; if (!file) return;
                      const reader = new FileReader();
                      reader.onload = ev => setAttachedImage({ url: ev.target?.result as string, name: file.name });
                      reader.readAsDataURL(file); e.target.value = "";
                    }} />
                  <div ref={mediaPickerRef} style={{ position: "relative", flexShrink: 0 }}>
                    <button onClick={() => setShowMediaPicker(o => !o)} disabled={loading}
                      style={{ width: 32, height: 32, borderRadius: 7, background: showMediaPicker ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.08)", border: "none", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>🎭</button>
                    {showMediaPicker && (
                      <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: 0, width: "min(290px,80vw)", height: 280, background: "#1e2028", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, boxShadow: "0 8px 40px rgba(0,0,0,0.7)", display: "flex", flexDirection: "column", overflow: "hidden", animation: "slideUp 0.2s ease", zIndex: 100 }}>
                        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
                          {(["stickers", "gif"] as const).map(tab => (
                            <button key={tab} onClick={() => setMediaTab(tab)}
                              style={{ flex: 1, padding: "9px 0", background: "none", border: "none", cursor: "pointer", color: mediaTab === tab ? "#e8e8ee" : "#404258", fontSize: 11, fontWeight: mediaTab === tab ? 700 : 400, borderBottom: mediaTab === tab ? `2px solid ${activeChar?.color || "#c8a830"}` : "2px solid transparent" }}>
                              {tab === "stickers" ? "🎴 Stickers" : "🎞 GIF"}
                            </button>
                          ))}
                        </div>
                        {mediaTab === "stickers" && (
                          <div style={{ flex: 1, overflowY: "auto", padding: 8, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                            {stickers.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", color: "#404258", fontSize: 11, padding: "20px 0" }}>No stickers yet</div>}
                            {stickers.map(file => {
                              const name = file.replace(/\.(png|gif|webp|jpg)$/i, "");
                              return (
                                <button key={file} onClick={() => sendSticker(name)}
                                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 7, padding: 4, cursor: "pointer", aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center" }}
                                  onMouseEnter={e => (e.currentTarget.style.background = (activeChar?.color || "#c8a830") + "22")}
                                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}>
                                  <img src={`/stickers/${file}`} alt={name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {mediaTab === "gif" && (
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                            <div style={{ padding: "6px 8px 3px", flexShrink: 0 }}>
                              <input style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "5px 9px", color: "#e8e8ee", fontSize: 11, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                                placeholder="Search GIFs..." value={gifSearch} onChange={e => handleGifInput(e.target.value)} />
                            </div>
                            <div style={{ padding: "0 8px 5px", flexShrink: 0 }}>
                              <input style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: `1px solid ${gifCaption.trim() ? (activeChar?.color || "#c8a830") + "80" : "rgba(255,255,255,0.08)"}`, borderRadius: 7, padding: "5px 9px", color: "#e8e8ee", fontSize: 11, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                                placeholder="Describe your GIF (required)..." value={gifCaption} onChange={e => setGifCaption(e.target.value)} />
                              {!gifCaption.trim() && <p style={{ color: "#e04040", fontSize: 9, margin: "2px 0 0 2px" }}>Required</p>}
                            </div>
                            <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, gridAutoRows: "90px" }}>
                              {gifLoading && <div style={{ gridColumn: "1/-1", color: "#404258", fontSize: 11, textAlign: "center", padding: "16px 0" }}>Searching...</div>}
                              {!gifLoading && gifResults.length === 0 && <div style={{ gridColumn: "1/-1", color: "#404258", fontSize: 11, textAlign: "center", padding: "16px 0" }}>Search above</div>}
                              {gifResults.map((g, idx) => (
                                <button key={idx} onClick={() => sendGifFromPicker(g.url)}
                                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, padding: 0, cursor: gifCaption.trim() ? "pointer" : "not-allowed", overflow: "hidden", opacity: gifCaption.trim() ? 1 : 0.3, height: "90px" }}>
                                  <img src={g.preview} alt="gif" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} disabled={loading}
                    style={{ width: 32, height: 32, borderRadius: 7, background: attachedImage ? (activeChar?.color || "#c8a830") + "30" : "rgba(0,0,0,0.08)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke={attachedImage ? (activeChar?.color || "#c8a830") : "#777"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {blockedChats[activeChat!] ? (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "#999", fontStyle: "italic" }}>You have been blocked.</span>
                      <button onClick={requestUnblock} disabled={unblockLoading}
                        style={{ padding: "6px 14px", borderRadius: 8, background: unblockLoading ? "rgba(0,0,0,0.08)" : "#1e2028", border: "none", color: unblockLoading ? "#999" : "white", fontSize: 12, cursor: unblockLoading ? "default" : "pointer", flexShrink: 0 }}>
                        {unblockLoading ? "Requesting..." : "Request Unblock"}
                      </button>
                    </div>
                  ) : (
                    <>
                      <input ref={inputRef}
                        style={{ flex: 1, background: "#eaebec", border: `1px solid ${input.length >= 180 ? "#e04040" : "rgba(0,0,0,0.1)"}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#1e2030", outline: "none", fontFamily: "inherit" }}
                        value={input}
                        maxLength={200}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && sendMessage()}
                        placeholder={`Message ${activeChar.name}...`} disabled={loading} />
                      <button onClick={sendMessage} disabled={loading || (!input.trim() && !attachedImage)}
                        style={{ width: 32, height: 32, borderRadius: 8, background: (input.trim() || attachedImage) ? "#1e2028" : "rgba(0,0,0,0.1)", border: "none", cursor: (input.trim() || attachedImage) ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                          <path d="M22 2L11 13" stroke={(input.trim() || attachedImage) ? "white" : "#999"} strokeWidth="2.5" strokeLinecap="round"/>
                          <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={(input.trim() || attachedImage) ? "white" : "#999"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </>
                  )}
                </div>
                {!blockedChats[activeChat!] && input.length >= 150 && (
                  <p style={{ margin: "2px 0 0", textAlign: "right", fontSize: 10, color: input.length >= 180 ? "#e04040" : "#aaa" }}>
                    {200 - input.length}/200
                  </p>
                )}
              </div>
            </>)}
          </div>
        </div>
      </div>

      {/* Listen Together Modal */}
      {showListenTogether && activeChar && player && (
        <div style={{
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
          backdropFilter: "blur(4px)"
        }}>
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
              setAllMessages(prev => ({
                ...prev,
                [chatKey]: [...(prev[chatKey] ?? []), msg],
              }));
            }}
            onBlock={async (blockMsg: string) => {
              setShowListenTogether(false);
              const chatKey = activeChat!;
              await new Promise(r => setTimeout(r, 400));
              setAllMessages(p => ({ ...p, [chatKey]: [...(p[chatKey] ?? []), { role: "assistant", content: blockMsg, time: getTime() }] }));
              await new Promise(r => setTimeout(r, 600));
              setAllMessages(p => ({ ...p, [chatKey]: [...(p[chatKey] ?? []), { role: "assistant", content: "[has blocked you]", time: getTime(), isBlock: true }] }));
              setBlockedChats(p => ({ ...p, [chatKey]: true }));
              blockingRef.current[chatKey] = true;
              setAnnoyance(p => ({ ...p, [chatKey]: 0 }));
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