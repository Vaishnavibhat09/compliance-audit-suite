import { createLogger } from "../../utils/logger";

const logger = createLogger("verdictScorer");
const EXTRA_PENALTY_PER_ITEM = 1.5;
const MAX_EXTRA_PENALTY = 10;

/**
 * Deterministic scoring formula: percentage of documented items that were
 * matched, minus a small penalty for unexplained extra UI elements. This is
 * used both as the pure fuzzy-matching fallback score and as the final
 * score even when the LLM supplied its own number, keeping every report
 * consistent and reproducible.
 */
export function computeComplianceScore(matched: string[], missing: string[], extra: string[]): number {
  const matchedCount = matched.length;
  const missingCount = missing.length;
  const extraCount = extra.length;

  const expectedTotal = matchedCount + missingCount;

  if (expectedTotal === 0) {
    return 100;
  }

  let score = (matchedCount / expectedTotal) * 100;
  score -= Math.min(extraCount * EXTRA_PENALTY_PER_ITEM, MAX_EXTRA_PENALTY);
  score = Math.max(0, Math.min(100, Math.round(score)));

  logger.debug("Computed compliance score", {
    matchedCount,
    missingCount,
    extraCount,
    score,
  });

  return score;
}
