import { db } from "../database";
import { AuditRecord, AuditStatus } from "../../types";

interface AuditRow {
  id: string;
  target_url: string;
  ai_provider: string;
  ai_model: string;
  status: string;
  overall_score: number | null;
  error_message: string | null;
  source_pdf_name: string;
  created_at: string;
  completed_at: string | null;
}

function toRecord(row: AuditRow): AuditRecord {
  return {
    id: row.id,
    targetUrl: row.target_url,
    aiProvider: row.ai_provider as AuditRecord["aiProvider"],
    aiModel: row.ai_model,
    status: row.status as AuditStatus,
    overallScore: row.overall_score,
    errorMessage: row.error_message,
    sourcePdfName: row.source_pdf_name,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

export const auditRepository = {
  create(input: {
    id: string;
    targetUrl: string;
    aiProvider: string;
    aiModel: string;
    sourcePdfName: string;
  }): void {
    db.prepare(
      `INSERT INTO audits (id, target_url, ai_provider, ai_model, status, source_pdf_name)
       VALUES (@id, @targetUrl, @aiProvider, @aiModel, 'queued', @sourcePdfName)`
    ).run(input);
  },

  updateStatus(id: string, status: AuditStatus): void {
    db.prepare(`UPDATE audits SET status = ? WHERE id = ?`).run(status, id);
  },

  markFailed(id: string, errorMessage: string): void {
    db.prepare(
      `UPDATE audits SET status = 'failed', error_message = ?, completed_at = datetime('now') WHERE id = ?`
    ).run(errorMessage, id);
  },

  markCompleted(id: string, overallScore: number): void {
    db.prepare(
      `UPDATE audits SET status = 'completed', overall_score = ?, completed_at = datetime('now') WHERE id = ?`
    ).run(overallScore, id);
  },

  findById(id: string): AuditRecord | null {
    const row = db.prepare(`SELECT * FROM audits WHERE id = ?`).get(id) as
      | AuditRow
      | undefined;
    return row ? toRecord(row) : null;
  },

  listRecent(limit = 25): AuditRecord[] {
    const rows = db
      .prepare(`SELECT * FROM audits ORDER BY created_at DESC LIMIT ?`)
      .all(limit) as AuditRow[];
    return rows.map(toRecord);
  },
};
