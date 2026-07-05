import { Verdict, VerdictIssue } from "../../types";

const FALLBACK_VERDICT: Verdict = {
  complianceScore: 0,
  matched: [],
  missing: [],
  extra: [],
  issues: [],
  summary: "The AI response could not be parsed as JSON.",
};

function tryParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // fall through to regex extraction
  }

  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }

  return null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asIssueArray(value: unknown): VerdictIssue[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => item && typeof item === "object")
    .map((item: any) => ({
      component: String(item.component ?? ""),
      expected: String(item.expected ?? ""),
      actual: String(item.actual ?? ""),
      severity: ["Low", "Medium", "High"].includes(item.severity) ? item.severity : "Medium",
      confidence: typeof item.confidence === "number" ? item.confidence : 0.9,
      guidelineReference: String(item.guidelineReference ?? item.guideline_reference ?? ""),
      reason: String(item.reason ?? ""),
    }));
}

/**
 * Guarantees that whatever the LLM returned -- clean JSON, JSON wrapped in
 * markdown fences, or garbage -- callers always receive a fully-shaped
 * Verdict object with the correct field types.
 */
export function sanitizeVerdict(rawResponse: string): Verdict {
  const parsed = tryParse(rawResponse);

  if (!parsed || typeof parsed !== "object") {
    return { ...FALLBACK_VERDICT };
  }

  const data = parsed as Record<string, unknown>;

  const complianceScoreRaw = data.complianceScore ?? data.compliance_score;
  const complianceScore =
    typeof complianceScoreRaw === "number" ? complianceScoreRaw : 0;

  return {
    complianceScore,
    matched: asStringArray(data.matched),
    missing: asStringArray(data.missing),
    extra: asStringArray(data.extra),
    issues: asIssueArray(data.issues),
    summary: typeof data.summary === "string" ? data.summary : "",
  };
}
