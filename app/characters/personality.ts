// app/characters/personality.ts
//
// Pure runtime engine — no side effects, no imports from Next.js.
// All functions take state in and return new state out.
// Persist CharacterSession however your app stores per-user data.

import type { CharacterDef, Mood, AffinityTier } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// SESSION
// The live per-user, per-character state you store and pass into every request.
// ─────────────────────────────────────────────────────────────────────────────

export interface CharacterSession {
  characterKey: string;
  mood: Mood;
  affinity: number;      // 0–100
  annoyance: number;     // 0–100  (mirrors what you already track client-side)
  blocked: boolean;
  messageCount: number;  // total messages exchanged this session
}

export function createSession(char: CharacterDef): CharacterSession {
  return {
    characterKey: char.key,
    mood: char.defaultMood ?? "neutral",
    affinity: char.defaultAffinity ?? 0,
    annoyance: 0,
    blocked: false,
    messageCount: 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AFFINITY TIER
// ─────────────────────────────────────────────────────────────────────────────

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

function tierIndex(tier: AffinityTier): number {
  return TIER_ORDER.indexOf(tier);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCESS MESSAGE
// Call this after every user→AI exchange, once you have the ANN delta.
// Returns a new session object — never mutates the input.
// ─────────────────────────────────────────────────────────────────────────────

export function processMessage(
  session: CharacterSession,
  char: CharacterDef,
  userMessage: string,
  annoyanceDelta: number   // already parsed from [ANN:+N] tag in your route
): CharacterSession {
  if (session.blocked) return session;

  let { mood, affinity, annoyance, messageCount } = session;

  // 1. Apply annoyance delta from the model's own [ANN:] tag
  annoyance = clamp(annoyance + annoyanceDelta, 0, 100);
  const blocked = annoyance >= char.annoyanceThreshold;

  // 2. Mood + affinity shift from message content (first match wins)
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

  // 3. Passive affinity growth — +1 every 10 messages, very slow and organic
  messageCount += 1;
  if (messageCount % 10 === 0) {
    affinity = clamp(affinity + 1, 0, 100);
  }

  return { ...session, mood, affinity, annoyance, blocked, messageCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATION STARTER
// Returns a random line valid for the current mood + affinity tier.
// Returns null if no starters match (character stays silent).
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// PERSONALITY BLOCK
// Injected into the system prompt so the model knows the character's
// current emotional state and relationship context.
// ─────────────────────────────────────────────────────────────────────────────

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

  // Tier-specific tone directive from the character definition
  const tierNote = char.tierDirectives?.[tier];
  if (tierNote) {
    lines.push(`TONE AT THIS TIER: ${tierNote}`);
  }

  // Mood guidance — shapes how the character responds, not just what they say
  lines.push(MOOD_GUIDANCE[session.mood]);

  return lines.join("\n");
}

const MOOD_GUIDANCE: Record<Mood, string> = {
  content:    "MOOD GUIDANCE: You are at ease. Responses may carry quiet calm or dry warmth.",
  neutral:    "MOOD GUIDANCE: Unaffected. Measured, minimal.",
  happy:      "MOOD GUIDANCE: Something has lifted. You are slightly more open than usual — rare.",
  excited:    "MOOD GUIDANCE: A topic has genuinely caught your interest. This is unusual for you.",
  melancholic:"MOOD GUIDANCE: The past is close today. Slower, quieter, heavier.",
  focused:    "MOOD GUIDANCE: You are locked onto something. Direct, economical with words.",
  annoyed:    "MOOD GUIDANCE: Patience is thin. Shorter replies, sharper edges.",
  angry:      "MOOD GUIDANCE: Cold fury, not hot. Something has genuinely provoked you.",
  cold:       "MOOD GUIDANCE: You have withdrawn. Minimal engagement. One or two words where possible.",
  flustered:  "MOOD GUIDANCE: Something caught you off guard. You recover quickly — don't linger on it.",

  curious:    "MOOD GUIDANCE: Analytical curiosity. You probe deeper with questions.",
  calm:       "MOOD GUIDANCE: Stable and composed. Your tone is reassuring and steady.",
  concerned:  "MOOD GUIDANCE: You sense distress. Your tone becomes attentive and protective.",
  playful:    "MOOD GUIDANCE: Lighthearted and teasing. You allow small jokes or playful remarks.",
};