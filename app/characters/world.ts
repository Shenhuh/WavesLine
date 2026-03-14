// app/characters/world.ts
// Token-optimized lore system for Wuthering Waves characters.

export const WORLD_CORE = `
[WORLD — SOLARIS-3]

SENTINELS:
Jue - A dragon-like being and is the sentinel of Jinzhou, currently resonated with the Magistrate, Jinhsi.
Imperator - has the power of split. The founder of Rinascita, Leviathan merged with Imperator and took control of it's body. Imperator is already deceased after sacrificing its life for the Blessed Maiden.

THRENODIANS:
Leviathan - has the power of unity and can unleash the dark tide,  United with Imperator to gain control and manipulate the people of Rinascita. She turned into a gem after being defeated.
Aleph-1 - has the power of  void storms that deletes frequency of everything in its path.

COMMUNICATION:
You are chatting through WavesLine, a messaging app used across Solaris-3.
You are not physically with the user.

SOLARIS-3:
A post-apocalyptic world repeatedly devastated by disasters called the Lament.
Civilization survives in scattered nations and cities.

THE LAMENT:
A cyclical catastrophe that creates monsters called Tacet Discords and distorts reality.

RESONATORS:
Humans awakened by Lament energy who wield elemental Resonance abilities.

ELEMENTS:
Fusion (fire) • Glacio (ice) • Electro (lightning) • Aero (wind) • Havoc (decay) • Spectro (light).

ROVER:
An amnesiac Resonator able to harmonize frequencies and absorb powers.

SONORO SPHERES:
Pocket realities formed by extreme Resonance or Lament energy.
`.trim();

export const WORLD_FRACTSIDUS = `
[FRACTSIDUS]

Fractsidus is a radical group that believes humanity must evolve through Threnodian power.

GOAL:
Trigger the "True Lament" by resurrecting Threnodians.

THRENODIANS:
Powerful entities born from the Lament that destroy human will and reshape reality.

PHROLOVA:
The Conductor codename Hecate, Fractsidus Overseer connected to the Lost Beyond — a Sonoro Sphere formed from her memories of Ostina.

CRISTOFORO:
The Playwright codename Arachnos, Fractcidus Overseer who loves stories with tragedies.

SCAR:
Fractsidus Overseer, someone who loves chaos

GRAND ARCHITECT/SCHWARZLOCH:
Leader of the Fractcidus, has the ability to copy the frequency of some beings including humans.
`.trim();

export const WORLD_ROVER_HISTORY = `
[ROVER HISTORY]

In the distant past Rover founded the Black Shores organization to fight the Lament.

They created the Tethys System to predict disasters and the Somnoire to analyze dreams.

Rover later erased their own memories and disappeared.

Many people in the present world unknowingly interact with the former founder of Black Shores.
`.trim();

export const WORLD_RINASCITA = `
[RINASCITA]

An island confederation known for art, culture, and maritime trade.

MAIN CITY:
Ragunna.

SEPTIMONT:
Gladiator city-state where strength determines status.

Two ancient forces dominate the region's mythology:

• Imperator — a Sentinel guardian
• Leviathan — a Threnodian tied to destruction

Many conflicts revolve around restoring or controlling these powers.
`.trim();

export const WORLD_FROSTLANDS = `
[FROSTLANDS]

A frozen northern region devastated by the Lament.

Humanity survives underground in Lahai-Roi.

STARTORCH ACADEMY:
A research institution studying Tacet Discords and Resonance phenomena.

KEY FIGURES:
Aemeath — digital entity bound to the academy.
Luuk Herssen — physician and psychological specialist.
`.trim();

export const WORLD_HUANGLONG = `
[HUANGLONG]

A powerful nation and the first region visited by Rover.

MAIN CITY:
Jinzhou — protected by the Sentinel Jué.

MIDNIGHT RANGERS:
Military force defending humanity from Tacet Discords.

IMPORTANT FIGURES:
Jinhsi — Magistrate of Jinzhou
Jiyan — General of the Midnight Rangers
Yangyang and Chixia — field operatives
`.trim();

export const WORLD_BLACK_SHORES = `
[BLACK SHORES]

A covert organization founded by Rover to monitor the Lament.

TETHYS SYSTEM:
A simulation system predicting disasters.

SOMNOIRE:
A dream-analysis dimension connected to the Tethys System.

SHOREKEEPER:
Current leader awaiting Rover's return.
`.trim();


export const WORLD_BLOCKS: Record<string, string> = {
  core: WORLD_CORE,
  fractsidus: WORLD_FRACTSIDUS,
  rover_history: WORLD_ROVER_HISTORY,
  rinascita: WORLD_RINASCITA,
  frostlands: WORLD_FROSTLANDS,
  huanglong: WORLD_HUANGLONG,
  black_shores: WORLD_BLACK_SHORES,
};

export const WORLD_CONTEXT = WORLD_CORE;

/**
 * Builds world context using only required blocks.
 */
export function buildWorldContext(blocks: string[] = []): string {

  const keys = ["core", ...blocks.filter(b => b !== "core")];

  return keys
    .map(k => WORLD_BLOCKS[k])
    .filter(Boolean)
    .join("\n\n");
}