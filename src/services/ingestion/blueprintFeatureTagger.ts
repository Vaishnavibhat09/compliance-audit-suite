import { RawSection } from "./blueprintSegmenter";
import { BlueprintSection } from "../../types";

function unique(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function extractButtons(text: string): string[] {
  const patterns = [
    /Click\s+([A-Za-z0-9+ ]+)/gi,
    /button\s+([A-Za-z0-9+ ]+)/gi,
    /Use\s+([A-Za-z0-9+ ]+)/gi,
    /select\s+([A-Za-z0-9+ ]+)/gi,
  ];

  const found: string[] = [];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const value = match[1].trim();
      if (value.length < 40) found.push(value);
    }
  }
  return unique(found);
}

function extractTableHeaders(text: string): string[] {
  const patterns = [
    /columns?\s+(.*?)(?:\.|\n)/i,
    /listed with the columns\s+(.*?)(?:\.|\n)/i,
    /table lists.*?columns\s+(.*?)(?:\.|\n)/i,
  ];

  const found: string[] = [];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    for (let item of match[1].split(/,|and/)) {
      item = item.trim().replace("the columns", "").replace("columns", "");
      if (item.length > 1) found.push(item);
    }
  }
  return unique(found);
}

function extractFormFields(text: string): string[] {
  const keywords = ["Status", "Priority", "Name", "Email", "Password", "Facility", "Role", "Search"];
  return unique(keywords.filter((word) => new RegExp(`\\b${word}\\b`, "i").test(text)));
}

function extractCharts(text: string): string[] {
  const chartTypes = ["chart", "graph", "doughnut", "pie", "bar", "line"];
  return unique(chartTypes.filter((word) => new RegExp(`\\b${word}\\b`, "i").test(text)));
}

function extractTabs(text: string): string[] {
  const match = text.match(/tabs?\s+[—:-]?\s*(.*?)(?:\.|\n)/i);
  if (!match) return [];
  return unique(
    match[1]
      .split(/,|and/)
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function extractCards(text: string): string[] {
  const keywords = [
    "card",
    "cards",
    "Profile Information",
    "Organisation",
    "Notifications",
    "Security",
    "Features",
    "Applications Overview",
    "Facilities Status Overview",
  ];
  const lower = text.toLowerCase();
  return unique(keywords.filter((word) => lower.includes(word.toLowerCase())));
}

function extractBadges(text: string): string[] {
  const values = [
    "Active",
    "Upcoming",
    "Expired",
    "Draft",
    "Submitted",
    "Approved",
    "Rejected",
    "Done",
    "In Process",
    "High",
    "Medium",
    "Low",
  ];
  return unique(
    values.filter((value) =>
      new RegExp(`\\b${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text)
    )
  );
}

/**
 * Enriches a raw {title, content, page} block with the structural UI hints
 * that a documentation writer typically embeds in prose (button names,
 * table columns, status badges, and so on).
 */
export function tagSectionFeatures(section: RawSection): BlueprintSection {
  const content = section.content || "";
  return {
    title: section.title,
    page: section.page,
    content,
    buttons: extractButtons(content),
    tableHeaders: extractTableHeaders(content),
    formFields: extractFormFields(content),
    charts: extractCharts(content),
    cards: extractCards(content),
    tabs: extractTabs(content),
    badges: extractBadges(content),
  };
}
