import { describe, it, expect } from "vitest";
import { segmentIntoSections } from "../src/services/ingestion/blueprintSegmenter";

describe("blueprintSegmenter", () => {
  it("groups content under SECTION headers into titled blocks", () => {
    const pages = [
      {
        page: 1,
        text: [
          "SECTION 1",
          "My Applications",
          "This page lets a user create a new application and track its status.",
          "Click New Application to begin. The table shows columns Name, Status, Submitted.",
          "SECTION 2",
          "Facilities",
          "This page displays every registered facility and its current occupancy status.",
          "Use the Add Facility button to register a new site.",
        ].join("\n"),
      },
    ];

    const sections = segmentIntoSections(pages);

    expect(sections.length).toBe(2);
    expect(sections[0].title).toBe("My Applications");
    expect(sections[0].content).toContain("New Application");
    expect(sections[1].title).toBe("Facilities");
  });

  it("drops sections with no meaningful body content", () => {
    const pages = [
      {
        page: 1,
        text: ["SECTION 1", "Short", "SECTION 2", "Real Section", "This has plenty of real descriptive words in it to pass the bar."].join("\n"),
      },
    ];

    const sections = segmentIntoSections(pages);
    expect(sections.length).toBe(1);
    expect(sections[0].title).toBe("Real Section");
  });

  it("falls back to numbered headings when SECTION labels are absent", () => {
    const pages = [
      {
        page: 1,
        text: [
          "1. Overview",
          "This section describes the main dashboard and the available actions.",
          "Use the navigation menu to reach each area.",
          "2. User Management",
          "This section explains how administrators create and review accounts.",
          "Search by email to find a specific account.",
        ].join("\n"),
      },
    ];

    const sections = segmentIntoSections(pages);

    expect(sections.length).toBe(2);
    expect(sections[0].title).toBe("Overview");
    expect(sections[0].content).toContain("dashboard");
    expect(sections[1].title).toBe("User Management");
  });

  it("starts sections from plain title lines when no headers are present", () => {
    const pages = [
      {
        page: 1,
        text: [
          "Overview",
          "This page explains the dashboard and the main actions available to users.",
          "User Management",
          "Administrators can create, review, and disable user accounts from this screen.",
        ].join("\n"),
      },
    ];

    const sections = segmentIntoSections(pages);

    expect(sections.length).toBe(2);
    expect(sections[0].title).toBe("Overview");
    expect(sections[1].title).toBe("User Management");
  });
});
