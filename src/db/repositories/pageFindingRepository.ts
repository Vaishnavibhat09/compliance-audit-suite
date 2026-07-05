import { db } from "../database";
import { newId } from "../../utils/idGenerator";
import { PageFindingRecord, PageStatus } from "../../types";

interface PageFindingRow {
  id: string;
  audit_id: string;
  page_key: string;
  page_title: string;
  matched_blueprint_title: string | null;
  compliance_score: number;
  status: string;
  matched_json: string;
  missing_json: string;
  extra_json: string;
  issues_json: string;
  component_reconciliation_json: string;
  summary: string;
  screenshot_path: string | null;
  created_at: string;
}

function toRecord(row: PageFindingRow): PageFindingRecord {
  return {
    id: row.id,
    auditId: row.audit_id,
    pageKey: row.page_key,
    pageTitle: row.page_title,
    matchedBlueprintTitle: row.matched_blueprint_title,
    complianceScore: row.compliance_score,
    status: row.status as PageStatus,
    matched: JSON.parse(row.matched_json),
    missing: JSON.parse(row.missing_json),
    extra: JSON.parse(row.extra_json),
    issues: JSON.parse(row.issues_json),
    componentReconciliation: JSON.parse(row.component_reconciliation_json),
    summary: row.summary,
    screenshotPath: row.screenshot_path,
    createdAt: row.created_at,
  };
}

export const pageFindingRepository = {
  create(input: Omit<PageFindingRecord, "id" | "createdAt">): PageFindingRecord {
    const id = newId("pf");

    db.prepare(
      `INSERT INTO page_findings
        (id, audit_id, page_key, page_title, matched_blueprint_title, compliance_score, status,
         matched_json, missing_json, extra_json, issues_json, component_reconciliation_json,
         summary, screenshot_path)
       VALUES
        (@id, @auditId, @pageKey, @pageTitle, @matchedBlueprintTitle, @complianceScore, @status,
         @matched, @missing, @extra, @issues, @componentReconciliation,
         @summary, @screenshotPath)`
    ).run({
      id,
      auditId: input.auditId,
      pageKey: input.pageKey,
      pageTitle: input.pageTitle,
      matchedBlueprintTitle: input.matchedBlueprintTitle,
      complianceScore: input.complianceScore,
      status: input.status,
      matched: JSON.stringify(input.matched),
      missing: JSON.stringify(input.missing),
      extra: JSON.stringify(input.extra),
      issues: JSON.stringify(input.issues),
      componentReconciliation: JSON.stringify(input.componentReconciliation),
      summary: input.summary,
      screenshotPath: input.screenshotPath,
    });

    return this.findById(id) as PageFindingRecord;
  },

  findById(id: string): PageFindingRecord | null {
    const row = db.prepare(`SELECT * FROM page_findings WHERE id = ?`).get(id) as
      | PageFindingRow
      | undefined;
    return row ? toRecord(row) : null;
  },

  findByPageKey(auditId: string, pageKey: string): PageFindingRecord | null {
    const row = db
      .prepare(`SELECT * FROM page_findings WHERE audit_id = ? AND page_key = ?`)
      .get(auditId, pageKey) as PageFindingRow | undefined;
    return row ? toRecord(row) : null;
  },

  listForAudit(auditId: string): PageFindingRecord[] {
    const rows = db
      .prepare(`SELECT * FROM page_findings WHERE audit_id = ? ORDER BY page_title ASC`)
      .all(auditId) as PageFindingRow[];
    return rows.map(toRecord);
  },
};

export function classifyStatus(score: number): PageStatus {
  if (score >= 90) return "PASS";
  if (score >= 70) return "WARNING";
  return "FAIL";
}
