// app/players/players.ts
// Add new playable characters here.

import { PlayerDef } from "./types";
import { rover_m } from "./rover_m";
import { rover_f } from "./rover_f";
// import { jinhsi } from "./jinhsi";  ← add future playable characters here

export type { PlayerDef };

export const PLAYERS: Record<string, PlayerDef> = {
  rover_m,
  rover_f,
  // jinhsi,
};

export function getPlayerContext(playerKey: string, characterKey: string): string {
  const player = PLAYERS[playerKey];

  // Unknown player — generic fallback
  if (!player) {
    return `[WHO YOU ARE TALKING TO: A traveler]\n- Not much is known about them. React naturally as your character would with a stranger.`;
  }

  const relationship = player.relationships[characterKey];

  return `
${player.description}

[YOUR RELATIONSHIP WITH THEM]
${relationship ?? "You do not know this person personally. Treat them as a stranger and react based on your character's nature."}
`.trim();
}