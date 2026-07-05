import { describe, it, expect } from "vitest";
import { reconcileComponent } from "../src/services/alignment/componentReconciler";
import { reconcileElements } from "../src/services/alignment/elementReconciler";
import { computeComplianceScore } from "../src/services/adjudication/verdictScorer";

describe("reconcileComponent", () => {
  it("matches expected and actual table headers allowing for wording drift", () => {
    const result = reconcileComponent(["Name", "Status", "Submitted Date"], ["name", "Status", "Submission Date"]);
    expect(result.matched).toContain("Name");
    expect(result.matched).toContain("Status");
  });

  it("reports genuinely missing headers", () => {
    const result = reconcileComponent(["Name", "Owner"], ["Name"]);
    expect(result.missing).toEqual(["Owner"]);
  });

  it("reports unexplained extra headers", () => {
    const result = reconcileComponent(["Name"], ["Name", "Internal Debug Id"]);
    expect(result.extra).toEqual(["Internal Debug Id"]);
  });
});

describe("reconcileElements", () => {
  it("treats plural/singular variants as the same feature", () => {
    const result = reconcileElements(["Facility"], ["Facilities"]);
    expect(result.matched).toEqual(["Facility"]);
    expect(result.missing).toEqual([]);
  });
});

describe("computeComplianceScore", () => {
  it("scores a perfect match as 100", () => {
    expect(computeComplianceScore(["A", "B"], [], [])).toBe(100);
  });

  it("penalizes extra undocumented elements", () => {
    const withExtras = computeComplianceScore(["A", "B"], [], ["X", "Y"]);
    const withoutExtras = computeComplianceScore(["A", "B"], [], []);
    expect(withExtras).toBeLessThan(withoutExtras);
  });

  it("returns 100 when nothing was expected at all", () => {
    expect(computeComplianceScore([], [], [])).toBe(100);
  });
});
