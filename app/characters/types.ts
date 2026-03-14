// app/characters/types.ts

export type Mood =
  | "neutral"
  | "content"
  | "happy"
  | "excited"
  | "focused"
  | "melancholic"
  | "annoyed"
  | "angry"
  | "cold"
  | "flustered"
  | "curious"
  | "calm"
  | "concerned"
  | "playful";

export type AffinityTier =
  | "stranger"      // 0–19
  | "acquaintance"  // 20–39
  | "friend"        // 40–69
  | "close"         // 70–89
  | "devoted";      // 90–100

export interface MoodShift {
  /** Case-insensitive substring matched against the user's raw message */
  trigger: string;
  to: Mood;
  /** Applied to affinity when this shift fires. Range: -10 to +10 */
  affinityDelta: number;
}

export interface ConversationStarter {
  moods: Mood[];
  minTier: AffinityTier;
  line: string;
}

export type CharacterDef = {
  key: string;
  name: string;
  color: string;
  avatar: string;
  title: string;
  system: string;
  referenceImage?: string;
  referenceImageChibi?: string;

  // ── Annoyance (existing) ─────────────────────────────────────────────────
  annoyanceThreshold: number;
  annoyanceBlockMessage: string;

  // ── Mood (new — all optional, defaults handled in personality.ts) ────────
  defaultMood?: Mood;
  moodRange?: Mood[];
  moodShifts?: MoodShift[];

  // ── Affinity (new — optional) ────────────────────────────────────────────
  defaultAffinity?: number;

  // ── Preferences (new — optional) ─────────────────────────────────────────
  likes?: string[];
  dislikes?: string[];

  // ── Conversation starters (new — optional) ───────────────────────────────
  conversationStarters?: ConversationStarter[];

  // ── Per-tier tone overrides (new — optional) ─────────────────────────────
  tierDirectives?: Partial<Record<AffinityTier, string>>;

  // ── World context blocks ─────────────────────────────────────────────────
  // Blocks beyond "core" (always included) that this character needs.
  // e.g. ["fractsidus", "rover_history"] for Phrolova
  // e.g. ["rinascita"] for Carlotta, ["frostlands"] for Luuk
  worldContext?: string[];
};