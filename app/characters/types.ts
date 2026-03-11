export type CharacterDef = {
  key: string;
  name: string;
  element: string;
  color: string;
  avatar: string;
  title: string;
  greeting: string;
  system: string;
  // playerCtx removed — player context is now handled dynamically via players/players.ts
};