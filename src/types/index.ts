export type AiProvider = "groq" | "openai" | "gemini";

export type AuditStatus =
  | "queued"
  | "reading_blueprint"
  | "inspecting_surface"
  | "reconciling"
  | "completed"
  | "failed";

export type PageStatus = "PASS" | "WARNING" | "FAIL";

export interface AuditRecord {
  id: string;
  targetUrl: string;
  aiProvider: AiProvider;
  aiModel: string;
  status: AuditStatus;
  overallScore: number | null;
  errorMessage: string | null;
  sourcePdfName: string;
  createdAt: string;
  completedAt: string | null;
}

export interface BlueprintSection {
  title: string;
  page: number;
  content: string;
  buttons: string[];
  formFields: string[];
  tableHeaders: string[];
  cards: string[];
  tabs: string[];
  badges: string[];
  charts: string[];
}

export interface SurfaceSnapshot {
  pageKey: string;
  url: string;
  title: string;
  headings: string[];
  buttons: string[];
  searchBoxes: string[];
  tableHeaders: string[];
  formFields: string[];
  tableCount: number;
  cards: string[];
  badges: string[];
  tabs: string[];
  chartCount: number;
}

export interface ReconciliationSet {
  matched: string[];
  missing: string[];
  extra: string[];
}

export interface ComponentReconciliation {
  [componentName: string]: ReconciliationSet;
}

export interface VerdictIssue {
  component: string;
  expected: string;
  actual: string;
  severity: "Low" | "Medium" | "High";
  confidence: number;
  guidelineReference: string;
  reason: string;
}

export interface Verdict {
  complianceScore: number;
  matched: string[];
  missing: string[];
  extra: string[];
  issues: VerdictIssue[];
  summary: string;
  componentReconciliation?: ComponentReconciliation;
}

export interface PageFindingRecord {
  id: string;
  auditId: string;
  pageKey: string;
  pageTitle: string;
  matchedBlueprintTitle: string | null;
  complianceScore: number;
  status: PageStatus;
  matched: string[];
  missing: string[];
  extra: string[];
  issues: VerdictIssue[];
  componentReconciliation: ComponentReconciliation;
  summary: string;
  screenshotPath: string | null;
  createdAt: string;
}
