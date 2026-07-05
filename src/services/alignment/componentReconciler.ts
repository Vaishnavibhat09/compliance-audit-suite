import { tokenSortRatio } from "./similarityKit";
import { normalizeForMatching } from "./synonymRegistry";
import { ReconciliationSet } from "../../types";

const DEFAULT_THRESHOLD = 80;

/**
 * Compares one structured component (e.g. all documented table headers vs
 * all table headers actually rendered) using synonym-aware token matching.
 * Unlike the looser elementReconciler this expects each list to represent
 * the same kind of thing, so the threshold can be stricter.
 */
export function reconcileComponent(
  expected: string[],
  actual: string[],
  threshold: number = DEFAULT_THRESHOLD
): ReconciliationSet {
  const matched: string[] = [];
  const missing: string[] = [];
  const matchedActual = new Set<string>();

  for (const expectedItem of expected || []) {
    const expectedNormalized = normalizeForMatching(expectedItem);

    let bestScore = 0;
    let bestActual: string | null = null;

    for (const actualItem of actual || []) {
      const score = tokenSortRatio(expectedNormalized, normalizeForMatching(actualItem));
      if (score > bestScore) {
        bestScore = score;
        bestActual = actualItem;
      }
    }

    if (bestScore >= threshold && bestActual !== null) {
      matched.push(expectedItem);
      matchedActual.add(bestActual);
    } else {
      missing.push(expectedItem);
    }
  }

  const extra = (actual || []).filter((item) => !matchedActual.has(item));

  return { matched, missing, extra };
}
