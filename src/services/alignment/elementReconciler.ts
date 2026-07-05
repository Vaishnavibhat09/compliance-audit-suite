import { bestSimilarity } from "./similarityKit";
import { foldPlurals } from "./synonymRegistry";
import { ReconciliationSet } from "../../types";

const DEFAULT_THRESHOLD = 65;
const MAX_PHRASE_WORDS = 8;

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}

/**
 * Deterministic, dependency-light fallback for comparing free-text
 * documentation phrases against the labels captured from the live UI. This
 * is what keeps the pipeline useful even when the LLM adjudication step is
 * unavailable, and also feeds the LLM prompt as ground truth candidates.
 */
export function reconcileElements(
  documentationItems: string[],
  uiItems: string[],
  threshold: number = DEFAULT_THRESHOLD
): ReconciliationSet {
  const docs = dedupe(documentationItems);
  const ui = dedupe(uiItems);
  const normalizedUi = ui.map((item) => foldPlurals(item));

  const matched: string[] = [];
  const missing: string[] = [];

  for (const doc of docs) {
    const trimmed = doc.trim();
    if (trimmed.split(/\s+/).length > MAX_PHRASE_WORDS) continue;

    const docNormalized = foldPlurals(trimmed);
    const best = normalizedUi.reduce(
      (acc, uiValue) => Math.max(acc, bestSimilarity(docNormalized, uiValue)),
      0
    );

    if (best >= threshold) {
      matched.push(trimmed);
    } else {
      missing.push(trimmed);
    }
  }

  const normalizedDocs = docs.map((item) => foldPlurals(item));
  const extra: string[] = [];

  for (const item of ui) {
    const itemNormalized = foldPlurals(item);
    const best = normalizedDocs.reduce(
      (acc, docValue) => Math.max(acc, bestSimilarity(itemNormalized, docValue)),
      0
    );
    if (best < threshold) extra.push(item);
  }

  return { matched, missing, extra };
}
