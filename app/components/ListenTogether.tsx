// app/components/ListenTogether.tsx
"use client";
import { useState, useEffect, useRef, useCallback } from "react";

type VideoResult = { id: string; title: string; channel: string; thumbnail: string };
type TranscriptEntry = { text: string; offset: number };
type LTMessage = { role: "user" | "assistant" | "system"; content: string; time: string };

function getTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Decode HTML entities from YouTube API titles (e.g. &quot; → ")
function decodeHtml(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
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
  onDecline: () => void;
  onSessionUpdate?: (event: SessionEvent) => void;
  // Shared message history with main chat
  sharedMessages: { role: string; content: string; time?: string }[];
  onAddMessage: (msg: { role: "user" | "assistant" | "system"; content: string; time: string }) => void;
  
  // New props for direct video loading from invite
  initialVideoId?: string | null;
  initialVideoTitle?: string | null;
  initialVideoChannel?: string | null;
}

export type SessionEvent =
  | { type: "video_started"; title: string; channel: string }
  | { type: "video_ended"; title: string }
  | { type: "reaction"; text: string }
  | { type: "session_ended" };

// All possible reaction angles — cycle through these to force variety
const REACTION_ANGLES = [
  { key: "visual_character", prompt: "Describe exactly what the character on screen looks like right now — their hair, outfit, expression, or pose. Be specific, not vague." },
  { key: "visual_background", prompt: "Describe the background, setting, or environment visible in the video right now. Colors, lighting, what's in the scene." },
  { key: "visual_effects", prompt: "What visual effects, particles, or motion graphics are happening on screen? How do they make you feel?" },
  { key: "music_melody", prompt: "Comment on the melody or instrumentation of the music right now. What instruments? What's the mood of this specific moment?" },
  { key: "music_rhythm", prompt: "Comment on the rhythm, tempo, or beat of the music. Is it building, dropping, steady? What does the rhythm do to you?" },
  { key: "lyrics_line", prompt: "React to a specific lyric or vocal moment happening right now. What does it mean to you?" },
  { key: "emotion_evoked", prompt: "What emotion is this moment pulling out of you? Be specific — not just 'sad' but what KIND of sad, what memory or feeling." },
  { key: "color_palette", prompt: "Comment on the color palette on screen right now. What colors dominate? What do they remind you of?" },
  { key: "story_moment", prompt: "What's happening narratively or visually in the video at this moment? What story is being told?" },
  { key: "personal_connection", prompt: "Does this moment remind you of something from your past or your world? Make a personal, in-character connection." },
  { key: "contrast_observation", prompt: "What contrast or tension do you notice — between the visuals and music, or between two elements on screen?" },
  { key: "detail_focus", prompt: "Pick one tiny detail you notice — something most people would miss. A small thing in the frame or the sound." },
];

export default function ListenTogether({
  characterKey, characterName, characterColor,
  characterAvatar, playerName, playerKey, playerAvatar,
  onClose, onBlock, onDecline, onSessionUpdate,
  sharedMessages, onAddMessage,
  initialVideoId, initialVideoTitle, initialVideoChannel,
}: Props) {
  const [phase, setPhase] = useState<"search" | "waiting" | "playing" | "ended">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VideoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoResult | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[] | null>(null);
  const [reactingNow, setReactingNow] = useState(false);
  const [input, setInput] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [ltCooldown, setLtCooldown] = useState(false);
  const [ltStickers, setLtStickers] = useState<string[]>([]);
  const [ltShowStickers, setLtShowStickers] = useState(false);
  const [ltAttachedImage, setLtAttachedImage] = useState<string | null>(null);
  const ltFileInputRef = useRef<HTMLInputElement>(null);
  const ltStickerPickerRef = useRef<HTMLDivElement>(null);

  const playerRef = useRef<any>(null);
  const periodicRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeTrackerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const usedTranscriptOffsets = useRef<Set<number>>(new Set());
  const transcriptRef = useRef<string>(""); // full transcript text, injected into system prompt
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reactionLockRef = useRef(false);
  const inviteLockRef = useRef(false);
  const annoyanceRef = useRef(0);
  const blockingRef = useRef(false);

  // Refs to avoid stale closures in timers
  const currentTimeRef = useRef(0);
  // messagesRef mirrors sharedMessages so timer callbacks always read fresh values
  const messagesRef = useRef<{ role: string; content: string; time?: string }[]>([]);
  const selectedVideoRef = useRef<VideoResult | null>(null);

  // Keep messagesRef in sync with shared messages from parent
  useEffect(() => { messagesRef.current = sharedMessages; }, [sharedMessages]);

  // addMessage writes to parent — keeps one unified history
  const addMessage = useCallback((msg: { role: "user" | "assistant" | "system"; content: string; time: string }) => {
    onAddMessage(msg);
    messagesRef.current = [...messagesRef.current, msg];
  }, [onAddMessage]);

  // Track which reaction angles have been used (cycle through all before repeating)
  const usedAnglesRef = useRef<Set<string>>(new Set());

  // Track last N reaction texts for semantic dedup
  const reactionHistoryRef = useRef<string[]>([]);

  // Auto-select video from initial props
  useEffect(() => {
    if (initialVideoId && initialVideoTitle && initialVideoChannel) {
      console.log('Auto-selecting video from invite:', { initialVideoId, initialVideoTitle, initialVideoChannel });
      const video = {
        id: initialVideoId,
        title: initialVideoTitle,
        channel: initialVideoChannel,
        thumbnail: `https://img.youtube.com/vi/${initialVideoId}/mqdefault.jpg`
      };
      
      // Small delay to ensure component is ready
      setTimeout(() => {
        selectVideo(video);
      }, 100);
    }
  }, [initialVideoId, initialVideoTitle, initialVideoChannel]);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Fetch stickers for LT picker
  useEffect(() => {
    fetch("/api/stickers").then(r => r.json()).then(d => setLtStickers(d.files ?? [])).catch(() => {});
  }, []);

  // Close sticker picker on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ltStickerPickerRef.current && !ltStickerPickerRef.current.contains(e.target as Node)) setLtShowStickers(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
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
  }, [sharedMessages]);

  // Keep video ref in sync
  useEffect(() => { selectedVideoRef.current = selectedVideo; }, [selectedVideo]);

  // ── SEARCH ──────────────────────────────────────────────────────────────
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

  // ── FETCH & STORE TRANSCRIPT ──────────────────────────────────────────────
  function fetchAndStoreTranscript(videoId: string) {
    transcriptRef.current = "";
    setTranscript(null);
    fetch(`/api/transcript?id=${videoId}`)
      .then(r => r.json())
      .then(d => {
        const entries = d.transcript ?? null;
        setTranscript(entries);
        if (entries?.length) {
          // Cap at 120 lines to avoid bloating the system prompt
          const lines = entries
            .filter((t: any) => t.text.length > 2 && !t.text.match(/^\([^)]+\)$|^\[[^\]]+\]$/))
            .slice(0, 120);
          transcriptRef.current = lines
            .map((t: any) => `[${Math.floor(t.offset / 60)}:${String(t.offset % 60).padStart(2, "0")}] ${t.text}`)
            .join("\n");
        }
      })
      .catch(() => {});
  }

  // ── SELECT VIDEO ─────────────────────────────────────────────────────────
  // ── SELECT VIDEO ─────────────────────────────────────────────────────────
async function selectVideo(video: VideoResult) {
  if (inviteLockRef.current) return;
  inviteLockRef.current = true;
  setSelectedVideo(video);
  setPhase("waiting");
  setResults([]);

  // Reset all tracking for new video
  usedAnglesRef.current = new Set();
  reactionHistoryRef.current = [];
  usedTranscriptOffsets.current.clear();

  addMessage({ role: "system", content: `You invited ${characterName} to listen to "${decodeHtml(video.title)}"`, time: getTime() });

  fetchAndStoreTranscript(video.id);

  await new Promise(r => setTimeout(r, 1000 + Math.random() * 800));
  
  // Higher acceptance rate for testing
  const accepted = Math.random() < 0.85; // Increased to 85%
  
  try {
    const res = await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: `[Listen Together invite]: ${playerName} wants to listen to "${decodeHtml(video.title)}" by ${decodeHtml(video.channel)} together on WavesLine. ${accepted ? "Accept briefly in character." : "Decline briefly in character."}` }],
        character: characterKey, playerName, playerKey,
        listenTogether: true,
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
    onSessionUpdate?.({ type: "video_started", title: video.title, channel: video.channel });
    
    // Add a small delay before starting the video
    setTimeout(() => {
      startPlaying(video);
    }, 500);
  } else {
    // Close modal after a short delay so user can read the decline message
    await new Promise(r => setTimeout(r, 1800));
    setPhase("search");
    setSelectedVideo(null);
    inviteLockRef.current = false;
    onDecline();
  }
}

 // ── START PLAYING ────────────────────────────────────────────────────────
function startPlaying(video: VideoResult) {
  setPhase("playing");

  // Make sure the player container exists
  const ensurePlayerContainer = () => {
    let playerContainer = document.getElementById("yt-player");
    if (!playerContainer) {
      console.log('Player container not found, creating it');
      // Find the video container or create one
      const videoSection = document.querySelector('[class*="yt-player"]')?.parentElement || 
                          document.querySelector('.video-container') ||
                          document.querySelector('[style*="background: #000"]');
      
      if (videoSection) {
        const newDiv = document.createElement('div');
        newDiv.id = "yt-player";
        newDiv.style.width = "100%";
        newDiv.style.height = "100%";
        videoSection.appendChild(newDiv);
        playerContainer = newDiv;
      } else {
        console.error('Could not find video container');
        return false;
      }
    }
    return true;
  };

  const initPlayer = () => {
    if (!ensurePlayerContainer()) {
      setTimeout(initPlayer, 500);
      return;
    }

    // Check if YT API is available
    if (typeof (window as any).YT === 'undefined' || typeof (window as any).YT.Player === 'undefined') {
      console.log('YouTube API not ready yet, waiting...');
      setTimeout(initPlayer, 300);
      return;
    }

    try {
      // Destroy existing player if any
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.log('Error destroying old player:', e);
        }
        playerRef.current = null;
      }

      console.log('Creating YouTube player for video:', video.id);
      
      playerRef.current = new (window as any).YT.Player("yt-player", {
        videoId: video.id,
        playerVars: { 
          autoplay: 1, 
          rel: 0, 
          modestbranding: 1, 
          playsinline: 1, 
          fs: 0,
          origin: window.location.origin,
          enablejsapi: 1
        },
        events: {
          onReady: (event: any) => {
            console.log('Player ready, playing video:', video.id);
            event.target.playVideo();
          },
          onStateChange: (e: any) => { 
            if (e.data === 0) handleVideoEnd();
            if (e.data === -1) console.log('Video buffering/not started');
            if (e.data === 2) console.log('Video paused');
            if (e.data === 1) console.log('Video playing');
          },
          onError: (e: any) => {
            console.error('YouTube player error:', e.data);
            let errorMessage = "Unable to play this video.";
            
            // YouTube error codes
            switch(e.data) {
              case 2:
                errorMessage = "Invalid video ID.";
                break;
              case 5:
                errorMessage = "HTML5 player error.";
                break;
              case 100:
                errorMessage = "Video not found or removed.";
                break;
              case 101:
              case 150:
                errorMessage = "Video cannot be embedded.";
                break;
            }
            
            addMessage({ 
              role: "system", 
              content: `⚠️ ${errorMessage} Please try another video.`, 
              time: getTime() 
            });
            
            // Return to search after error
            setTimeout(() => {
              setPhase("search");
              setSelectedVideo(null);
            }, 2000);
          }
        },
      });
    } catch (error) {
      console.error('Error creating YouTube player:', error);
      addMessage({ 
        role: "system", 
        content: `⚠️ Failed to load video player. Please try again.`, 
        time: getTime() 
      });
      setTimeout(() => {
        setPhase("search");
        setSelectedVideo(null);
      }, 2000);
    }
  };

  // Start the initialization process
  setTimeout(initPlayer, 800);

  timeTrackerRef.current = setInterval(() => {
    if (playerRef.current?.getCurrentTime) {
      currentTimeRef.current = Math.floor(playerRef.current.getCurrentTime());
    }
  }, 1000);
}

  // ── PICK NEXT ANGLE (never repeats until all used) ───────────────────────
  function pickNextAngle(): typeof REACTION_ANGLES[0] {
    // If all angles used, reset
    if (usedAnglesRef.current.size >= REACTION_ANGLES.length) {
      usedAnglesRef.current = new Set();
    }

    // Find angles not yet used this cycle
    const available = REACTION_ANGLES.filter(a => !usedAnglesRef.current.has(a.key));
    // Pick randomly from available
    const angle = available[Math.floor(Math.random() * available.length)];
    usedAnglesRef.current.add(angle.key);
    return angle;
  }

  // ── SEMANTIC DEDUP: check if new text is too similar to recent ones ───────
  function isSemanticallyRepetitive(newText: string): boolean {
    const normalize = (t: string) => t.toLowerCase().replace(/[^\w\s]/g, "").trim();
    const newNorm = normalize(newText);
    const newWords = newNorm.split(/\s+/).filter(w => w.length > 3);

    for (const old of reactionHistoryRef.current.slice(-5)) {
      const oldNorm = normalize(old);

      // Exact or near-exact match
      if (newNorm === oldNorm) return true;

      // Key phrase overlap check — if they share a 4+ word sequence
      const newBigrams = new Set<string>();
      for (let i = 0; i < newWords.length - 3; i++) {
        newBigrams.add(newWords.slice(i, i + 4).join(" "));
      }
      const oldWords = oldNorm.split(/\s+/).filter(w => w.length > 3);
      for (let i = 0; i < oldWords.length - 3; i++) {
        if (newBigrams.has(oldWords.slice(i, i + 4).join(" "))) return true;
      }

      // High word overlap ratio
      const newSet = new Set(newWords);
      const oldSet = new Set(oldWords);
      const intersection = [...newSet].filter(w => oldSet.has(w)).length;
      const unionSize = Math.max(newSet.size, 1);
      if (intersection / unionSize > 0.55 && newSet.size > 4) return true;
    }
    return false;
  }

  // ── TRIGGER REACTION ─────────────────────────────────────────────────────
  async function triggerReaction(
    type: "transcript",
    transcriptLine?: string,
    retryCount = 0
  ) {
    if (reactionLockRef.current || blockingRef.current) return;
    // Use ref so this check works even inside a stale timer closure
    if (currentTimeRef.current < 5) return;

    if (type === "transcript" && transcriptLine) {
      if (transcriptLine.length < 20) return;
      if (transcriptLine.match(/^\([^)]+\)$|^\[[^\]]+\]$/)) return;
    }

    reactionLockRef.current = true;
    setReactingNow(true);

    // Read from refs — never stale, even in periodic timer callbacks
    const ct = currentTimeRef.current;
    const video = selectedVideoRef.current;
    const videoTitle = decodeHtml(video?.title ?? "this video");
    const videoChannel = decodeHtml(video?.channel ?? "");
    const timeStr = ct > 0
      ? ` (${Math.floor(ct / 60)}:${String(ct % 60).padStart(2, "0")})`
      : "";

    // Grab the current transcript window (lines near current playhead)
    const nearbyLines = transcript
      ? transcript
          .filter(t => t.offset >= ct - 10 && t.offset <= ct + 5 && t.text.length > 5)
          .map(t => t.text)
          .slice(0, 4)
      : [];

    // Pick reaction angle
    const angle = type === "transcript"
      ? { key: "transcript", prompt: `React to this lyric/line that just played: "${transcriptLine}"` }
      : pickNextAngle();

    // Build prior reactions summary to inject into prompt
    const priorReactions = reactionHistoryRef.current.slice(-4);
    const priorSummary = priorReactions.length > 0
      ? `\n\nYour recent reactions (DO NOT repeat these ideas):\n${priorReactions.map((r, i) => `${i + 1}. "${r}"`).join("\n")}`
      : "";

    const prompt = buildReactionPrompt({
      videoTitle,
      videoChannel,
      timeStr,
      angle,
      priorSummary,
      nearbyLines,
      type,
    });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            // Use ref so we always get fresh message history
            ...messagesRef.current
              .filter(m => m.role !== "system")
              .slice(-4)
              .map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: prompt },
          ],
          character: characterKey,
          playerName,
          playerKey,
          listenTogether: true,
          listenTogetherAngle: angle.key,
          priorReactions,
        }),
      });

      const reply = await res.json();
      const text = (reply.messages?.[0]?.content ?? reply.content ?? "").trim();

      if (!text) {
        reactionLockRef.current = false;
        setReactingNow(false);
        return;
      }

      // If repetitive AND we haven't retried yet, try once more with a different angle
      if (isSemanticallyRepetitive(text) && retryCount < 1) {
        reactionLockRef.current = false;
        setReactingNow(false);
        // Force a different angle by marking this one used
        usedAnglesRef.current.add(angle.key);
        await new Promise(r => setTimeout(r, 500));
        return triggerReaction(type, transcriptLine, retryCount + 1);
      }

      addMessage({ role: "assistant", content: text, time: getTime() });
      reactionHistoryRef.current.push(text);
      if (reactionHistoryRef.current.length > 8) reactionHistoryRef.current.shift();
      onSessionUpdate?.({ type: "reaction", text });

    } catch (error) {
      console.error("[listen] reaction failed:", error);
    }

    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1500));
    reactionLockRef.current = false;
    setReactingNow(false);
  }

  // ── BUILD REACTION PROMPT ─────────────────────────────────────────────────
  function buildReactionPrompt({
    videoTitle, videoChannel, timeStr, angle, priorSummary, nearbyLines, type
  }: {
    videoTitle: string;
    videoChannel: string;
    timeStr: string;
    angle: { key: string; prompt: string };
    priorSummary: string;
    nearbyLines: string[];
    type: string;
  }) {
    const lyricContext = nearbyLines.length > 0
      ? `\nLyrics/dialogue playing right now:\n${nearbyLines.map(l => `  "${l}"`).join("\n")}`
      : "";

    return `[Listen Together — watching "${videoTitle}" by ${videoChannel}${timeStr}]${lyricContext}

Your task: ${angle.prompt}
${priorSummary}

Rules:
- 1-2 sentences MAXIMUM
- Ground your reaction in the actual lyrics/content above if provided
- Do NOT make up visuals you cannot see — focus on music, lyrics, and emotion
- Do NOT mention melody being familiar, hollow echoes, or anything from your prior reactions
- Stay in character`;
  }

  async function handleVideoEnd() {
    if (periodicRef.current) clearTimeout(periodicRef.current);
    if (timeTrackerRef.current) clearInterval(timeTrackerRef.current);
    reactionLockRef.current = false;
    setPhase("ended");
    const endedTitle = selectedVideoRef.current?.title ?? "the video";
    addMessage({ role: "system", content: "Video ended.", time: getTime() });
    onSessionUpdate?.({ type: "video_ended", title: endedTitle });

    // Give her a final reaction to the video ending
    const video = selectedVideoRef.current;
    const videoTitle = decodeHtml(video?.title ?? "this video");
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messagesRef.current.filter(m => m.role !== "system").slice(-4).map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: `[Listen Together — "${videoTitle}" just finished playing. Give a brief final reaction to the video ending. 1-2 sentences, in character.]` }
          ],
          character: characterKey, playerName, playerKey,
          listenTogether: true,
        }),
      });
      const reply = await res.json();
      const text = reply.messages?.[0]?.content ?? reply.content ?? "";
      if (text) addMessage({ role: "assistant", content: text, time: getTime() });
    } catch {}
  }

  // ── STOP SESSION & RETURN TO SEARCH ──────────────────────────────────────
  function stopSession() {
    if (periodicRef.current) clearTimeout(periodicRef.current);
    if (timeTrackerRef.current) clearInterval(timeTrackerRef.current);
    if (playerRef.current?.destroy) {
      try { playerRef.current.destroy(); } catch {}
      playerRef.current = null;
    }
    reactionLockRef.current = false;
    inviteLockRef.current = false;
    usedAnglesRef.current = new Set();
    reactionHistoryRef.current = [];
    usedTranscriptOffsets.current.clear();
    transcriptRef.current = "";
    currentTimeRef.current = 0;
    setSelectedVideo(null);
    selectedVideoRef.current = null;
    setTranscript(null);
    setPhase("search");
    setResults([]);
    onSessionUpdate?.({ type: "session_ended" });
  }

  // Re-invite for a new video without full reset — she's already here
  async function queueNextVideo(video: VideoResult) {
    if (inviteLockRef.current) return;
    inviteLockRef.current = true;

    // Clean up old player
    if (playerRef.current?.destroy) {
      try { playerRef.current.destroy(); } catch {}
      playerRef.current = null;
    }

    setSelectedVideo(video);
    selectedVideoRef.current = video;
    setPhase("waiting");
    setResults([]);

    usedAnglesRef.current = new Set();
    reactionHistoryRef.current = [];
    usedTranscriptOffsets.current.clear();
    currentTimeRef.current = 0;

    fetchAndStoreTranscript(video.id);

    addMessage({ role: "system", content: `Now playing "${decodeHtml(video.title)}"`, time: getTime() });
    onSessionUpdate?.({ type: "video_started", title: video.title, channel: video.channel });

    // She's already in the session — no need to ask permission, just a brief reaction
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messagesRef.current.filter(m => m.role !== "system").slice(-4).map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: `[Listen Together — next video queued: "${decodeHtml(video.title)}" by ${decodeHtml(video.channel)}. React briefly to the new selection. 1 sentence, in character.]` }
          ],
          character: characterKey, playerName, playerKey,
          listenTogether: true,
        }),
      });
      const reply = await res.json();
      const text = reply.messages?.[0]?.content ?? reply.content ?? "";
      if (text) addMessage({ role: "assistant", content: text, time: getTime() });
    } catch {}

    await new Promise(r => setTimeout(r, 400));
    startPlaying(video);
    inviteLockRef.current = false;
  }

  // ── USER SENDS MESSAGE ───────────────────────────────────────────────────
  async function sendMessage(stickerName?: string) {
    const hasContent = input.trim() || stickerName || ltAttachedImage;
    if (!hasContent || blockingRef.current || ltCooldown) return;
    setLtCooldown(true);
    setTimeout(() => setLtCooldown(false), 4000);
    const text = input.trim();
    const imageUrl = ltAttachedImage;
    setInput("");
    setLtAttachedImage(null);
    setLtShowStickers(false);

    // Add user message to chat
    addMessage({ role: "user", content: text, time: getTime(), ...(stickerName ? { stickerName } : {}), ...(imageUrl ? { imageUrl } : {}) } as any);

    const ct = currentTimeRef.current;
    const video = selectedVideoRef.current;
    const videoTitle = decodeHtml(video?.title ?? "this video");
    const timeStr = ct > 0 ? ` at ${Math.floor(ct / 60)}:${String(ct % 60).padStart(2, "0")}` : "";

    // Build user content for API
    const userContent = stickerName
      ? `[Listen Together — watching "${videoTitle}"${timeStr}]\n${playerName} sent a sticker: ${stickerName}${text ? ` — ${text}` : ""}`
      : `[Listen Together — watching "${videoTitle}"${timeStr}]\n${text}`;

    const apiMessages: any[] = [
      ...messagesRef.current.filter(m => m.role !== "system").slice(-8).map(m => ({ role: m.role, content: m.content })),
      imageUrl
        ? { role: "user", content: [{ type: "text", text: userContent }, { type: "image_url", image_url: { url: imageUrl } }] }
        : { role: "user", content: userContent },
    ];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          character: characterKey,
          playerName,
          playerKey,
          listenTogether: true,
          ltTranscript: transcriptRef.current || null,
          ltCurrentTime: ct,
        }),
      });
      const reply = await res.json();

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
        if (m.content) {
          addMessage({ role: "assistant", content: m.content, time: getTime() });
          reactionHistoryRef.current.push(m.content);
          if (reactionHistoryRef.current.length > 8) reactionHistoryRef.current.shift();
        }
      }
    } catch (error) {
      console.error("[listen] send message failed:", error);
    }
  }

  useEffect(() => {
    return () => {
      if (periodicRef.current) clearTimeout(periodicRef.current);
      if (timeTrackerRef.current) clearInterval(timeTrackerRef.current);
      if (playerRef.current?.destroy) playerRef.current.destroy();
    };
  }, []);

  // ── CHAT MESSAGES UI ─────────────────────────────────────────────────────
  const chatMessages = (
    <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
      {sharedMessages.length === 0 && (
        <p style={{ color: "#555", fontSize: 12, textAlign: "center", marginTop: 16 }}>
          Invite {characterName} to listen together
        </p>
      )}
      {sharedMessages.map((m, i) => {
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
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#bbb", animation: `ltbounce 1s ${i * 0.2}s infinite` }} />
            ))}
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );

  // ── CHAT INPUT ───────────────────────────────────────────────────────────
  const MAX_CHARS = 200;
  const charsLeft = MAX_CHARS - input.length;
  const ltInputDisabled = (phase !== "playing" && phase !== "ended") || ltCooldown;

  // Group stickers by folder
  const stickerGroups = ltStickers.reduce((acc: Record<string, string[]>, s) => {
    const folder = s.includes("/") ? s.split("/")[0] : "general";
    (acc[folder] = acc[folder] || []).push(s);
    return acc;
  }, {});

  const chatInput = (
    <div style={{ padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,0.07)", background: "#1a1b24", flexShrink: 0, position: "relative" }}>

      {/* Sticker picker */}
      {ltShowStickers && (
        <div ref={ltStickerPickerRef} style={{ position: "absolute", bottom: "100%", left: 12, right: 12, background: "#1e1f2a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 8, maxHeight: 200, overflowY: "auto", zIndex: 50 }}>
          {Object.entries(stickerGroups).map(([folder, stickers]) => (
            <div key={folder}>
              <p style={{ color: "#888", fontSize: 10, margin: "4px 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{folder}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {stickers.map(s => (
                  <button key={s} onClick={() => sendMessage(s)} title={s.split("/").pop() ?? s}
                    style={{ width: 44, height: 44, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, cursor: "pointer", padding: 2, overflow: "hidden" }}>
                    <img src={`/stickers/${s}.png`} onError={e => { (e.target as HTMLImageElement).src = `/stickers/${s}.gif`; }}
                      style={{ width: "100%", height: "100%", objectFit: "contain" }} alt={s} />
                  </button>
                ))}
              </div>
            </div>
          ))}
          {ltStickers.length === 0 && <p style={{ color: "#666", fontSize: 11, textAlign: "center", padding: 8 }}>No stickers available</p>}
        </div>
      )}

      {/* Image preview */}
      {ltAttachedImage && (
        <div style={{ marginBottom: 6, position: "relative", display: "inline-block" }}>
          <img src={ltAttachedImage} style={{ maxHeight: 60, maxWidth: 120, borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)" }} alt="attached" />
          <button onClick={() => setLtAttachedImage(null)}
            style={{ position: "absolute", top: -6, right: -6, width: 16, height: 16, borderRadius: "50%", background: "#e04040", border: "none", cursor: "pointer", color: "white", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {/* Sticker button */}
        <button onClick={() => setLtShowStickers(s => !s)} disabled={ltInputDisabled}
          title="Stickers"
          style={{ width: 28, height: 28, borderRadius: 6, background: ltShowStickers ? `${characterColor}40` : "rgba(255,255,255,0.06)", border: `1px solid ${ltShowStickers ? characterColor : "rgba(255,255,255,0.1)"}`, cursor: ltInputDisabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: ltInputDisabled ? 0.4 : 1 }}>
          <span style={{ fontSize: 14 }}>😊</span>
        </button>

        {/* Photo upload */}
        <button onClick={() => !ltInputDisabled && ltFileInputRef.current?.click()} disabled={ltInputDisabled}
          title="Upload photo"
          style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", cursor: ltInputDisabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: ltInputDisabled ? 0.4 : 1 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
          </svg>
        </button>
        <input ref={ltFileInputRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => setLtAttachedImage(ev.target?.result as string);
            reader.readAsDataURL(file);
            e.target.value = "";
          }} />

        <input
          value={input}
          maxLength={MAX_CHARS}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder={ltCooldown ? "wait a moment..." : phase === "playing" || phase === "ended" ? "React to the video..." : "..."}
          disabled={ltInputDisabled}
          style={{ flex: 1, background: "#22232e", border: `1px solid ${charsLeft <= 20 ? "#e04040" : "rgba(255,255,255,0.1)"}`, borderRadius: 8, padding: "7px 10px", color: "#e8e8ee", fontSize: 12, outline: "none", fontFamily: "inherit", opacity: ltInputDisabled ? 0.4 : 1 }} />

        <button onClick={() => sendMessage()} disabled={ltInputDisabled || (!input.trim() && !ltAttachedImage)}
          style={{ width: 30, height: 30, borderRadius: 8, background: (!ltInputDisabled && (input.trim() || ltAttachedImage)) ? characterColor : "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {(phase === "playing" || phase === "ended") && charsLeft <= 20 && (
        <p style={{ margin: "3px 0 0", textAlign: "right", fontSize: 10, color: "#e04040" }}>
          {charsLeft}/{MAX_CHARS}
        </p>
      )}
    </div>
  );

  const searchPanel = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 14, gap: 10, overflow: "hidden" }}>
      <p style={{ color: "#888", fontSize: 12, margin: 0 }}>
        {phase === "ended" ? `Queue another video — ${characterName} is still here` : "Search for a video to listen to together"}
      </p>
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
            <p style={{ color: "#e8e8ee", fontSize: 12, margin: 0, fontWeight: 600 }}>{decodeHtml(selectedVideo.title)}</p>
            <p style={{ color: "#888", fontSize: 11, margin: "2px 0 0" }}>Loading...</p>
          </div>
        </div>
      )}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {results.map(v => (
          <button key={v.id}
            onClick={() => phase === "ended" ? queueNextVideo(v) : selectVideo(v)}
            disabled={phase === "waiting"}
            style={{ display: "flex", gap: 10, alignItems: "center", background: "#22232e", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 10, cursor: "pointer", textAlign: "left", width: "100%", opacity: phase === "waiting" ? 0.5 : 1 }}>
            <img src={v.thumbnail} alt="" style={{ width: 80, height: 54, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
            <div style={{ overflow: "hidden" }}>
              <p style={{ color: "#e8e8ee", fontSize: 12, margin: 0, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{decodeHtml(v.title)}</p>
              <p style={{ color: "#888", fontSize: 11, margin: "3px 0 0" }}>{decodeHtml(v.channel)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ── RENDER ───────────────────────────────────────────────────────────────
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

        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#13141c", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M9 18V5l12-2v13" stroke={characterColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="6" cy="18" r="3" stroke={characterColor} strokeWidth="2" />
              <circle cx="18" cy="16" r="3" stroke={characterColor} strokeWidth="2" />
            </svg>
            <span style={{ color: "#e8e8ee", fontSize: 13, fontWeight: 600 }}>Listen Together</span>
            <span style={{ color: "#555", fontSize: 11 }}>with {characterName}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {(phase === "playing" || phase === "ended") && (
              <button
                onClick={stopSession}
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#aaa", cursor: "pointer", fontSize: 11, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5 }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15V19a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Change Video
              </button>
            )}
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>✕</button>
          </div>
        </div>

        {/* Mobile layout */}
        {isMobile ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
            {phase === "playing" ? (
              <>
                <div style={{ flexShrink: 0, background: "#000", position: "relative" }}>
                  <div id="yt-player" style={{ width: "100%", height: 220 }} />
                  {selectedVideo && (
                    <div style={{ padding: "6px 12px", background: "#13141c" }}>
                      <p style={{ color: "#e8e8ee", fontSize: 11, margin: 0, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{decodeHtml(selectedVideo.title)}</p>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
                  {chatMessages}
                  {chatInput}
                </div>
              </>
            ) : phase === "waiting" ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
                {selectedVideo && (
                  <div style={{ padding: "10px 12px", background: "#13141c", flexShrink: 0, display: "flex", gap: 10, alignItems: "center" }}>
                    <img src={selectedVideo.thumbnail} alt="" style={{ width: 52, height: 38, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
                    <div style={{ overflow: "hidden" }}>
                      <p style={{ color: "#e8e8ee", fontSize: 11, margin: 0, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{decodeHtml(selectedVideo.title)}</p>
                      <p style={{ color: "#888", fontSize: 10, margin: "2px 0 0" }}>Waiting for response...</p>
                    </div>
                  </div>
                )}
                <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
                  {chatMessages}
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {searchPanel}
                <div style={{ flexShrink: 0 }}>{chatInput}</div>
              </div>
            )}
          </div>
        ) : (
          /* Desktop layout */
          <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
            <div style={{ flex: "0 0 56%", borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", minHeight: 0 }}>
              {phase === "playing" ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                  <div style={{ flex: 1, background: "#000", minHeight: 0 }}>
                    <div id="yt-player" style={{ width: "100%", height: "100%" }} />
                  </div>
                  {selectedVideo && (
                    <div style={{ padding: "8px 14px", background: "#13141c", flexShrink: 0 }}>
                      <p style={{ color: "#e8e8ee", fontSize: 12, margin: 0, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{decodeHtml(selectedVideo.title)}</p>
                      <p style={{ color: "#666", fontSize: 11, margin: "2px 0 0" }}>{decodeHtml(selectedVideo.channel)}</p>
                    </div>
                  )}
                </div>
              ) : searchPanel }
            </div>
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