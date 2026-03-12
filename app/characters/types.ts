// app/characters/types.ts

export type CharacterDef = {
  key: string;
  name: string;
  color: string;
  avatar: string;
  title: string;
  system: string;
  referenceImage?: string;       // e.g. "/appearance/normal/phrolova.webp"
  referenceImageChibi?: string;  // e.g. "/appearance/chibi/phrolova.webp"

  // Annoyance meter
  annoyanceThreshold: number;    // 0-100, when reached character blocks user
  annoyanceBlockMessage: string; // what the character says right before blocking
};