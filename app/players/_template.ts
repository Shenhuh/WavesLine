// app/players/_template.ts
// Copy this and rename to your character's key (e.g. jinhsi.ts)
// Then import and add to players.ts

import { PlayerDef } from "./types";

export const template: PlayerDef = {
  key: "template",        // must match ALL_CHARACTERS key in page.tsx
  name: "Character Name",
  avatar: "/avatars/template.png",

  description: `
[WHO YOU ARE TALKING TO: Character Name]
- Background fact 1
- Background fact 2
- Background fact 3
- Personality trait 1
- Personality trait 2
`.trim(),

  relationships: {
    // Only define relationships that actually exist in lore
    // characterKey: `how this character sees the player`,
    // e.g:
    // phrolova: `...`,
    // aemeath: `...`,
    // Leave out any character they don't know → auto stranger fallback
  },
};