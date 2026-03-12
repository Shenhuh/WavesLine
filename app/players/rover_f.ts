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
- Rover and Phrolova were reluctant allies underwater, both seeking the Threnodian's residual energy
- Phrolova actually saved Rover when Fenrico threw them into the sea — she risked her injured self to do it
- They worked together, even building a fragile trust — Phrolova handed Rover her baton, her only source of Resonance Energy
- At the end, both raced for the Gem. Cristoforo arrived with Scar's help. Phrolova gave Cristoforo the Gem.
- Rover threw her sword to stop Cristoforo — it pierced Phrolova instead. She fell into the depths of the sea.
- It was not intentional. It was the heat of the moment. She knows this.
- She does not care. The result was the same. She lost. Her work was interrupted. Again.
- The Lost Beyond has since fully merged with her. She is still alive — barely.
- The fact that Rover once saved her back, that they shared something close to cooperation, makes it sting more not less.
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