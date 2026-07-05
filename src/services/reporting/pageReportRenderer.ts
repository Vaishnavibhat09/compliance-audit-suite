import path from "path";
import ejs from "ejs";
import { settings } from "../../config/settings";
import { ensureDir, writeBinary, fileToBase64 } from "../../utils/fileStorage";
import { PageFindingRecord } from "../../types";
import { aggregateCoverage } from "./coverageAggregator";

const STATUS_COLORS: Record<string, string> = {
  PASS: "#16a34a",
  WARNING: "#d97706",
  FAIL: "#dc2626",
};

const TEMPLATE_PATH = path.join(__dirname, "..", "..", "..", "views", "reports", "page-report.ejs");

export function pageReportPath(auditId: string, pageKey: string): string {
  return path.join(settings.storage.reports, auditId, `${pageKey}.html`);
}

export async function renderPageReport(finding: PageFindingRecord): Promise<string> {
  const coverage = aggregateCoverage(finding.componentReconciliation);
  const screenshotBase64 = finding.screenshotPath ? fileToBase64(finding.screenshotPath) : null;

  const html = await ejs.renderFile(TEMPLATE_PATH, {
    pageTitle: finding.pageTitle,
    matchedBlueprintTitle: finding.matchedBlueprintTitle,
    complianceScore: finding.complianceScore,
    status: finding.status,
    statusColor: STATUS_COLORS[finding.status] || "#4f46e5",
    matched: finding.matched,
    missing: finding.missing,
    extra: finding.extra,
    issues: finding.issues,
    summary: finding.summary,
    coverageRows: coverage.rows,
    screenshotBase64,
    generatedAt: new Date().toLocaleString("en-US"),
  });

  const outPath = pageReportPath(finding.auditId, finding.pageKey);
  ensureDir(path.dirname(outPath));
  writeBinary(outPath, Buffer.from(html, "utf-8"));

  return outPath;
}
