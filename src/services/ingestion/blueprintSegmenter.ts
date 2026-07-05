import { PdfPage } from "./pdfTextExtractor";

export interface RawSection {
  title: string;
  page: number;
  content: string;
}

const SECTION_HEADER_PATTERN = /^(S\s*E\s*C\s*T\s*I\s*O\s*N|SECTION)\s*\d+/i;
const NUMBERED_SECTION_PATTERN = /^\d+(?:\.\d+)*[.)]\s+.+$/;
const NOISE_PREFIXES = ["figure", "table", "section", "page", "document"];

function isSectionHeader(line: string): boolean {
  return SECTION_HEADER_PATTERN.test(line) || NUMBERED_SECTION_PATTERN.test(line);
}

function extractSectionTitle(line: string): string | null {
  if (SECTION_HEADER_PATTERN.test(line)) {
    return null;
  }

  const match = line.match(/^\d+(?:\.\d+)*[.)]\s+(.+)$/);
  return match ? match[1].trim().replace(/\s+/g, " ") : null;
}

function looksLikeTitle(line: string): boolean {
  if (!line || line.length > 80) return false;
  const lower = line.toLowerCase();
  if (lower.startsWith("url") || lower.startsWith("figure") || lower.startsWith("table") || lower.startsWith("section")) {
    return false;
  }
  if (/^\d+\.\s/.test(line)) return false;
  const wordCount = line.split(/\s+/).filter(Boolean).length;
  return /[A-Za-z]/.test(line) && wordCount <= 8;
}

function isNoiseLine(line: string): boolean {
  const lower = line.toLowerCase();
  return NOISE_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

function isMeaningful(section: RawSection): boolean {
  const title = section.title.trim();
  const content = section.content.trim();
  if (!title || !content) return false;
  return content.split(/\s+/).filter(Boolean).length >= 4;
}

/**
 * Walks every line of the parsed PDF and groups content underneath
 * "SECTION n" style headers into { title, content, page } blocks. This
 * mirrors how a human skimming a user guide would break it into topics.
 */
export function segmentIntoSections(pages: PdfPage[]): RawSection[] {
  const sections: RawSection[] = [];
  let current: RawSection | null = null;

  for (const page of pages) {
    const lines = page.text.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const normalized = line.replace(/\s+/g, " ");

      if (isSectionHeader(normalized)) {
        if (current && isMeaningful(current)) {
          sections.push(current);
        }

        const title = extractSectionTitle(normalized);
        current = { title: title ?? "", content: "", page: page.page };
        continue;
      }

      if (!current) {
        if (looksLikeTitle(normalized)) {
          current = { title: normalized, content: "", page: page.page };
        }
        continue;
      }

      if (current.title === "" && looksLikeTitle(normalized)) {
        current.title = normalized;
        continue;
      }

      if (current.content.trim() && looksLikeTitle(normalized)) {
        if (isMeaningful(current)) {
          sections.push(current);
        }
        current = { title: normalized, content: "", page: page.page };
        continue;
      }

      if (isNoiseLine(normalized)) continue;

      current.content += normalized + "\n";
    }
  }

  if (current && isMeaningful(current)) {
    sections.push(current);
  }

  if (sections.length === 0) {
    const fallbackText = pages.map((page) => page.text.trim()).filter(Boolean).join("\n\n");
    if (fallbackText) {
      sections.push({
        title: "Document",
        page: pages[0]?.page ?? 1,
        content: fallbackText,
      });
    }
  }

  return sections;
}
