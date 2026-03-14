import type { CharacterOption, ChatCharacter } from "./types";

export const PHROLOVA_SONG = [
  "Hi, it's been a while",
  "Since the last time that I saw your smile",
  "What a perfect fit",
  "The last piece have fallen into place",
  "I've been craving to touch you",
  "Like moonlight stroking your face",
  "My dear reverie, come hold me near",
  "Come dance with me in a rosy haze of yesterday",
  "Reverie, don't drift away",
  "Please keep me here in your warm embrace",
  "I'll trade anything for you, for one more day",
  "I'll perfume your dreams",
  "With scent of flowers and summer breeze",
  "Does it matter if it's true?",
  "It feels a lot more real",
  "When we whistle through the field",
  "When I sing this song for you",
  "My dear reverie, come hold me near",
  "Come dance with me in a rosy haze of yesterday",
  "Reverie, don't let me go",
  "If sanity means I have to hit the road",
  "Then I don't wanna know anywhere the wind blows",
];

export const ALL_CHARACTERS: CharacterOption[] = [
  { key: "rover_m", name: "Male Rover", avatar: "/avatars/rover_m.png" },
  { key: "rover_f", name: "Female Rover", avatar: "/avatars/rover_f.png" },
  { key: "phrolova", name: "Phrolova", avatar: "/avatars/phrolova.png" },
  { key: "luuk", name: "Luuk", avatar: "/avatars/luuk.png" },
];

export const CHAT_CHARACTERS: Record<string, ChatCharacter> = {
  aemeath: {
    name: "Aemeath",
    color: "#e8702a",
    avatar: "/avatars/aemeath.png",
    title: "Digital Ghost of Startorch",
    annoyanceThreshold: 100,
    annoyanceBlockMessage: ". . .",
  },
  phrolova: {
    name: "Phrolova",
    color: "#9d6fdf",
    avatar: "/avatars/phrolova.png",
    title: "Former Overseer",
    annoyanceThreshold: 75,
    annoyanceBlockMessage: "I have tolerated enough. Do not contact me again.",
  },
  luuk: {
    name: "Luuk",
    color: "#ffffff",
    avatar: "/avatars/luuk.png",
    title: "Attending Physician",
    annoyanceThreshold: 75,
    annoyanceBlockMessage: "Learn to be respectful.",
  },
};