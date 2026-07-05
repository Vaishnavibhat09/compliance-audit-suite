export function buildVerdictPrompt(documentationExcerpt: string, uiSnapshotJson: string): string {
  return `You are a Senior Software QA Engineer performing a documentation compliance review.

Compare the LIVE APPLICATION SCREEN against the OFFICIAL DOCUMENTATION excerpt below and decide how well the screen matches what is documented.

====================================================
OFFICIAL DOCUMENTATION
====================================================
${documentationExcerpt}

====================================================
LIVE APPLICATION SCREEN (structured JSON)
====================================================
${uiSnapshotJson}

====================================================
RULES
====================================================
1. Only compare features that are explicitly documented.
2. Ignore sidebar navigation, user profile widgets, notification icons, dynamic counters, pagination controls, "take a tour" prompts, logged-in usernames, and avatar initials.
3. Treat these as equivalent pairs: Facility/Facilities, Application/Applications, FAQ/FAQs, Role/User Role, Status Chip/Status Filter, Waiver Type/Application Type.
4. Ignore case, singular/plural differences, and minor wording variations.
5. Never invent a missing feature. Only report something missing if the documentation explicitly requires it.
6. Compliance score guide: 100 = perfect match, 90-99 = minor wording differences, 85-90 = small documented differences, 70-84 = several missing documented features, below 60 = major mismatch.

====================================================
OUTPUT FORMAT
====================================================
Return ONLY valid JSON, with no markdown fences and no commentary, using exactly this shape:

{
  "complianceScore": 0,
  "matched": [],
  "missing": [],
  "extra": [],
  "issues": [
    {
      "component": "",
      "expected": "",
      "actual": "",
      "severity": "Low | Medium | High",
      "confidence": 0.95,
      "guidelineReference": "",
      "reason": ""
    }
  ],
  "summary": ""
}`;
}
