import { describe, it, expect } from "vitest";
import { sanitizeVerdict } from "../src/services/adjudication/verdictSanitizer";

describe("verdictSanitizer", () => {
  it("parses clean JSON directly", () => {
    const verdict = sanitizeVerdict(
      JSON.stringify({
        complianceScore: 88,
        matched: ["Add Facility"],
        missing: ["Export"],
        extra: [],
        issues: [],
        summary: "Mostly aligned.",
      })
    );

    expect(verdict.complianceScore).toBe(88);
    expect(verdict.matched).toEqual(["Add Facility"]);
    expect(verdict.missing).toEqual(["Export"]);
  });

  it("extracts JSON embedded in markdown fences or commentary", () => {
    const raw = 'Sure, here is the result:\n```json\n{"complianceScore": 70, "matched": [], "missing": ["A"], "extra": [], "issues": [], "summary": "ok"}\n```';
    const verdict = sanitizeVerdict(raw);
    expect(verdict.complianceScore).toBe(70);
    expect(verdict.missing).toEqual(["A"]);
  });

  it("falls back to a safe default for unparsable content", () => {
    const verdict = sanitizeVerdict("not json at all");
    expect(verdict.complianceScore).toBe(0);
    expect(verdict.matched).toEqual([]);
    expect(verdict.summary).toContain("could not be parsed");
  });

  it("coerces malformed issue severities to a safe default", () => {
    const verdict = sanitizeVerdict(
      JSON.stringify({
        complianceScore: 50,
        matched: [],
        missing: [],
        extra: [],
        issues: [{ component: "X", expected: "Y", actual: "Z", severity: "URGENT!!" }],
        summary: "",
      })
    );
    expect(verdict.issues[0].severity).toBe("Medium");
  });
});
