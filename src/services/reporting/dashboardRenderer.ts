import path from "path";
import ejs from "ejs";
import { settings } from "../../config/settings";
import { ensureDir, writeBinary } from "../../utils/fileStorage";
import { PageFindingRecord } from "../../types";

const TEMPLATE_PATH = path.join(__dirname, "..", "..", "..", "views", "reports", "dashboard.ejs");

export function dashboardReportPath(auditId: string): string {
  return path.join(settings.storage.reports, auditId, "index.html");
}

export function computeOverallScore(pages: PageFindingRecord[]): number {
  if (pages.length === 0) return 0;
  const total = pages.reduce((sum, page) => sum + page.complianceScore, 0);
  return Math.round((total / pages.length) * 10) / 10;
}

export async function renderDashboard(
  auditId: string,
  targetUrl: string,
  pages: PageFindingRecord[]
): Promise<{ path: string; overallScore: number }> {
  const overallScore = computeOverallScore(pages);

  const html = await ejs.renderFile(TEMPLATE_PATH, {
    targetUrl,
    overallScore,
    pages,
    generatedAt: new Date().toLocaleString("en-US"),
  });

  const outPath = dashboardReportPath(auditId);
  ensureDir(path.dirname(outPath));
  writeBinary(outPath, Buffer.from(html, "utf-8"));

  return { path: outPath, overallScore };
}
