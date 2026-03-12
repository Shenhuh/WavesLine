// app/components/ListenTogether.tsx
"use client";
import { useState, useEffect, useRef, useCallback } from "react";

type VideoResult = { id: string; title: string; channel: string; thumbnail: string };
type TranscriptEntry = { text: string; offset: number };
type LTMessage = { role: "user" | "assistant" | "system"; content: string; time: string };

function getTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

interface Props {
  characterKey: string;
  characterName: string;
  characterColor: string;
  characterAvatar: string;
  playerName: string;
  playerKey: string;
  playerAvatar: string;
  onClose: () => void;
  onBlock: (message: string) => void;
}

export default function ListenTogether({
  characterKey, characterName, characterColor,
  characterAvatar, playerName, playerKey, playerAvatar, onClose, onBlock
}: Props) {
  const [phase, setPhase] = useState<"search" | "waiting" | "playing">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VideoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoResult | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[] | null>(null);
  const [messages, setMessages] = useState<LTMessage[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [reactingNow, setReactingNow] = useState(false);
  const [input, setInput] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const playerRef = useRef<any>(null);
  const periodicRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeTrackerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const usedTranscriptOffsets = useRef<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reactionLockRef = useRef(false);
  const inviteLockRef = useRef(false);
  const annoyanceRef = useRef(0);
  const blockingRef = useRef(false);

  // Detect mobile properly with useEffect
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Load YouTube IFrame API
  useEffect(() => {
    if ((window as any).YT?.Player) return;
    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) return;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    (window as any).onYouTubeIframeAPIReady = () => {};
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = useCallback((msg: LTMessage) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  // ── SEARCH ─────────────────────────────────────────────────────────────
  async function search() {
    if (!query.trim() || searching) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/youtube?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch { setResults([]); }
    setSearching(false);
  }

  // ── SELECT VIDEO ───────────────────────────────────────────────────────
  async function selectVideo(video: VideoResult) {
    if (inviteLockRef.current) return;
    inviteLockRef.current = true;
    setSelectedVideo(video);
    setPhase("waiting");
    setResults([]);
    addMessage({ role: "system", content: `You invited ${characterName} to listen to "${video.title}"`, time: getTime() });

    fetch(`/api/transcript?id=${video.id}`)
      .then(r => r.json())
      .then(d => setTranscript(d.transcript ?? null))
      .catch(() => {});

    await new Promise(r => setTimeout(r, 1000 + Math.random() * 800));
    const accepted = Math.random() < 0.70;
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `[Listen Together invite]: ${playerName} wants to listen to "${video.title}" by ${video.channel} together on WavesLine. ${accepted ? "Accept briefly in character." : "Decline briefly in character."}` }],
          character: characterKey, playerName, playerKey,
          listenTogetherInvite: true, listenAccepted: accepted,
        }),
      });
      const reply = await res.json();
      const text = reply.messages?.[0]?.content ?? reply.content ?? "";
      if (text) addMessage({ role: "assistant", content: text, time: getTime() });
    } catch {}

    if (accepted) {
      await new Promise(r => setTimeout(r, 500));
      addMessage({ role: "system", content: `${characterName} joined. Now playing.`, time: getTime() });
      startPlaying(video);
    } else {
      setPhase("search");
      setSelectedVideo(null);
      inviteLockRef.current = false;
    }
  }

  // ── START PLAYING ──────────────────────────────────────────────────────
  function startPlaying(video: VideoResult) {
    setPhase("playing");

    const tryInit = (attempts = 0) => {
      if ((window as any).YT?.Player) {
        playerRef.current = new (window as any).YT.Player("yt-player", {
          videoId: video.id,
          playerVars: {
            autoplay: 1,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,   // CRITICAL for iOS
            fs: 0,
          },
          events: { onStateChange: (e: any) => { if (e.data === 0) handleVideoEnd(); } },
        });
      } else if (attempts < 20) {
        setTimeout(() => tryInit(attempts + 1), 300);
      }
    };
    setTimeout(() => tryInit(), 800);

    timeTrackerRef.current = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        setCurrentTime(Math.floor(playerRef.current.getCurrentTime()));
      }
    }, 1000);

    // React every 5-15 seconds randomly
    const scheduleNext = () => {
        const delay = 15000 + Math.random() * 5000;  // 15-20 seconds (15000-20000 ms)
        periodicRef.current = setTimeout(() => {
            triggerReaction("periodic");
            scheduleNext();
        }, delay) as any;
    };
    scheduleNext();
  }

  // ── TRANSCRIPT REACTIONS ───────────────────────────────────────────────
  useEffect(() => {
    if (!transcript || phase !== "playing") return;
    const nearby = transcript.find(t =>
      Math.abs(t.offset - currentTime) <= 3 &&
      !usedTranscriptOffsets.current.has(t.offset) &&
      t.text.length > 20
    );
    if (nearby && !reactionLockRef.current) {
      usedTranscriptOffsets.current.add(nearby.offset);
      triggerReaction("transcript", nearby.text);
    }
  }, [currentTime]);

  // ── TRIGGER REACTION ───────────────────────────────────────────────────
  async function triggerReaction(type: "periodic" | "transcript", transcriptLine?: string) {
    if (reactionLockRef.current || blockingRef.current) return;
    reactionLockRef.current = true;
    setReactingNow(true);
    const videoTitle = selectedVideo?.title ?? "this video";
    const timeStr = currentTime > 0 ? ` (currently at ${Math.floor(currentTime/60)}:${String(currentTime%60).padStart(2,"0")})` : "";
    const prompt = type === "transcript" && transcriptLine
      ? `[Listen Together on WavesLine — watching "${videoTitle}"${timeStr}. The video just said or showed: "${transcriptLine}". Briefly react to this specific moment in character — comment on what was said, analyze it, or express how it makes you feel. 1-2 sentences, natural, no need to explain the context.]`
      : `[Listen Together on WavesLine — watching "${videoTitle}"${timeStr}. Say something brief about the video right now — analyze what's happening, comment on the visuals, lyrics, mood, or anything that catches your attention. Stay in character. 1-2 sentences max.]`;
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages.filter(m => m.role !== "system").slice(-6).map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: prompt }
          ],
          character: characterKey, playerName, playerKey,
        }),
      });
      const reply = await res.json();
      const text = reply.messages?.[0]?.content ?? reply.content ?? "";
      if (text) addMessage({ role: "assistant", content: text, time: getTime() });
    } catch {}
    await new Promise(r => setTimeout(r, 3000));
    reactionLockRef.current = false;
    setReactingNow(false);
  }

  function handleVideoEnd() {
    if (periodicRef.current) clearTimeout(periodicRef.current);
    if (timeTrackerRef.current) clearInterval(timeTrackerRef.current);
    addMessage({ role: "system", content: "Video ended.", time: getTime() });
    triggerReaction("periodic");
  }

  // ── USER SENDS MESSAGE ─────────────────────────────────────────────────
  async function sendMessage() {
    if (!input.trim() || blockingRef.current) return;
    const text = input.trim();
    setInput("");
    addMessage({ role: "user", content: text, time: getTime() });
    const videoTitle = selectedVideo?.title ?? "this video";
    const timeStr = currentTime > 0 ? ` at ${Math.floor(currentTime/60)}:${String(currentTime%60).padStart(2,"0")}` : "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages.filter(m => m.role !== "system").slice(-8).map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: `[Listen Together on WavesLine — watching "${videoTitle}"${timeStr}] ${text}` }
          ],
          character: characterKey, playerName, playerKey,
        }),
      });
      const reply = await res.json();

      // Annoyance check
      if (reply.annoyanceDelta && !blockingRef.current) {
        annoyanceRef.current = Math.min(100, Math.max(0, annoyanceRef.current + reply.annoyanceDelta));
        if (annoyanceRef.current >= 75) {
          blockingRef.current = true;
          const replyMsgs = reply.messages ?? [{ content: reply.content }];
          for (let i = 0; i < replyMsgs.length; i++) {
            if (i > 0) await new Promise(r => setTimeout(r, 500));
            const m = replyMsgs[i];
            if (m.content) addMessage({ role: "assistant", content: m.content, time: getTime() });
          }
          await new Promise(r => setTimeout(r, 800));
          addMessage({ role: "system", content: `${characterName} has left the session.`, time: getTime() });
          await new Promise(r => setTimeout(r, 1000));
          onBlock("I have tolerated enough. Do not contact me again.");
          return;
        }
      }

      const replyMsgs = reply.messages ?? [{ content: reply.content }];
      for (let i = 0; i < replyMsgs.length; i++) {
        if (i > 0) await new Promise(r => setTimeout(r, 500));
        const m = replyMsgs[i];
        if (m.content) addMessage({ role: "assistant", content: m.content, time: getTime() });
      }
    } catch {}
  }

  useEffect(() => {
    return () => {
      if (periodicRef.current) clearTimeout(periodicRef.current);
      if (timeTrackerRef.current) clearInterval(timeTrackerRef.current);
      if (playerRef.current?.destroy) playerRef.current.destroy();
    };
  }, []);

  // ── SHARED CHAT MESSAGES ───────────────────────────────────────────────
  const chatMessages = (
    <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
      {messages.length === 0 && (
        <p style={{ color: "#555", fontSize: 12, textAlign: "center", marginTop: 16 }}>
          Invite {characterName} to listen together
        </p>
      )}
      {messages.map((m, i) => {
        if (m.role === "system") return (
          <div key={i} style={{ textAlign: "center", padding: "2px 0" }}>
            <span style={{ fontSize: 11, color: "#555", fontStyle: "italic" }}>{m.content}</span>
          </div>
        );
        const isUser = m.role === "user";
        return (
          <div key={i} style={{ display: "flex", flexDirection: isUser ? "row-reverse" : "row", gap: 6, alignItems: "flex-end" }}>
            <img src={isUser ? playerAvatar : characterAvatar} alt=""
              style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
            <div style={{
              maxWidth: "78%", padding: "7px 11px", borderRadius: 10,
              fontSize: 12, lineHeight: 1.5,
              background: isUser ? "#1e2028" : "#fff",
              color: isUser ? "#d8daee" : "#1e2030",
            }}>
              {m.content}
            </div>
          </div>
        );
      })}
      {reactingNow && (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <img src={characterAvatar} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />
          <div style={{ background: "#fff", borderRadius: 10, padding: "7px 11px", display: "flex", gap: 3 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#bbb", animation: `ltbounce 1s ${i*0.2}s infinite` }} />
            ))}
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );

  // ── CHAT INPUT ─────────────────────────────────────────────────────────
  const chatInput = (
    <div style={{ padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 8, background: "#1a1b24", flexShrink: 0 }}>
      <input value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === "Enter" && sendMessage()}
        placeholder={phase === "playing" ? "React to the video..." : "..."}
        disabled={phase !== "playing"}
        style={{ flex: 1, background: "#22232e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "7px 12px", color: "#e8e8ee", fontSize: 12, outline: "none", fontFamily: "inherit", opacity: phase !== "playing" ? 0.4 : 1 }} />
      <button onClick={sendMessage} disabled={phase !== "playing" || !input.trim()}
        style={{ width: 30, height: 30, borderRadius: 8, background: input.trim() && phase === "playing" ? characterColor : "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );

  // ── SEARCH PANEL ───────────────────────────────────────────────────────
  const searchPanel = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 14, gap: 10, overflow: "hidden" }}>
      <p style={{ color: "#888", fontSize: 12, margin: 0 }}>Search for a video to listen to together</p>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search()}
          placeholder="Search YouTube..."
          style={{ flex: 1, background: "#22232e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#e8e8ee", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
        <button onClick={search} disabled={searching}
          style={{ padding: "8px 14px", borderRadius: 8, background: characterColor, border: "none", color: "white", fontSize: 13, cursor: "pointer", opacity: searching ? 0.6 : 1, flexShrink: 0 }}>
          {searching ? "..." : "Search"}
        </button>
      </div>
      {phase === "waiting" && selectedVideo && (
        <div style={{ background: "#22232e", borderRadius: 8, padding: 10, display: "flex", alignItems: "center", gap: 10 }}>
          <img src={selectedVideo.thumbnail} alt="" style={{ width: 60, height: 45, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
          <div>
            <p style={{ color: "#e8e8ee", fontSize: 12, margin: 0, fontWeight: 600 }}>{selectedVideo.title}</p>
            <p style={{ color: "#888", fontSize: 11, margin: "2px 0 0" }}>Waiting for {characterName}...</p>
          </div>
        </div>
      )}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {results.map(v => (
          <button key={v.id} onClick={() => selectVideo(v)} disabled={phase === "waiting"}
            style={{ display: "flex", gap: 10, alignItems: "center", background: "#22232e", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 10, cursor: "pointer", textAlign: "left", width: "100%", opacity: phase === "waiting" ? 0.5 : 1 }}>
            <img src={v.thumbnail} alt="" style={{ width: 80, height: 54, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
            <div style={{ overflow: "hidden" }}>
              <p style={{ color: "#e8e8ee", fontSize: 12, margin: 0, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.title}</p>
              <p style={{ color: "#888", fontSize: 11, margin: "3px 0 0" }}>{v.channel}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ── RENDER ─────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? 0 : 16 }}>
      <div style={{
        width: isMobile ? "100%" : "min(960px, 95vw)",
        height: isMobile ? "100%" : "min(620px, 92vh)",
        background: "#1a1b24",
        borderRadius: isMobile ? 0 : 16,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
      }}>

        {/* ── HEADER ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#13141c", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M9 18V5l12-2v13" stroke={characterColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="6" cy="18" r="3" stroke={characterColor} strokeWidth="2"/>
              <circle cx="18" cy="16" r="3" stroke={characterColor} strokeWidth="2"/>
            </svg>
            <span style={{ color: "#e8e8ee", fontSize: 13, fontWeight: 600 }}>Listen Together</span>
            <span style={{ color: "#555", fontSize: 11 }}>with {characterName}</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>

        {/* ── MOBILE LAYOUT: video top, chat bottom ── */}
        {isMobile ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
            {phase === "playing" ? (
              <>
                {/* Video — fixed height on mobile */}
                <div style={{ flexShrink: 0, background: "#000", position: "relative" }}>
                  <div id="yt-player" style={{ width: "100%", height: 220 }} />
                  {selectedVideo && (
                    <div style={{ padding: "6px 12px", background: "#13141c" }}>
                      <p style={{ color: "#e8e8ee", fontSize: 11, margin: 0, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedVideo.title}</p>
                    </div>
                  )}
                </div>
                {/* Chat fills remaining space */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
                  {chatMessages}
                  {chatInput}
                </div>
              </>
            ) : (
              // Search on mobile
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {searchPanel}
                <div style={{ flexShrink: 0 }}>
                  {chatInput}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── DESKTOP LAYOUT: side by side ── */
          <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
            {/* Left: video or search */}
            <div style={{ flex: "0 0 56%", borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", minHeight: 0 }}>
              {phase === "playing" ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                  <div style={{ flex: 1, background: "#000", minHeight: 0 }}>
                    <div id="yt-player" style={{ width: "100%", height: "100%" }} />
                  </div>
                  {selectedVideo && (
                    <div style={{ padding: "8px 14px", background: "#13141c", flexShrink: 0 }}>
                      <p style={{ color: "#e8e8ee", fontSize: 12, margin: 0, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedVideo.title}</p>
                      <p style={{ color: "#666", fontSize: 11, margin: "2px 0 0" }}>{selectedVideo.channel}</p>
                    </div>
                  )}
                </div>
              ) : searchPanel}
            </div>
            {/* Right: chat */}
            <div style={{ flex: "0 0 44%", display: "flex", flexDirection: "column", minHeight: 0 }}>
              {chatMessages}
              {chatInput}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes ltbounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
      `}</style>
    </div>
  );
}