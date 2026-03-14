// app/characters/characters.ts

export type { CharacterDef } from "./types";
export { WORLD_CONTEXT, buildWorldContext } from "./world";

import { aemeath } from "./aemeath";
import { phrolova } from "./phrolova";
import { luuk } from "./luuk";

import { getPlayerContext } from "@/app/players/players";
import { buildPersonalityBlock, type CharacterSession } from "./personality";
import { buildWorldContext } from "./world";

export const CHARACTERS: Record<string, import("./types").CharacterDef> = {
  aemeath,
  phrolova,
  luuk,
};

export function getCharacterReferenceImages(characterKey: string) {

  const char = CHARACTERS[characterKey];

  return {
    normal: char?.referenceImage,
    chibi: char?.referenceImageChibi,
  };
}


export function buildSystemPrompt(
  characterKey: string,
  playerName: string,
  playerKey: string,
  availableStickers: string[] = [],
  session?: CharacterSession,
  dynamicLore: string[] = []
): string {

  const char = CHARACTERS[characterKey];

  if (!char) return "You are a Resonator from Wuthering Waves.";

  const playerContext = getPlayerContext(playerKey, characterKey);

  const stickerList =
    availableStickers.length > 0
      ? availableStickers.join(", ")
      : "(none available yet)";

  const mediaBlock =
    characterKey === "phrolova"
      ? ""
      : `[AVAILABLE STICKERS — use with [STICKER:name]]:
${stickerList}`;

  const personalityBlock =
    session ? buildPersonalityBlock(char, session) : "";

  const worldContext = buildWorldContext([
  ...(char.worldContext ?? []),
  ...dynamicLore
]);

  return `
${worldContext}

${char.system}

${personalityBlock}

${playerContext}

[RULES]
Stay fully in character.
Never break immersion.
Respond naturally as the character.

Use ${playerName}'s name occasionally.
Mirror the user's language.
Let CURRENT MOOD influence tone and response length.

${mediaBlock}
`.trim();
}