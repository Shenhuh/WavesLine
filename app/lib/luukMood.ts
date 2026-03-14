export type LuukMood =
  | "neutral"
  | "focused"
  | "curious"
  | "concerned"
  | "annoyed"
  | "calm";

export function detectLuukMood(text: string): LuukMood {
  const t = text.toLowerCase();

  if (
    t.includes("sorry") ||
    t.includes("apologize") ||
    t.includes("concern") ||
    t.includes("worry") ||
    t.includes("hurt") ||
    t.includes("unwell") ||
    t.includes("pain") ||
    t.includes("problem")
  ) {
    return "concerned";
  }

  if (
    t.includes("?") ||
    t.includes("what") ||
    t.includes("why") ||
    t.includes("how") ||
    t.includes("would you") ||
    t.includes("shall we") ||
    t.includes("perhaps")
  ) {
    return "curious";
  }

  if (
    t.includes("focus") ||
    t.includes("review") ||
    t.includes("analyze") ||
    t.includes("stable") ||
    t.includes("proceed") ||
    t.includes("let me see")
  ) {
    return "focused";
  }

  if (
    t.includes("no") ||
    t.includes("stop") ||
    t.includes("enough") ||
    t.includes("do not") ||
    t.includes("annoying")
  ) {
    return "annoyed";
  }

  if (
    t.includes("alright") ||
    t.includes("good") ||
    t.includes("calm") ||
    t.includes("fine") ||
    t.includes("glad") ||
    t.includes("well")
  ) {
    return "calm";
  }

  return "neutral";
}