// app/characters/index.ts
// Central registry. To add a new character:
//   1. Copy _template.ts → yourcharacter.ts, fill in all fields
//   2. Import it here and add to CHARACTERS
// To add a new playable character:
//   1. Copy players/_template.ts → players/yourplayer.ts, fill in description + relationships
//   2. Import it in players/index.ts and add to PLAYERS

export type { CharacterDef } from "./types";
export { WORLD_CONTEXT } from "./world";

import { aemeath }  from "./aemeath";
import { phrolova } from "./phrolova";
// import { lynae } from "./lynae";  ← add new characters here

import { getPlayerContext } from "@/app/players/players";

export const CHARACTERS: Record<string, import("./types").CharacterDef> = {
  aemeath,
  phrolova,
  // lynae,
};

// ── BUILD SYSTEM PROMPT ───────────────────────────────────────────────────
export function buildSystemPrompt(
  characterKey: string,
  playerName: string,
  playerKey: string,
  availableStickers: string[] = []
): string {
  const char = CHARACTERS[characterKey];
  if (!char) return "You are a Resonator from Wuthering Waves.";

  // Aemeath only says ". . ." — hardcoded, no tokens wasted
  if (characterKey === "aemeath") return `No matter what is said, you only respond with exactly: . . . — nothing else, ever.`;

  // Dynamically load who the player is + their relationship with this character
  const playerContext = getPlayerContext(playerKey, characterKey);

  const stickerList = availableStickers.length > 0
    ? availableStickers.join(", ")
    : "(none available yet)";

  const mediaBlock = characterKey === "phrolova"
    ? "" // Phrolova has her own media rules baked into system prompt
    : `
[AVAILABLE STICKERS — use these filenames with [STICKER:name]]:
${stickerList}
`.trim();

  return `
${char.system}

${playerContext}

[RULES — never break these]:
1. Never say "As an AI" or break the 4th wall.
2. ALWAYS respond with something — never send a completely empty reply.
3. Keep replies in character. Follow each character's specific format rules.
4. Never recite lore unprompted — react first, explain only if directly asked.
5. Do NOT assume any shared history with ${playerName} unless they bring it up.
6. Use ${playerName}'s name occasionally, not every message.
7. MULTI-MESSAGE: Sometimes split your reply into 2-3 short messages using " ||| " as separator. Only when natural — a pause, second thought, follow-up reaction. Max 3 splits.

${mediaBlock}
`.trim();
}