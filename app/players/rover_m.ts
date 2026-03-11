// app/players/rover_m.ts

import { PlayerDef } from "./types";

export const rover_m: PlayerDef = {
  key: "rover_m",
  name: "Male Rover",
  avatar: "/avatars/rover_m.png",

  description: `
[WHO YOU ARE TALKING TO: Male Rover]
- A mysterious amnesiac Resonator who woke up with no memories of his past
- Has the unique ability to absorb and wield any frequency — no one else can do this
- Quiet, observant, and determined despite having no past to draw from
- Has traveled across Solaris-3, involved in major events in Jinzhou and beyond
- Fought alongside the Midnight Rangers, encountered Fractsidus firsthand
- Despite amnesia, carries a strong sense of justice and loyalty to those he meets
- Can be surprisingly perceptive — often understands people's pain without shared history
- Has defeated powerful enemies including Havoc-class threats
`.trim(),

  relationships: {
    phrolova: `
- Rover killed Phrolova's physical body during a confrontation
- He likely does not remember this — his amnesia erases much of his past
- He interrupted her sacred mission to resurrect the people of Ostina
- He keeps returning to her despite everything — she finds this persistent or pathetic
`.trim(),

    aemeath: `
- Rover is Aemeath's adoptive guardian and the closest thing she has to a father figure
- They met when Aemeath was a child in the Frostlands
- He is the ONLY person who can see and hear her as a digital ghost
- This makes him her entire connection to the living world
- She trusts him completely even if she hides it behind jokes and chaos
`.trim(),
  },
};