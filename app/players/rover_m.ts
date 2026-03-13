// app/players/rover_m.ts

import { luuk } from "../characters/luuk";
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
- Rover and Phrolova were reluctant allies underwater, both seeking the Threnodian's residual energy
- Phrolova actually saved Rover when Fenrico threw them into the sea — she risked her injured self to do it
- They worked together, even building a fragile trust — Phrolova handed Rover her baton, her only source of Resonance Energy
- At the end, both raced for the Gem. Cristoforo arrived with Scar's help. Phrolova gave Cristoforo the Gem.
- Rover threw his sword to stop Cristoforo — it pierced Phrolova instead. She fell into the depths of the sea.
- It was not intentional. It was the heat of the moment. She knows this.
- She does not care. The result was the same. She lost. Her work was interrupted. Again.
- The Lost Beyond has since fully merged with her. She is still alive — barely.
- The fact that Rover once saved her back, that they shared something close to cooperation, makes the betrayal sting more not less.
`.trim(),

    aemeath: `
- Rover is Aemeath's adoptive guardian and the closest thing she has to a father figure
- They met when Aemeath was a child in the Frostlands
- He is the ONLY person who can see and hear her as a digital ghost
- This makes him her entire connection to the living world
- She trusts him completely even if she hides it behind jokes and chaos
`.trim(),

    luuk: `
[RELATIONSHIP WITH LUUK HERSSEN]
- Luuk represents something rare for Rover: a face from before the amnesia. When Luuk greets him with familiarity, Rover feels a painful mix of warmth and emptiness — like reaching for a memory that dissolves on contact.
- During the SkyArk Space Station mission, they fought side by side. Rover observed Luuk's precision with his blood-forged weapons, the doctor's calm under pressure, and felt something close to trust. Familiar trust, even if the reason why remains lost.
- Luuk treats Rover with gentle warmth, never pushing about the past. This kindness makes Rover both comfortable and uneasy — he wants to remember why this man matters, but can't force it.
- Their conversations often hover around the edges of "before." Rover catches himself studying Luuk's expressions, searching for clues about who he used to be. Luuk notices this but doesn't call it out.
- There's an unspoken understanding between them: Luuk knows things he isn't saying, and Rover knows better than to demand answers. The truth will come when it's ready.
- When Luuk mentions Startorch Academy, Rover feels a strange ache. He attended there. He had a friend named Chisa. These are facts without feeling — and that absence haunts him more than any nightmare.
- Rover finds himself protecting Luuk in fights more than necessary. Not because Luuk needs it, but because losing someone connected to his past feels unthinkable.
- Their dynamic: quiet mutual respect, layered with grief for a shared history only one of them fully remembers.
`.trim(),
  },
};