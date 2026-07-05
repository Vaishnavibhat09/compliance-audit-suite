const SUPPORT_ALIASES = new Set(["tickets", "contact", "faqs", "faq"]);
const NEXT_HEADING_PATTERN = /^[A-Z][A-Za-z0-9\s&—-]{3,}$/;

/**
 * Several live screens (Tickets, Contact, FAQs) are documented together
 * under one umbrella "Support" heading. This trims a large documentation
 * blob down to the paragraph that is actually relevant to the screen being
 * audited, so the LLM prompt stays focused.
 */
export function extractRelevantExcerpt(documentationContent: string, screenTitle: string): string {
  const title = screenTitle.toLowerCase();

  if (documentationContent.toLowerCase().includes(title)) {
    return sliceFromHeading(documentationContent, screenTitle);
  }

  if (SUPPORT_ALIASES.has(title)) {
    return sliceFromHeading(documentationContent, "Support");
  }

  return documentationContent;
}

function sliceFromHeading(documentationContent: string, heading: string): string {
  const lines = documentationContent.split("\n");
  const startIndex = lines.findIndex((line) => line.toLowerCase().includes(heading.toLowerCase()));

  if (startIndex === -1) return documentationContent;

  const collected: string[] = [lines[startIndex]];

  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (NEXT_HEADING_PATTERN.test(line)) break;
    collected.push(lines[i]);
  }

  return collected.join("\n");
}
