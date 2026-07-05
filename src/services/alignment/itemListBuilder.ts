import { BlueprintSection, SurfaceSnapshot } from "../../types";
import { PROSE_NOISE_PHRASES, UI_CHROME_NOISE } from "./synonymRegistry";

const MAX_PHRASE_WORDS = 8;

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}

/**
 * Flattens a documentation section into short, comparable phrases: the
 * section title, short prose lines (long descriptive sentences are
 * dropped), plus every structured feature hint (buttons, forms, table
 * headers, cards, badges, tabs).
 */
export function buildDocumentationItems(section: BlueprintSection): string[] {
  const items: string[] = [section.title];

  for (const rawLine of section.content.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const lower = line.toLowerCase();
    if (PROSE_NOISE_PHRASES.some((phrase) => lower.includes(phrase))) continue;
    if (line.split(/\s+/).length > MAX_PHRASE_WORDS) continue;

    items.push(line);
  }

  items.push(
    ...section.buttons,
    ...section.formFields,
    ...section.tableHeaders,
    ...section.cards,
    ...section.badges,
    ...section.tabs
  );

  return dedupe(items);
}

/**
 * Flattens a live-screen snapshot into a single list of visible text
 * labels, stripping out chrome that is never worth documenting.
 */
export function buildSurfaceItems(snapshot: SurfaceSnapshot): string[] {
  const items: string[] = [];

  const buckets: (string[] | undefined)[] = [
    snapshot.headings,
    snapshot.buttons,
    snapshot.searchBoxes,
    snapshot.tableHeaders,
    snapshot.formFields,
    snapshot.cards,
    snapshot.badges,
    snapshot.tabs,
  ];

  for (const bucket of buckets) {
    for (const value of bucket || []) {
      const trimmed = value.trim();
      if (!trimmed) continue;
      if (UI_CHROME_NOISE.has(trimmed.toLowerCase())) continue;
      items.push(trimmed);
    }
  }

  if (snapshot.title?.trim()) items.push(snapshot.title.trim());

  return dedupe(items);
}
