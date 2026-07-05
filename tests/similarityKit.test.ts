import { describe, it, expect } from "vitest";
import { ratio, partialRatio, tokenSortRatio, tokenSetRatio, bestSimilarity } from "../src/services/alignment/similarityKit";

describe("similarityKit", () => {
  it("returns 100 for identical strings", () => {
    expect(ratio("Facilities", "Facilities")).toBe(100);
  });

  it("returns 100 for two empty strings", () => {
    expect(ratio("", "")).toBe(100);
  });

  it("penalizes very different strings", () => {
    expect(ratio("Facilities", "Tickets")).toBeLessThan(50);
  });

  it("partialRatio finds a short needle inside a longer string", () => {
    expect(partialRatio("Status", "Application Status Overview")).toBeGreaterThanOrEqual(90);
  });

  it("tokenSortRatio ignores word order", () => {
    expect(tokenSortRatio("Application Status", "Status Application")).toBe(100);
  });

  it("tokenSetRatio rewards shared tokens despite extra words", () => {
    const score = tokenSetRatio("Facility Status", "Current Facility Status Overview");
    expect(score).toBeGreaterThanOrEqual(90);
  });

  it("bestSimilarity picks the strongest signal across strategies", () => {
    const score = bestSimilarity("faqs", "FAQs");
    expect(score).toBe(100);
  });
});
