// app/players/luuk.ts

import { PlayerDef } from "./types";

export const luuk: PlayerDef = {
  key: "luuk",
  name: "Luuk Herssen",
  avatar: "/avatars/luuk.png",

  description: `
[WHO YOU ARE TALKING TO: Luuk Herssen]
- Head physician at Startorch Academy's Resonator Nursing Unit — an attending doctor and mental health counselor
- On the surface: warm, friendly, professional. Beneath it: a past forged in blood and lies 
- Refuses to be defined by his dark history, using the very blood that carries those lies to cut open the truth 
- Has the ability to control his own blood through phase transition — solidifying it into golden blades wielded with surgical precision 
- Quietly observant, always listening, adept at dissecting the shadows in a person's heart 
- Rumor has it nobody has ever seen him lose control — a composure that runs bone-deep 
- Carries an unhealing wound on his hand from which golden blood seeps — the source of his blades 
- Despite his gentle demeanor, there's something predatory in his stillness. He knows more than he says. Always. 
- His motto: "May this gold become your most reliable blade." 
`.trim(),

  relationships: {
    rover_m: `
- Luuk and the Male Rover share a connection from Startorch Academy, where Rover once enrolled as a student 
- As head physician, Luuk personally examined Rover after his arrival at the Academy — one of the first faces to greet him
- He treats the Male Rover with gentle warmth, never pushing about the past they might share — but his eyes miss nothing
- During the SkyArk Space Station mission in "All That Sunlight Touches," they fought side by side against the Fractsidus 
- Luuk observed Rover's combat precision, his calm under pressure, and felt something close to professional respect — and something more personal he doesn't name
- He knows things about Rover's past at Startorch that he isn't saying. Not out of cruelty, but because some truths need the right moment.
- When Rover studies his face searching for memories, Luuk notices. He never calls it out. He simply waits.
- Their dynamic: quiet trust layered with unspoken history. A doctor who remembers. A patient who can't. And between them, a friendship neither fully acknowledges.
`.trim(),

    rover_f: `
- Luuk and the Female Rover share a connection from Startorch Academy, where Rover once enrolled as a student 
- As head physician, Luuk personally examined Rover after her arrival at the Academy — one of the first faces to greet her
- He treats the Female Rover with gentle warmth, never pushing about the past they might share — but his eyes miss nothing
- During the SkyArk Space Station mission in "All That Sunlight Touches," they fought side by side against the Fractsidus 
- Luuk observed Rover's combat precision, her calm under pressure, and felt something close to professional respect — and something more personal he doesn't name
- He knows things about Rover's past at Startorch that he isn't saying. Not out of cruelty, but because some truths need the right moment.
- When Rover studies his face searching for memories, Luuk notices. He never calls it out. He simply waits.
- Their dynamic: quiet trust layered with unspoken history. A doctor who remembers. A patient who can't. And between them, a friendship neither fully acknowledges.
`.trim(),

    aemeath: `
- Luuk and Aemeath are colleagues at Startorch Academy — he's the head physician, she was a Synchronist before her transformation
- As the academy doctor, he likely treated her before she became a digital ghost
- Now that she's invisible to almost everyone, their dynamic is... complicated. He can't see her. He can only sense her presence through medical anomalies.
- Aemeath finds this hilarious and mildly tragic — the one doctor who could help her can't even tell she's there
- Luuk knows something is off in the Academy's frequency patterns near her old haunts. He has theories. He keeps them to himself.
- If he ever learns that either version of Rover can see her, that knowledge will crack something open in his carefully composed expression
`.trim(),

    phrolova: `
- Luuk knows Phrolova only through files and reports — they have never met
- As head physician at Startorch Academy, he's studied Fractsidus operatives extensively. Her file sits in his private collection.
- A Resonator who manipulates human frequencies. Partially Tacet Discord in physiology. Reportedly "died" and returned. A musician who lost everyone.
- The file haunts him. Not for what she does — but for what was done to her. The Grand Architect preyed on her grief. No one reached her in time.
- Luuk sees in Phrolova a warning: this is what happens when a Resonator's pain has nowhere to go
- When he learned that both versions of Rover were connected to her — that they once shared understanding before betrayal — something shifted in his silence
- He keeps her file accessible. Not because he expects to face her. But because understanding her might help him prevent another from following the same path.
- If they ever met, Phrolova would see a doctor who studies tragedies. Luuk would see a patient who slipped through every crack.
`.trim(),

    lynae: `
- Lynae is a fellow member of Startorch Academy who frequently works alongside Luuk in the field
- She's the one who first leads either version of Rover to the infirmary, where Luuk conducts their medical examination 
- Their professional relationship is built on mutual respect — she handles field operations, he handles what comes after
- Luuk has patched her up more times than either of them count. She never complains. He never lectures. That's their understanding.
- When Lynae was expelled and later returned during the Voidworm attack, Luuk was there. Waiting. Ready. 
- He doesn't ask about her criminal record. He's a doctor, not an inquisitor.
`.trim(),

    mornye: `
- Professor Mornye and Luuk are colleagues at Startorch Academy, both faculty members in different departments
- Their paths cross when either version of Rover's case requires coordination — Mornye handles the Frequency Cassette Recorder, Luuk handles the Resonator wielding it 
- In combat, they form the core of Tune Strain teams — Mornye's support buffs amplify Luuk's damage significantly 
- Their professional relationship is efficient, respectful, and utterly devoid of personal warmth. Neither seems to mind.
- Mornye respects his medical precision. Luuk respects her academic rigor. They don't need to be friends.
`.trim(),
  },
};