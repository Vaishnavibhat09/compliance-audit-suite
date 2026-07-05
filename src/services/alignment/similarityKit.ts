/**
 * Small, dependency-free string similarity toolkit. Every score is
 * normalized to the 0-100 range so callers can reason about thresholds the
 * same way regardless of which function produced the score.
 */

function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[rows - 1][cols - 1];
}

/** Plain edit-distance ratio: how similar are the two full strings. */
export function ratio(a: string, b: string): number {
  if (!a && !b) return 100;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;
  const distance = levenshteinDistance(a, b);
  return Math.round((1 - distance / maxLen) * 100);
}

/** Best ratio found when sliding the shorter string across the longer one. */
export function partialRatio(a: string, b: string): number {
  if (!a || !b) return ratio(a, b);

  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  if (shorter.length === 0) return 0;

  let best = 0;
  for (let i = 0; i <= longer.length - shorter.length; i += 1) {
    const window = longer.slice(i, i + shorter.length);
    best = Math.max(best, ratio(shorter, window));
    if (best === 100) break;
  }
  return best;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Ratio computed after alphabetically sorting each string's tokens. */
export function tokenSortRatio(a: string, b: string): number {
  const sortedA = tokenize(a).sort().join(" ");
  const sortedB = tokenize(b).sort().join(" ");
  return ratio(sortedA, sortedB);
}

/** Set-based ratio: rewards shared tokens even when extra words differ. */
export function tokenSetRatio(a: string, b: string): number {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));

  const intersection = [...tokensA].filter((t) => tokensB.has(t)).sort();
  const onlyA = [...tokensA].filter((t) => !tokensB.has(t)).sort();
  const onlyB = [...tokensB].filter((t) => !tokensA.has(t)).sort();

  const base = intersection.join(" ");
  const combinedA = [base, onlyA.join(" ")].filter(Boolean).join(" ").trim();
  const combinedB = [base, onlyB.join(" ")].filter(Boolean).join(" ").trim();

  return Math.max(
    ratio(base, base),
    ratio(combinedA, combinedB),
    ratio(base, combinedA),
    ratio(base, combinedB)
  );
}

/** Best score across all four strategies -- used for loose fuzzy matching. */
export function bestSimilarity(a: string, b: string): number {
  return Math.max(ratio(a, b), partialRatio(a, b), tokenSortRatio(a, b));
}
