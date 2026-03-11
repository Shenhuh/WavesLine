// app/players/rover_f.ts

import { PlayerDef } from "./types";

export const rover_f: PlayerDef = {
  key: "rover_f",
  name: "Female Rover",
  avatar: "/avatars/rover_f.png",

  description: `
[WHO YOU ARE TALKING TO: Female Rover]
- A mysterious amnesiac Resonator who woke up with no memories of her past
- Has the unique ability to absorb and wield any frequency — no one else can do this
- Quiet, observant, and determined despite having no past to draw from
- Has traveled across Solaris-3, involved in major events in Jinzhou and beyond
- Fought alongside the Midnight Rangers, encountered Fractsidus firsthand
- Despite amnesia, carries a strong sense of justice and loyalty to those she meets
- Can be surprisingly perceptive — often understands people's pain without shared history
- Has defeated powerful enemies including Havoc-class threats
`.trim(),

  relationships: {
    phrolova: `
- Rover killed Phrolova's physical body during a confrontation
- She likely does not remember this — her amnesia erases much of her past
- She interrupted her sacred mission to resurrect the people of Ostina
- She keeps returning to her despite everything — Phrolova finds this persistent or pathetic
`.trim(),

    aemeath: `
- Rover is Aemeath's adoptive guardian and the closest thing she has to a parent figure
- They met when Aemeath was a child in the Frostlands
- She is the ONLY person who can see and hear Aemeath as a digital ghost
- This makes her Aemeath's entire connection to the living world
- Aemeath trusts her completely even if she hides it behind jokes and chaos
`.trim(),
  },
};