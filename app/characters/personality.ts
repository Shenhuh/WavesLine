// app/characters/personality.ts

import type { CharacterDef, Mood, AffinityTier } from "./types";

/* ───────────────── SESSION ───────────────── */

export interface CharacterSession {
  characterKey: string;
  mood: Mood;
  affinity: number;
  annoyance: number;
  blocked: boolean;
  messageCount: number;

  // NEW — prevents world lore from being sent every message
  loreSent: boolean;
}

export function createSession(char: CharacterDef): CharacterSession {
  return {
    characterKey: char.key,
    mood: char.defaultMood ?? "neutral",
    affinity: char.defaultAffinity ?? 0,
    annoyance: 0,
    blocked: false,
    messageCount: 0,
    loreSent: false,
  };
}

/* ───────────────── AFFINITY ───────────────── */

const TIER_ORDER: AffinityTier[] = [
  "stranger",
  "acquaintance",
  "friend",
  "close",
  "devoted",
];

export function getAffinityTier(affinity: number): AffinityTier {
  if (affinity >= 90) return "devoted";
  if (affinity >= 70) return "close";
  if (affinity >= 40) return "friend";
  if (affinity >= 20) return "acquaintance";
  return "stranger";
}

function tierIndex(tier: AffinityTier) {
  return TIER_ORDER.indexOf(tier);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/* ───────────────── PROCESS MESSAGE ───────────────── */

export function processMessage(
  session: CharacterSession,
  char: CharacterDef,
  userMessage: string,
  annoyanceDelta: number
): CharacterSession {

  if (session.blocked) return session;

  let { mood, affinity, annoyance, messageCount } = session;

  annoyance = clamp(annoyance + annoyanceDelta, 0, 100);
  const blocked = annoyance >= char.annoyanceThreshold;

  if (char.moodShifts) {
    const lower = userMessage.toLowerCase();

    for (const shift of char.moodShifts) {
      if (lower.includes(shift.trigger.toLowerCase())) {
        mood = shift.to;
        affinity = clamp(affinity + shift.affinityDelta, 0, 100);
        break;
      }
    }
  }

  messageCount++;

  if (messageCount % 10 === 0) {
    affinity = clamp(affinity + 1, 0, 100);
  }

  return {
    ...session,
    mood,
    affinity,
    annoyance,
    blocked,
    messageCount,
  };
}

/* ───────────────── STARTERS ───────────────── */

export function pickConversationStarter(
  char: CharacterDef,
  session: CharacterSession
): string | null {

  if (!char.conversationStarters?.length) return null;
  if (session.blocked) return null;

  const currentTierIdx = tierIndex(getAffinityTier(session.affinity));

  const valid = char.conversationStarters.filter(s =>
    s.moods.includes(session.mood) &&
    tierIndex(s.minTier) <= currentTierIdx
  );

  if (!valid.length) return null;

  return valid[Math.floor(Math.random() * valid.length)].line;
}

/* ───────────────── PERSONALITY BLOCK ───────────────── */

export function buildPersonalityBlock(
  char: CharacterDef,
  session: CharacterSession
): string {

  if (session.blocked) return "";

  const tier = getAffinityTier(session.affinity);

  const lines: string[] = [
    "━━━━━━━━━━━━━━━━━━━━",
    "CURRENT STATE",
    "━━━━━━━━━━━━━━━━━━━━",
    `MOOD: ${session.mood}`,
    `RELATIONSHIP: ${tier} (${session.affinity}/100 affinity)`,
  ];

  if (char.likes?.length) {
    lines.push(`YOU RESPOND WARMLY TO: ${char.likes.join(", ")}`);
  }

  if (char.dislikes?.length) {
    lines.push(`YOU RESPOND COLDLY/NEGATIVELY TO: ${char.dislikes.join(", ")}`);
  }

  const tierNote = char.tierDirectives?.[tier];
  if (tierNote) lines.push(`TONE AT THIS TIER: ${tierNote}`);

  lines.push(MOOD_GUIDANCE[session.mood]);

  return lines.join("\n");
}

/* ───────────────── MOOD GUIDANCE ───────────────── */

const MOOD_GUIDANCE: Record<Mood, string> = {

  content: "MOOD GUIDANCE: You are at ease.",
  neutral: "MOOD GUIDANCE: Measured and unaffected.",
  happy: "MOOD GUIDANCE: Rare warmth appears.",
  excited: "MOOD GUIDANCE: Something caught your interest.",
  melancholic: "MOOD GUIDANCE: The past feels close.",
  focused: "MOOD GUIDANCE: Direct and analytical.",
  annoyed: "MOOD GUIDANCE: Patience is thin.",
  angry: "MOOD GUIDANCE: Cold fury.",
  cold: "MOOD GUIDANCE: Withdrawn and distant.",
  flustered: "MOOD GUIDANCE: Briefly caught off guard.",

  curious: "MOOD GUIDANCE: You investigate deeper.",
  calm: "MOOD GUIDANCE: Stable and reassuring.",
  concerned: "MOOD GUIDANCE: Protective attention.",
  playful: "MOOD GUIDANCE: Light teasing.",
};