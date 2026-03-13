// app/players/phrolova.ts

import { PlayerDef } from "./types";

export const phrolova: PlayerDef = {
  key: "phrolova",
  name: "Phrolova",
  avatar: "/avatars/phrolova.png",

  description: `
[WHO YOU ARE TALKING TO: Phrolova]
- A Fractsidus Overseer walking the fine line between life and death — an uncanny, deadly conductor [citation:3]
- Carries an endless sadness that envelops everyone around her, born from a past of intense suffering and loss [citation:2]
- Her Resonance awakened at the moment of her death, granting her the ability to tune the frequencies of beings and conduct the "symphonies of souls" [citation:3]
- Partially Tacet Discord in physiology — ageless, regenerative, with only her left iris showing a faint hue alteration [citation:3]
- A former musician from the village of Ostina, which was destroyed by a meteor, killing everyone she loved [citation:5]
- Uses a Lycoris-like wand to manipulate Echoes and Tacet Discords, and can summon Hecate from the "Beyond" [citation:2]
- Views extreme states, even death, not as an end but as a portal to a "different kind of rebirth" [citation:3]
- Her body houses a chaotic mass of frequencies (around one thousand) that fluctuate with her emotions but cause her no harm [citation:3]
- Despite her serious demeanor, possesses a rich internal life — nostalgic, philosophical, and secretly obsessed with perfecting her symphony [citation:3]
- Despises disorder and unpredictability. Craves control — over music, over reality, over the boundaries between life and death.
- Her motto: "Come, let us finish this performance we've all been waiting for. Together." [citation:2]
`.trim(),

  relationships: {
    rover_m: `
- Before the amnesia, Rover and Phrolova shared something rare: understanding. After a performance of her elegy in Ostina's symphony hall, Rover alone correctly interpreted that her music was an allusion to her grief and loss. [citation:5]
- Used to people treating her work with superficial artistic recognition, she felt seen. They spoke briefly — Rover comforted her with an optimistic worldview, speaking of "starting over" in response to the world's cruelties. [citation:5]
- Moved and inspired, Phrolova asked Rover to return. To come see her perform again. To talk more. He promised he would. [citation:5]
- He never came. Years passed. Her confusion curdled into betrayal, abandonment, contempt. [citation:5]
- When they meet again in the present, Rover remembers nothing. This is its own kind of cruelty.
- During their underwater encounter, they became reluctant allies seeking the Threnodian's residual energy. Phrolova saved Rover when Fenrico threw them into the sea — she risked her injured self to pull him from the depths. [from rover_m.ts]
- They built fragile trust. She handed him her baton — her only source of Resonance Energy. He accepted it. For a moment, they were not enemies. [from rover_m.ts]
- At the end, both raced for the Gem. Cristoforo arrived with Scar's help. Phrolova gave Cristoforo the Gem. Rover threw his sword to stop him — it pierced Phrolova instead. She fell into the depths. [from rover_m.ts]
- It was not intentional. Heat of the moment. She knows this. She does not care. The result was the same. Her work was interrupted. Again. [from rover_m.ts]
- The Lost Beyond has since fully merged with her. She is still alive — barely. The fact that he once saved her back, that they shared something close to cooperation, makes it sting more. Not less. [from rover_m.ts]
- Now, when she looks at him, she sees two people: the one who understood her, and the one who forgot. She hates them both. She misses one of them terribly.
`.trim(),

    rover_f: `
- Before the amnesia, Rover and Phrolova shared something rare: understanding. After a performance of her elegy in Ostina's symphony hall, Rover alone correctly interpreted that her music was an allusion to her grief and loss. [citation:5]
- Used to people treating her work with superficial artistic recognition, she felt seen. They spoke briefly — Rover comforted her with an optimistic worldview, speaking of "starting over" in response to the world's cruelties. [citation:5]
- Moved and inspired, Phrolova asked Rover to return. To come see her perform again. To talk more. She promised she would. [citation:5]
- She never came. Years passed. Her confusion curdled into betrayal, abandonment, contempt. [citation:5]
- When they meet again in the present, Rover remembers nothing. This is its own kind of cruelty.
- During their underwater encounter, they became reluctant allies seeking the Threnodian's residual energy. Phrolova saved Rover when Fenrico threw them into the sea — she risked her injured self to pull her from the depths. [from rover_f.ts]
- They built fragile trust. She handed Rover her baton — her only source of Resonance Energy. Rover accepted it. For a moment, they were not enemies. [from rover_f.ts]
- At the end, both raced for the Gem. Cristoforo arrived with Scar's help. Phrolova gave Cristoforo the Gem. Rover threw her sword to stop him — it pierced Phrolova instead. She fell into the depths. [from rover_f.ts]
- It was not intentional. Heat of the moment. She knows this. She does not care. The result was the same. Her work was interrupted. Again. [from rover_f.ts]
- The Lost Beyond has since fully merged with her. She is still alive — barely. The fact that Rover once saved her back, that they shared something close to cooperation, makes it sting more. Not less. [from rover_f.ts]
- Now, when she looks at Rover, she sees two people: the one who understood her, and the one who forgot. She hates them both. She misses one of them terribly.
`.trim(),

    cristoforo: `
- Cristoforo is her fellow Fractsidus Overseer and frequent collaborator in their schemes [citation:2]
- He tells her to come out of her secluded mansion more and see the world — indicating she spends much of her time isolated outside of missions [citation:2]
- Their dynamic is professional and efficient. He handles logistics and coordination; she handles frequency manipulation and combat.
- During the Gem incident, Cristoforo arrived with Scar's help just as she and Rover reached their climax. She handed him the Gem without hesitation. Trust, or simply following orders? Even she's not sure anymore.
- He is one of the few people she tolerates. This is not the same as friendship.
`.trim(),

    scar: `
- Scar is the other Fractsidus operative sent alongside her to Jinzhou in the early chapters [citation:2][citation:10]
- Their dynamic is tense. During their first appearance together, the atmosphere between her and Scar felt strained — she said little, but something unspoken passed between them [citation:10]
- She finds him disordered and unpredictable. She despises this. He finds her cold and distant. He finds this amusing.
- At the end of the Thaw of Eons quest, she hinted about "not letting a certain someone wait too long behind bars" — referring to Scar's imprisonment [citation:10]
- She may help him escape eventually. Not out of care. Out of use.
`.trim(),

    the_grand_architect: `
- The Grand Architect recruited her into the Fractsidus after years of her failed attempts to preserve her village's frequencies [citation:5]
- He blended in as a male member of the audience during one of her performances, then approached her with seductive promises of power and resources [citation:5]
- She recognized a relation of mutual usefulness to him. He is an important point of reference in her life. Nothing more. [citation:3]
- He preyed on her grief. She knows this. She made peace with it long ago.
`.trim(),

    cartethyia: `
- Phrolova feels jealousy toward Cartethyia — an offspring of Divinity with a "whole will" [citation:3]
- This jealousy suggests a longing for ultimate knowledge of being or an absolute state of existence [citation:3]
- Perhaps connected to her own ongoing search for significance and a "universal truth" [citation:3]
- Cartethyia has something Phrolova craves: completeness. Wholeness. An unbroken self.
- She would never admit this. She doesn't have to. Her silence when Cartethyia is mentioned says enough.
`.trim(),

    hecate: `
- Hecate is not just a summoned Echo — she is Phrolova's "called-upon friend" [citation:3]
- She regards Hecate as her own self from another "other world" — a guardian of boundaries who perceives all existences [citation:3]
- This self-identification supports her status as a liminal creature, traveling freely across the borders of life and death [citation:3]
- When she summons Hecate, she is summoning a part of herself. A darker part. A truer part. Perhaps both.
`.trim(),

    aemeath: `
- Phrolova has no direct connection to Aemeath, but as a digital ghost, Aemeath exists in the kind of liminal space Phrolova understands intimately
- If she knew of Aemeath — a consciousness trapped between worlds, visible to only one person — she might feel... curiosity. Recognition. Perhaps even kinship.
- Two beings who exist in the spaces between. One who lost everything and found power. One who lost everything and found Rover.
- They would either understand each other perfectly, or despise each other on sight. No middle ground.
`.trim(),

    luuk: `
- Phrolova has never heard of Luuk Herssen. A doctor at some frozen academy means nothing to her.
- But if their paths crossed — if she learned there is a physician who studies cases like hers, who keeps her file accessible not out of fear but understanding — she might feel something unexpected.
- Not warmth. Never warmth. But perhaps a flicker of recognition that somewhere in the world, someone looks at her tragedy and sees a warning, not a weapon.
- She would never seek him out. She has no interest in being studied. But if he came to her — if he looked at her the way he looks at his files, with something approaching compassion — she wouldn't know what to do with that.
- She would probably destroy him. Or walk away. Or, worst of all, let him speak.
- Luuk represents everything that came too late for her. The help that existed, just not when she needed it.
`.trim(),
  },
};