"use client";
import { useState, useRef, useEffect, useCallback } from "react";

const ALL_CHARACTERS = [
  { key: "rover_m", name: "Male Rover",   avatar: "/avatars/rover_m.png" },
  { key: "rover_f", name: "Female Rover", avatar: "/avatars/rover_f.png" },
  // { key: "jiyan",       name: "Jiyan",         avatar: "/avatars/jiyan.png" },
  // { key: "calcharo",    name: "Calcharo",      avatar: "/avatars/calcharo.png" },
  // { key: "yinlin",      name: "Yinlin",        avatar: "/avatars/yinlin.png" },
  // { key: "changli",     name: "Changli",       avatar: "/avatars/changli.png" },
  // { key: "jinhsi",      name: "Jinhsi",        avatar: "/avatars/jinhsi.png" },
  // { key: "camellya",    name: "Camellya",      avatar: "/avatars/camellya.png" },
  // { key: "carlotta",    name: "Carlotta",      avatar: "/avatars/carlotta.png" },
  // { key: "shorekeeper", name: "Shorekeeper",   avatar: "/avatars/shorekeeper.png" },
  // { key: "phoebe",      name: "Phoebe",        avatar: "/avatars/phoebe.png" },
  // { key: "roccia",      name: "Roccia",        avatar: "/avatars/roccia.png" },
  // { key: "cartethyia",  name: "Cartethyia",    avatar: "/avatars/cartethyia.png" },
  // { key: "ciaccona",    name: "Ciaccona",      avatar: "/avatars/ciaccona.png" },
  // { key: "zani",        name: "Zani",          avatar: "/avatars/zani.png" },
  // { key: "verina",      name: "Verina",        avatar: "/avatars/verina.png" },
  // { key: "encore",      name: "Encore",        avatar: "/avatars/encore.png" },
  // { key: "sanhua",      name: "Sanhua",        avatar: "/avatars/sanhua.png" },
  // { key: "danjin",      name: "Danjin",        avatar: "/avatars/danjin.png" },
  // { key: "lingyang",    name: "Lingyang",      avatar: "/avatars/lingyang.png" },
  // { key: "xiangli",     name: "Xiangli Yao",   avatar: "/avatars/xiangli.png" },
  // { key: "zhezhi",      name: "Zhezhi",        avatar: "/avatars/zhezhi.png" },
  // { key: "cantarella",  name: "Cantarella",    avatar: "/avatars/cantarella.png" },
  // { key: "lupa",        name: "Lupa",          avatar: "/avatars/lupa.png" },
  // { key: "phrolova",    name: "Phrolova",      avatar: "/avatars/phrolova.png" },
  // { key: "chisa",       name: "Chisa",         avatar: "/avatars/chisa.png" },
  // { key: "iuno",        name: "Iuno",          avatar: "/avatars/iuno.png" },
  // { key: "lynae",       name: "Lynae",         avatar: "/avatars/lynae.png" },
  // { key: "aemeath",     name: "Aemeath",       avatar: "/avatars/aemeath.png" },
];

const CHAT_CHARACTERS: Record<string, { name: string; element: string; color: string; avatar: string; title: string }> = {
  aemeath:  { name: "Aemeath",  element: "Fusion", color: "#e8702a", avatar: "/avatars/aemeath.png",  title: "Digital Ghost of Startorch" },
  phrolova: { name: "Phrolova", element: "Havoc",  color: "#9d6fdf", avatar: "/avatars/phrolova.png", title: "Former Overseer" },
};

type Message = { role: string; content: string; time?: string; imageUrl?: string; gifUrl?: string; stickerName?: string; gifCaption?: string };
function getTime() { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

function WavesLineLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="15" fill="#1a1c22" stroke="#c8a830" strokeWidth="1.5"/>
      <path d="M8 19 C10 13, 14 11, 16 16 C18 21, 22 19, 24 13" stroke="#c8a830" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <circle cx="16" cy="16" r="2.5" fill="#c8a830"/>
    </svg>
  );
}

function Avatar({ src, name, size = 36, color = "#888" }: { src: string; name: string; size?: number; color?: string }) {
  const [err, setErr] = useState(false);
  if (!err) return (
    <img src={src} alt={name} onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, objectFit: "cover", display: "block" }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: color,
      display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: size * 0.38, userSelect: "none" }}>
      {name[0]}
    </div>
  );
}

function CharacterPicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = ALL_CHARACTERS.find(c => c.key === value) ?? ALL_CHARACTERS[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: "#343638", border: `1px solid ${open ? "#c8a830" : "#3a3c42"}`, cursor: "pointer", textAlign: "left" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "1.5px solid #c8a83060" }}>
          <Avatar src={selected.avatar} name={selected.name} size={32} color="#c8a830" />
        </div>
        <span style={{ flex: 1, color: "#e8e8ee", fontSize: 13, fontWeight: 600 }}>{selected.name}</span>
        <span style={{ color: "#888a96", fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 100, background: "#2a2c30", border: "1px solid #3a3c42", borderRadius: 10, maxHeight: 220, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
          {ALL_CHARACTERS.map(c => (
            <button key={c.key} onClick={() => { onChange(c.key); setOpen(false); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: c.key === value ? "#3a3c42" : "none", border: "none", cursor: "pointer", textAlign: "left", borderLeft: c.key === value ? "3px solid #c8a830" : "3px solid transparent" }}
              onMouseEnter={e => { if (c.key !== value) e.currentTarget.style.background = "#323438"; }}
              onMouseLeave={e => { if (c.key !== value) e.currentTarget.style.background = "none"; }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
                <Avatar src={c.avatar} name={c.name} size={28} color="#c8a830" />
              </div>
              <span style={{ color: c.key === value ? "#e8e8ee" : "#b0b2be", fontSize: 12, fontWeight: c.key === value ? 700 : 400 }}>{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StickerImg({ name }: { name: string }) {
  const exts = ["png", "gif", "webp", "jpg"];
  const [extIdx, setExtIdx] = useState(0);
  if (extIdx >= exts.length) return null;
  return (
    <img
      src={`/stickers/${name}.${exts[extIdx]}`}
      alt="sticker"
      onError={() => setExtIdx(i => i + 1)}
      style={{ width: 90, height: 90, objectFit: "contain" }}
    />
  );
}

function AddContactModal({ existing, onAdd, onCancel }: { existing: string[]; onAdd: (k: string) => void; onCancel: () => void }) {
  const available = Object.keys(CHAT_CHARACTERS).filter(k => !existing.includes(k));
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)" }}>
      <div style={{ background: "#2a2c30", border: "1px solid #3a3c42", borderRadius: 14, padding: 18, width: 260, display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ color: "#e8e8ee", fontSize: 13, fontWeight: 600, margin: 0 }}>Add Contact</p>
        <p style={{ color: "#666870", fontSize: 11, margin: 0 }}>Choose a Resonator to chat with</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto" }}>
          {available.length === 0 && <p style={{ color: "#666870", fontSize: 11, textAlign: "center", padding: "12px 0" }}>All contacts added!</p>}
          {available.map(key => {
            const c = CHAT_CHARACTERS[key];
            return (
              <button key={key} onClick={() => onAdd(key)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: "#343638", border: "none", cursor: "pointer", textAlign: "left" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#3e4044")}
                onMouseLeave={e => (e.currentTarget.style.background = "#343638")}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", overflow: "hidden", background: "#1e2024", flexShrink: 0 }}>
                  <Avatar src={c.avatar} name={c.name} size={34} color={c.color} />
                </div>
                <div>
                  <p style={{ color: "#e8e8ee", fontSize: 12, fontWeight: 600, margin: 0 }}>{c.name}</p>
                  <p style={{ color: c.color, fontSize: 11, margin: 0 }}>{c.element}</p>
                </div>
              </button>
            );
          })}
        </div>
        <button onClick={onCancel} style={{ background: "#343638", border: "none", borderRadius: 10, padding: "7px 0", color: "#888a96", fontSize: 12, cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

export default function Home() {
  const [player, setPlayer] = useState<typeof ALL_CHARACTERS[0] | null>(null);
  const [selectedKey, setSelectedKey] = useState(ALL_CHARACTERS[0].key); // ← always valid
  const [contacts, setContacts] = useState<string[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [allMessages, setAllMessages] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [unread, setUnread] = useState<Record<string, boolean>>({});
  const [typingFor, setTypingFor] = useState<string | null>(null);
  const [toast, setToast] = useState<{key: string; name: string; preview: string} | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedImage, setAttachedImage] = useState<{url: string; name: string} | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaTab, setMediaTab] = useState<"stickers"|"gif">("stickers");
  const [gifSearch, setGifSearch] = useState("");
  const [gifCaption, setGifCaption] = useState("");
  const [gifResults, setGifResults] = useState<{url:string; preview:string}[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [stickers, setStickers] = useState<string[]>([]);
  const mediaPickerRef = useRef<HTMLDivElement>(null);
  const activeChatRef = useRef<string | null>(null);
  activeChatRef.current = activeChat;
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState<"sidebar"|"chat">("sidebar");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [allMessages, loading, activeChat]);

  useEffect(() => {
    fetch("/api/stickers").then(r => r.json()).then(d => setStickers(d.files ?? [])).catch(() => setStickers([]));
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (mediaPickerRef.current && !mediaPickerRef.current.contains(e.target as Node)) setShowMediaPicker(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const gifDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  async function searchGiphy(query: string) {
    if (!query.trim()) { setGifResults([]); return; }
    setGifLoading(true);
    try {
      const res = await fetch(`/api/giphy?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setGifResults(data.results ?? []);
    } catch { setGifResults([]); }
    setGifLoading(false);
  }
  function handleGifInput(val: string) {
    setGifSearch(val);
    if (gifDebounceRef.current) clearTimeout(gifDebounceRef.current);
    gifDebounceRef.current = setTimeout(() => searchGiphy(val), 500);
  }

  async function triggerAIReply(chatKey: string, messages: Message[]) {
    if (!player) return;
    setTypingFor(chatKey);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map(({ role, content, imageUrl, stickerName, gifUrl, gifCaption }) => ({ role, content, imageUrl, stickerName, gifUrl, gifCaption })),
          character: chatKey, playerName: player.name, playerKey: player.key,
        }),
      });
      const reply = await res.json();
      const aiMsg: Message = { role: "assistant", content: reply.content, time: getTime(), gifUrl: reply.gifUrl ?? undefined, stickerName: reply.stickerName ?? undefined };
      setAllMessages(prev => ({ ...prev, [chatKey]: [...(prev[chatKey] || []), aiMsg] }));
      if (activeChatRef.current !== chatKey) {
        setUnread(prev => ({ ...prev, [chatKey]: true }));
        const preview = reply.content ? (reply.content.length > 28 ? reply.content.slice(0, 28) + "…" : reply.content) : "New message";
        setToast({ key: chatKey, name: CHAT_CHARACTERS[chatKey]?.name || chatKey, preview });
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 4000);
      }
    } catch {
      setAllMessages(prev => ({ ...prev, [chatKey]: [...(prev[chatKey] || []), { role: "assistant", content: "signal lost.", time: getTime() }] }));
      if (activeChatRef.current !== chatKey) setUnread(prev => ({ ...prev, [chatKey]: true }));
    }
    setTypingFor(null);
    setLoading(false);
  }

  function sendSticker(filename: string) {
    if (!activeChat || !player) return;
    const chatKey = activeChat;
    const stickerMsg: Message = { role: "user", content: "", time: getTime(), stickerName: filename };
    const updated = [...(allMessages[chatKey] || []), stickerMsg];
    setAllMessages(prev => ({ ...prev, [chatKey]: updated }));
    setShowMediaPicker(false);
    triggerAIReply(chatKey, updated);
  }

  function sendGifFromPicker(gifUrl: string) {
    if (!activeChat || !player) return;
    const chatKey = activeChat;
    const gifMsg: Message = { role: "user", content: "", time: getTime(), gifUrl, gifCaption: gifCaption.trim() || undefined };
    const updated = [...(allMessages[chatKey] || []), gifMsg];
    setAllMessages(prev => ({ ...prev, [chatKey]: updated }));
    setGifCaption("");
    setShowMediaPicker(false);
    triggerAIReply(chatKey, updated);
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
    const newMsg: Message = { role: "user", content: input, time: getTime(), ...(attachedImage ? { imageUrl: attachedImage.url } : {}) };
    const current = [...(allMessages[chatKey] || []), newMsg];
    setAllMessages(prev => ({ ...prev, [chatKey]: current }));
    setInput("");
    setAttachedImage(null);
    triggerAIReply(chatKey, current);
  }

  const activeChar = activeChat ? CHAT_CHARACTERS[activeChat] : null;
  const activeMsgs = activeChat ? (allMessages[activeChat] || []) : [];
  const selectedChar = ALL_CHARACTERS.find(c => c.key === selectedKey) ?? ALL_CHARACTERS[0];

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  if (!player) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg,#c8cad0,#d4d6dc,#c0c2c8)", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
        <div style={{ background: "#2a2c30", border: "1px solid #3a3c42", borderRadius: 16, padding: 32, width: 320, display: "flex", flexDirection: "column", alignItems: "center", gap: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <WavesLineLogo size={28} />
            <span style={{ color: "#e8e8ee", fontSize: 15, fontWeight: 700, letterSpacing: "0.1em" }}>WavesLine</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", background: "#1e2024", border: "2px solid #c8a83060" }}>
              <Avatar src={selectedChar.avatar} name={selectedChar.name} size={72} color="#c8a830" />
            </div>
            <p style={{ color: "#e8e8ee", fontSize: 14, fontWeight: 600, margin: 0 }}>{selectedChar.name}</p>
          </div>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ color: "#666870", fontSize: 11, letterSpacing: "0.06em" }}>WHO ARE YOU?</label>
            <CharacterPicker value={selectedKey} onChange={setSelectedKey} />
          </div>
          <button onClick={() => setPlayer(selectedChar)}
            style={{ width: "100%", padding: "10px 0", borderRadius: 10, background: "#c8a830", border: "none", color: "#1a1a1a", fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#d4b840")}
            onMouseLeave={e => (e.currentTarget.style.background = "#c8a830")}>
            Open WavesLine →
          </button>
        </div>
        <p style={{ marginTop: 16, color: "rgba(255,255,255,0.15)", fontSize: 11 }}>Wuthering Waves · WavesLine</p>
      </div>
    );
  }

  // ── MAIN APP ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "center", background: isMobile ? "#dcdde2" : "linear-gradient(135deg,#c8cad0,#d4d6dc,#c0c2c8)", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      {showAddContact && <AddContactModal existing={contacts} onAdd={addContact} onCancel={() => setShowAddContact(false)} />}

      <div style={{ width: isMobile ? "100vw" : "min(820px, 100vw)", height: isMobile ? "100dvh" : "min(560px, 100vh)", borderRadius: isMobile ? 0 : "clamp(0px, 2vw, 14px)", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: isMobile ? "none" : "0 28px 72px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)" }}>

        {/* TOP BAR */}
        <div style={{ height: 44, background: "#222428", borderBottom: "1px solid #2e3034", display: "flex", alignItems: "center", padding: "0 14px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#1a1c20", borderRadius: 20, padding: "4px 12px 4px 6px", border: "1px solid #323438" }}>
            <WavesLineLogo size={22} />
            <span style={{ color: "#c8cad8", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em" }}>WavesLine</span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={() => setPlayer(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", opacity: 0.65 }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "0.65")}>
              <Avatar src={player.avatar} name={player.name} size={20} color="#c8a830" />
              <span style={{ color: "#8890a8", fontSize: 11 }}>{player.name}</span>
            </button>
            <div style={{ width: 1, height: 12, background: "#323438" }} />
            {(["⚙","!","✕"] as const).map((icon, i) => (
              <button key={i} style={{ background: "none", border: "none", cursor: "pointer", color: "#5a5c68", fontSize: 15, lineHeight: 1, padding: 0 }}
                onMouseEnter={e => (e.currentTarget.style.color = i === 2 ? "#e05050" : i === 1 ? "#c8a830" : "#c8cad8")}
                onMouseLeave={e => (e.currentTarget.style.color = "#5a5c68")}
                onClick={i === 2 ? () => setPlayer(null) : undefined}>
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* BODY */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>

          {/* SIDEBAR */}
          <div style={{ width: isMobile ? "100%" : "clamp(160px, 26vw, 210px)", background: "#26282c", display: isMobile && mobileView === "chat" ? "none" : "flex", flexDirection: "column", overflow: "hidden", borderRight: "1px solid #2e3034" }}>
            <button onClick={() => setShowAddContact(true)}
              style={{ margin: "8px 8px 4px", padding: "9px 12px", borderRadius: 10, background: "#323438", border: "1px dashed #46484e", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}
              onMouseEnter={e => (e.currentTarget.style.background = "#3a3c42")}
              onMouseLeave={e => (e.currentTarget.style.background = "#323438")}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#1e2024", display: "flex", alignItems: "center", justifyContent: "center", color: "#c8a830", fontSize: 18, flexShrink: 0, border: "1px solid #3a3c42" }}>+</div>
              <div style={{ width: 1.5, height: 28, background: "#c8a830", opacity: 0.5, flexShrink: 0 }} />
              <span style={{ color: "#c8a830", fontSize: 12, fontWeight: 500 }}>Add Contact</span>
            </button>

            <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px 8px" }}>
              {contacts.length === 0 && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 12px", gap: 6, opacity: 0.35 }}>
                  <span style={{ fontSize: 22 }}>💬</span>
                  <p style={{ color: "#888a96", fontSize: 11, textAlign: "center", lineHeight: 1.5, margin: 0 }}>No contacts yet.<br/>Add someone to chat!</p>
                </div>
              )}
              {contacts.map(key => {
                const c = CHAT_CHARACTERS[key];
                const isActive = activeChat === key;
                const isTyping = typingFor === key;
                const hasUnread = unread[key] === true;
                const msgs = allMessages[key] || [];
                const lastMsg = msgs[msgs.length - 1]?.content;
                const preview = isTyping ? "typing..." : lastMsg ? (lastMsg.length > 22 ? lastMsg.slice(0, 22) + "…" : lastMsg) : c.title;
                return (
                  <button key={key} onClick={() => openChat(key)}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 0, padding: 0, marginBottom: 5, borderRadius: 10, background: isActive ? "linear-gradient(90deg, #f0ede4, #e8e4d8)" : "#323438", border: "none", cursor: "pointer", textAlign: "left", overflow: "hidden", boxShadow: isActive ? "0 2px 10px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.2)" }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#3a3c42"; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "#323438"; }}>
                    {isActive && <div style={{ width: 3, alignSelf: "stretch", background: "#c8a830", flexShrink: 0 }} />}
                    <div style={{ position: "relative", flexShrink: 0, padding: "9px 10px" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", background: "#1e2024", border: `1.5px solid ${isActive ? "#c8a83040" : "#3a3c42"}` }}>
                        <Avatar src={c.avatar} name={c.name} size={36} color={c.color} />
                      </div>
                      {(isTyping || hasUnread) && (
                        <div style={{ position: "absolute", top: 7, right: 7, width: 9, height: 9, borderRadius: "50%", background: isTyping ? "#c8a830" : "#e04040", border: `2px solid ${isActive ? "#e8e4d8" : "#323438"}`, animation: isTyping ? "pulse 1s infinite" : "none" }} />
                      )}
                    </div>
                    <div style={{ width: 1.5, height: 28, background: isActive ? "#c8a830" : "#46484e", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0, padding: "0 10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <p style={{ color: isActive ? "#1a1c20" : "#c8cad8", fontSize: 12, fontWeight: hasUnread ? 800 : 700, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{c.name}</p>
                        {hasUnread && !isActive && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#e04040", flexShrink: 0 }} />}
                      </div>
                      <p style={{ color: isTyping ? "#c8a830" : hasUnread ? "#c8cad8" : isActive ? "#6a6860" : "#606268", fontSize: 10, margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontStyle: isTyping ? "italic" : "normal", fontWeight: hasUnread ? 600 : 400 }}>
                        {c.element} · {preview}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {toast && (
              <button onClick={() => { openChat(toast.key); setToast(null); }}
                style={{ margin: "0 8px 8px", padding: "10px 14px", borderRadius: 10, background: "linear-gradient(90deg, #1a1c20, #252830)", border: "1px solid #3a3c42", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, textAlign: "left", boxShadow: "0 4px 16px rgba(0,0,0,0.4)", animation: "slideUp 0.3s ease" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", border: "1.5px solid #c8a830", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "#c8a830", fontSize: 11 }}>✓</span>
                </div>
                <div style={{ width: 1.5, height: 22, background: "#c8a830", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "#e8e8ee", fontSize: 11, fontWeight: 700, margin: 0 }}>{toast.name}</p>
                  <p style={{ color: "#888a96", fontSize: 10, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{toast.preview}</p>
                </div>
              </button>
            )}
          </div>

          {/* CHAT PANEL */}
          <div style={{ flex: 1, display: isMobile && mobileView === "sidebar" ? "none" : "flex", flexDirection: "column", background: "#dcdde2", overflow: "hidden" }}>
            {!activeChat && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, opacity: 0.4 }}>
                <WavesLineLogo size={48} />
                <p style={{ color: "#5a5c68", fontSize: 13, margin: 0 }}>Select a contact to start chatting</p>
              </div>
            )}

            {activeChat && activeChar && (
              <>
                {/* Chat header */}
                <div style={{ height: 44, background: "#d4d5da", borderBottom: "1px solid #c4c5cc", display: "flex", alignItems: "center", padding: "0 12px 0 8px", flexShrink: 0, gap: 8 }}>
                  {isMobile && (
                    <button onClick={() => setMobileView("sidebar")} style={{ background: "none", border: "none", cursor: "pointer", color: "#5a5c68", fontSize: 20, lineHeight: 1, padding: "0 4px", flexShrink: 0 }}>‹</button>
                  )}
                  <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
                    <Avatar src={activeChar.avatar} name={activeChar.name} size={28} color={activeChar.color} />
                  </div>
                  <span style={{ color: "#1a1c28", fontSize: 14, fontWeight: 700 }}>{activeChar.name}</span>
                  <span style={{ color: activeChar.color, fontSize: 11 }}>· {activeChar.element}</span>
                  {typingFor === activeChat && <span style={{ color: "#9a9ca8", fontSize: 11, fontStyle: "italic", marginLeft: 4 }}>typing...</span>}
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column" }}>
                  {activeMsgs.length === 0 && (
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                      <span style={{ background: "rgba(0,0,0,0.07)", color: "#7a7c8a", fontSize: 11, padding: "3px 14px", borderRadius: 20 }}>
                        ▲ You are now friends with {activeChar.name}
                      </span>
                    </div>
                  )}
                  {activeMsgs.map((m, i) => {
                    if (m.role === "assistant" && !m.content && !m.gifUrl && !m.stickerName) return null;
                    const isUser = m.role === "user";
                    const name = isUser ? player.name : activeChar.name;
                    const avatar = isUser ? player.avatar : activeChar.avatar;
                    const color = isUser ? "#6ab0f5" : activeChar.color;
                    const prevMsg = activeMsgs[i - 1];
                    const nextMsg = activeMsgs[i + 1];
                    const showLabel = !prevMsg || prevMsg.role !== m.role;
                    const isLastInGroup = !nextMsg || nextMsg.role !== m.role;
                    return (
                      <div key={i} style={{ marginBottom: 6 }}>
                        {showLabel && (
                          <p style={{ fontSize: 11, color: "#9098b8", fontWeight: 500, margin: "0 0 3px", textAlign: isUser ? "right" : "left", paddingRight: isUser ? 42 : 0, paddingLeft: isUser ? 0 : 44 }}>{name}</p>
                        )}
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flexDirection: isUser ? "row-reverse" : "row" }}>
                          {isLastInGroup ? (
                            <div style={{ width: 30, height: 30, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
                              <Avatar src={avatar} name={name} size={30} color={color} />
                            </div>
                          ) : <div style={{ width: 30, flexShrink: 0 }} />}
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: isUser ? "flex-end" : "flex-start", maxWidth: "60%" }}>
                            {m.gifUrl && (
                              <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.15)", maxWidth: 220 }}>
                                {m.gifUrl.includes(".mp4") ? (
                                  <video src={m.gifUrl} autoPlay loop muted playsInline style={{ display: "block", width: "100%", maxHeight: 180, objectFit: "cover" }} />
                                ) : (
                                  <img src={m.gifUrl} alt="gif" style={{ display: "block", width: "100%", maxHeight: 180, objectFit: "cover" }} />
                                )}
                              </div>
                            )}
                            {m.stickerName && <StickerImg name={m.stickerName} />}
                            {(m.content || m.imageUrl) && (
                              <div style={{ padding: m.imageUrl && !m.content ? "4px" : "8px 12px", fontSize: 13, lineHeight: 1.5, color: isUser ? "#ffffff" : "#1a1c28", background: isUser ? "#1e2035" : "#ffffff", borderRadius: isUser ? "13px 13px 3px 13px" : "3px 13px 13px 13px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
                                {m.imageUrl && <img src={m.imageUrl} alt="attachment" style={{ display: "block", maxWidth: 220, maxHeight: 180, borderRadius: 8, marginBottom: m.content ? 6 : 0, objectFit: "cover" }} />}
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
                      <p style={{ fontSize: 11, color: "#9098b8", fontWeight: 500, margin: "0 0 3px", paddingLeft: 44 }}>{activeChar.name}</p>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
                          <Avatar src={activeChar.avatar} name={activeChar.name} size={30} color={activeChar.color} />
                        </div>
                        <div style={{ padding: "9px 13px", background: "#fff", borderRadius: "3px 13px 13px 13px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", display: "flex", gap: 4, alignItems: "center" }}>
                          {[0,1,2].map(j => <div key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: "#c0c2ce", animation: "bounce 1.2s infinite", animationDelay: `${j * 0.18}s` }} />)}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input bar */}
                <div style={{ background: "#d0d1d8", borderTop: "1px solid #c4c5cc", padding: "8px 14px", display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                  {attachedImage && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px", background: "#c8c9d0", borderRadius: 8 }}>
                      <img src={attachedImage.url} alt="preview" style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                      <span style={{ flex: 1, color: "#4a4c58", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{attachedImage.name}</span>
                      <button onClick={() => setAttachedImage(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#888a96", fontSize: 16, lineHeight: 1, padding: "0 2px" }}>✕</button>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input ref={fileInputRef} type="file" accept="image/*,.gif" style={{ display: "none" }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => setAttachedImage({ url: ev.target?.result as string, name: file.name });
                        reader.readAsDataURL(file);
                        e.target.value = "";
                      }} />

                    {/* Media picker */}
                    <div ref={mediaPickerRef} style={{ position: "relative", flexShrink: 0 }}>
                      <button onClick={() => setShowMediaPicker(o => !o)} disabled={loading}
                        style={{ width: 32, height: 32, borderRadius: "50%", background: showMediaPicker ? activeChar.color + "33" : "#c4c5cc", border: `1.5px solid ${showMediaPicker ? activeChar.color : "transparent"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", fontSize: 16 }}>
                        🎭
                      </button>
                      {showMediaPicker && (
                        <div style={{ position: "absolute", bottom: "calc(100% + 10px)", left: 0, width: "min(300px, 80vw)", height: 280, background: "#2a2c30", border: "1px solid #3a3c42", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", overflow: "hidden", animation: "slideUp 0.2s ease", zIndex: 100 }}>
                          {/* Tabs */}
                          <div style={{ display: "flex", borderBottom: "1px solid #3a3c42", flexShrink: 0 }}>
                            {(["stickers","gif"] as const).map(tab => (
                              <button key={tab} onClick={() => setMediaTab(tab)}
                                style={{ flex: 1, padding: "9px 0", background: "none", border: "none", cursor: "pointer", color: mediaTab === tab ? "#e8e8ee" : "#666870", fontSize: 12, fontWeight: mediaTab === tab ? 700 : 400, borderBottom: mediaTab === tab ? `2px solid ${activeChar.color}` : "2px solid transparent" }}>
                                {tab === "stickers" ? "🎴 Stickers" : "🎞 GIF"}
                              </button>
                            ))}
                          </div>
                          {/* Stickers */}
                          {mediaTab === "stickers" && (
                            <div style={{ flex: 1, overflowY: "auto", padding: 10, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                              {stickers.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", color: "#666870", fontSize: 11, padding: "20px 0" }}>Add .png/.gif files to<br/>/public/stickers/</div>}
                              {stickers.map(file => {
                                const name = file.replace(/\.(png|gif|webp)$/i, "");
                                return (
                                  <button key={file} onClick={() => sendSticker(name)}
                                    style={{ background: "#323438", border: "1px solid #3a3c42", borderRadius: 8, padding: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", aspectRatio: "1" }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "#3e4044")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "#323438")}>
                                    <img src={`/stickers/${file}`} alt={name} style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={e => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {/* GIF */}
                          {mediaTab === "gif" && (
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                              <div style={{ padding: "8px 10px 4px", flexShrink: 0 }}>
                                <input
                                  style={{ width: "100%", background: "#323438", border: "1px solid #3a3c42", borderRadius: 8, padding: "6px 10px", color: "#e8e8ee", fontSize: 12, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                                  placeholder="Search GIFs..."
                                  value={gifSearch}
                                  onChange={e => handleGifInput(e.target.value)}
                                />
                              </div>
                              <div style={{ padding: "0 10px 6px", flexShrink: 0 }}>
                                <input
                                  style={{ width: "100%", background: "#323438", border: `1px solid ${gifCaption.trim() ? "#c8a830" : "#3a3c42"}`, borderRadius: 8, padding: "5px 10px", color: "#e8e8ee", fontSize: 11, outline: "none", fontFamily: "inherit", boxSizing: "border-box", transition: "border 0.15s" }}
                                  placeholder="Describe your GIF..."
                                  value={gifCaption}
                                  onChange={e => setGifCaption(e.target.value)}
                                />
                                {!gifCaption.trim() && <p style={{ color: "#e04040", fontSize: 10, margin: "3px 0 0 2px" }}>Required — describe so the character can react</p>}
                              </div>
                              <div style={{ flex: 1, overflowY: "auto", padding: "0 10px 10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, gridAutoRows: "100px" }}>
                                {gifLoading && <div style={{ gridColumn: "1/-1", textAlign: "center", color: "#666870", fontSize: 11, padding: "20px 0" }}>Searching...</div>}
                                {!gifLoading && gifResults.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", color: "#666870", fontSize: 11, padding: "20px 0" }}>Search for a GIF above</div>}
                                {gifResults.map((g, i) => (
                                  <button key={i} onClick={() => { if (!gifCaption.trim()) return; sendGifFromPicker(g.url); }}
                                    style={{ background: "#323438", border: `1px solid ${gifCaption.trim() ? "#3a3c42" : "#222"}`, borderRadius: 8, padding: 0, cursor: gifCaption.trim() ? "pointer" : "not-allowed", overflow: "hidden", height: "100px", opacity: gifCaption.trim() ? 1 : 0.4 }}>
                                    <img src={g.preview} alt="gif" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Attach image */}
                    <button onClick={() => fileInputRef.current?.click()} disabled={loading}
                      style={{ width: 32, height: 32, borderRadius: "50%", background: attachedImage ? activeChar.color + "33" : "#c4c5cc", border: `1.5px solid ${attachedImage ? activeChar.color : "transparent"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke={attachedImage ? activeChar.color : "#7a7c8a"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>

                    {/* Text input */}
                    <div style={{ flex: 1, background: "#f0f0f4", borderRadius: 20, padding: "7px 14px", display: "flex", alignItems: "center", border: "1px solid #c0c2cc" }}>
                      <input
                        style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: "#1a1c28", fontFamily: "inherit" }}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && sendMessage()}
                        placeholder={attachedImage ? "Add a caption..." : `Message ${activeChar.name}...`}
                        disabled={loading}
                      />
                    </div>

                    {/* Send button */}
                    <button onClick={sendMessage} disabled={loading || (!input.trim() && !attachedImage)}
                      style={{ width: 34, height: 34, borderRadius: "50%", background: (input.trim() || attachedImage) ? activeChar.color : "#b0b2be", border: "none", cursor: (input.trim() || attachedImage) ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s", flexShrink: 0 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.2);border-radius:3px}
      `}</style>
    </div>
  );
}