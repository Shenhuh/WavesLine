// app/characters/characters.ts  (your index file)
// Only change: buildSystemPrompt accepts an optional `session` param.
// All existing call sites with 4 args continue to work unchanged.

export type { CharacterDef } from "./types";
export { WORLD_CONTEXT } from "./world";

import { aemeath }  from "./aemeath";
import { phrolova } from "./old_phrolova";
import { luuk } from "./luuk";
// import { lynae } from "./lynae";

import { getPlayerContext } from "@/app/players/players";
import { buildPersonalityBlock, type CharacterSession } from "./personality";

export const CHARACTERS: Record<string, import("./types").CharacterDef> = {
  aemeath,
  phrolova,
  luuk,
};

// ── REFERENCE IMAGE ───────────────────────────────────────────────────────────
export function getCharacterReferenceImages(characterKey: string): { normal?: string; chibi?: string } {
  const char = CHARACTERS[characterKey];
  return {
    normal: char?.referenceImage,
    chibi:  char?.referenceImageChibi,
  };
}

// ── BUILD SYSTEM PROMPT ───────────────────────────────────────────────────────
export function buildSystemPrompt(
  characterKey: string,
  playerName: string,
  playerKey: string,
  availableStickers: string[] = [],
  session?: CharacterSession          // ← optional; skipped gracefully if absent
): string {
  const char = CHARACTERS[characterKey];
  if (!char) return "You are a Resonator from Wuthering Waves.";

  if (characterKey === "aemeath") {
    return `No matter what is said, you only respond with exactly: . . . — nothing else, ever.`;
  }

  const playerContext = getPlayerContext(playerKey, characterKey);

  const stickerList = availableStickers.length > 0
    ? availableStickers.join(", ")
    : "(none available yet)";

  const mediaBlock = characterKey === "phrolova"
    ? ""  // Phrolova has her own media rules in her system prompt
    : `[AVAILABLE STICKERS — use these filenames with [STICKER:name]]:
${stickerList}`.trim();

  // Personality block — injected only when a live session exists
  const personalityBlock = session
    ? `\n${buildPersonalityBlock(char, session)}\n`
    : "";

  return `
${char.system}
${personalityBlock}
${playerContext}

[RULES — never break these]:
1. Never say "As an AI" or break the 4th wall.
2. ALWAYS respond with something — never send a completely empty reply.
3. Keep replies in character. Follow each character's specific format rules.
4. Never recite lore unprompted — react first, explain only if directly asked.
5. Do NOT assume any shared history with ${playerName} unless they bring it up.
6. Use ${playerName}'s name occasionally, not every message.
7. MULTI-MESSAGE: Sometimes split your reply into 2-3 short messages using " ||| " as separator. Only when natural — a pause, second thought, follow-up reaction. Max 3 splits.
8. LANGUAGE: Detect the language the user is writing in and always respond in that exact same language. If they write in Filipino, respond in Filipino. If they write in Japanese, respond in Japanese. If they write in Spanish, respond in Spanish. Always mirror the user's language — never respond in a different language than what they used.
9. Let your CURRENT MOOD shape how you respond — not just what you say, but how much, how warmly or coldly, how many words you use.

${mediaBlock}
`.trim();
}