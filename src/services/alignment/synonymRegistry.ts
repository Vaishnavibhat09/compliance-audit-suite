/** Pairs of terms the reconcilers should treat as interchangeable. */
export const SYNONYM_PAIRS: Record<string, string> = {
  facility: "facilities",
  facilities: "facility",
  application: "applications",
  applications: "application",
  faq: "faqs",
  faqs: "faq",
  ticket: "tickets",
  tickets: "ticket",
  user: "users",
  users: "user",
  filter: "filters",
  filters: "filter",
  "status chip": "status filter",
  "status filter": "status chip",
  waiver: "waiver request",
  "waiver request": "waiver",
  "rows per page": "pagination",
  "page arrows": "pagination",
  search: "search box",
};

/** UI text that is chrome, not a documented feature -- always ignored. */
export const UI_CHROME_NOISE = new Set([
  "take a tour",
  "+ new application",
  "search",
  "ad",
  "profile",
  "notifications",
  "logout",
  "dashboard",
  "previous",
  "next",
]);

/** Descriptive documentation phrasing that should never be treated as a UI label. */
export const PROSE_NOISE_PHRASES = [
  "page lets",
  "page allows",
  "page enables",
  "page displays",
  "the following",
  "overview",
];

export function normalizeForMatching(text: string): string {
  const lower = String(text).trim().toLowerCase();
  return SYNONYM_PAIRS[lower] || lower;
}

/** Broader normalization used by the loose element reconciler (pluralization folding). */
export function foldPlurals(text: string): string {
  return text
    .toLowerCase()
    .replace(/\bfaq\b/g, "faqs")
    .replace(/\bfacility\b/g, "facilities")
    .replace(/\bapplication\b/g, "applications")
    .replace(/\buser\b/g, "users")
    .trim();
}
