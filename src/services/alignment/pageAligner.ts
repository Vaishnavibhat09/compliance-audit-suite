import { BlueprintSection } from "../../types";
import { tokenSetRatio } from "./similarityKit";
import { createLogger } from "../../utils/logger";

const logger = createLogger("pageAligner");

export interface AlignmentResult {
  section: BlueprintSection | null;
  confidence: number;
}

/**
 * Three-tier lookup, from strongest to weakest signal:
 *  1. The screen title appears verbatim inside a documentation title.
 *  2. The screen title appears somewhere in a section's body text.
 *  3. Fall back to fuzzy (token-set) similarity between titles.
 */
export function alignPageToBlueprint(
  screenTitle: string,
  sections: BlueprintSection[]
): AlignmentResult {
  const needle = screenTitle.toLowerCase().trim();

  for (const section of sections) {
    if (section.title.toLowerCase().includes(needle)) {
      logResult(screenTitle, section.title, 100);
      return { section, confidence: 100 };
    }
  }

  for (const section of sections) {
    if (section.content.toLowerCase().includes(needle)) {
      logResult(screenTitle, section.title, 95);
      return { section, confidence: 95 };
    }
  }

  let best: BlueprintSection | null = null;
  let bestScore = 0;

  for (const section of sections) {
    const score = tokenSetRatio(needle, section.title.toLowerCase());
    if (score > bestScore) {
      bestScore = score;
      best = section;
    }
  }

  logResult(screenTitle, best?.title ?? "none", bestScore);
  return { section: best, confidence: bestScore };
}

function logResult(screenTitle: string, matchedTitle: string, confidence: number): void {
  logger.info("Aligned screen to blueprint section", {
    screenTitle,
    matchedTitle,
    confidence,
  });
}
