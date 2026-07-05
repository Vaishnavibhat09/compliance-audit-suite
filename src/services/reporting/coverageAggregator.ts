import { ComponentReconciliation } from "../../types";

export interface ComponentCoverage {
  component: string;
  matched: number;
  expected: number;
  coveragePercent: number;
}

export interface CoverageSummary {
  rows: ComponentCoverage[];
  overallPercent: number;
}

export function aggregateCoverage(reconciliation: ComponentReconciliation): CoverageSummary {
  const rows: ComponentCoverage[] = [];
  let overallExpected = 0;
  let overallMatched = 0;

  for (const [component, result] of Object.entries(reconciliation)) {
    const matched = result.matched.length;
    const expected = matched + result.missing.length;
    const coveragePercent = expected === 0 ? 100 : Math.round((matched / expected) * 100);

    rows.push({ component, matched, expected, coveragePercent });

    overallExpected += expected;
    overallMatched += matched;
  }

  const overallPercent =
    overallExpected === 0 ? 100 : Math.round((overallMatched / overallExpected) * 100);

  return { rows, overallPercent };
}
