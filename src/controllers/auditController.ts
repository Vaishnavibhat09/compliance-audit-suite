import fs from "fs";
import path from "path";
import { Request, Response } from "express";
import { settings } from "../config/settings";
import { newId } from "../utils/idGenerator";
import { ensureDir } from "../utils/fileStorage";
import { createLogger } from "../utils/logger";

import { auditRepository } from "../db/repositories/auditRepository";
import { pageFindingRepository } from "../db/repositories/pageFindingRepository";

import { runAudit } from "../services/pipeline/auditOrchestrator";
import { pageReportPath } from "../services/reporting/pageReportRenderer";
import { dashboardReportPath } from "../services/reporting/dashboardRenderer";
import { bundlePath } from "../services/reporting/bundleArchiver";
import { AiProvider } from "../types";

const logger = createLogger("auditController");

function resolveApiKey(provider: AiProvider, submittedKey: string | undefined): string {
  if (submittedKey && submittedKey.trim()) return submittedKey.trim();
  return settings.apiKeys[provider] || "";
}

export async function createAudit(req: Request, res: Response): Promise<void> {
  const file = req.file;
  const body = req.body as Record<string, string>;

  if (!file) {
    res.status(400).json({ error: "A documentation PDF upload is required." });
    return;
  }

  const targetUrl = (body.targetUrl || settings.defaults.targetUrl).trim();
  const loginEmail = (body.loginEmail || settings.defaults.loginEmail).trim();
  const loginPassword = body.loginPassword || settings.defaults.loginPassword;
  const aiProvider = (body.aiProvider || settings.defaults.aiProvider) as AiProvider;
  const aiModel = (body.aiModel || settings.defaults.aiModel).trim();
  const apiKey = resolveApiKey(aiProvider, body.apiKey);

  if (!["groq", "openai", "gemini"].includes(aiProvider)) {
    res.status(400).json({ error: `Unsupported AI provider '${aiProvider}'.` });
    return;
  }

  if (!apiKey) {
    res.status(400).json({ error: `An API key for '${aiProvider}' is required.` });
    return;
  }

  const auditId = newId("audit");

  ensureDir(settings.storage.uploads);
  const pdfPath = path.join(settings.storage.uploads, `${auditId}.pdf`);
  fs.renameSync(file.path, pdfPath);

  auditRepository.create({
    id: auditId,
    targetUrl,
    aiProvider,
    aiModel,
    sourcePdfName: file.originalname,
  });

  logger.info("Audit queued", { auditId, targetUrl, aiProvider, aiModel });

  // Runs in the background; the client polls GET /api/audits/:id for progress.
  void runAudit({
    auditId,
    pdfPath,
    targetUrl,
    loginEmail,
    loginPassword,
    aiProvider,
    aiModel,
    apiKey,
  });

  res.status(202).json({ auditId });
}

export function getAuditStatus(req: Request, res: Response): void {
  const audit = auditRepository.findById(req.params.id);
  if (!audit) {
    res.status(404).json({ error: "Audit not found." });
    return;
  }
  res.json(audit);
}

export function listAudits(_req: Request, res: Response): void {
  res.json(auditRepository.listRecent());
}

export function listAuditPages(req: Request, res: Response): void {
  const audit = auditRepository.findById(req.params.id);
  if (!audit) {
    res.status(404).json({ error: "Audit not found." });
    return;
  }
  res.json(pageFindingRepository.listForAudit(req.params.id));
}

export function servePageReport(req: Request, res: Response): void {
  const filePath = pageReportPath(req.params.id, req.params.pageKey);
  if (!fs.existsSync(filePath)) {
    res.status(404).send("Report not found.");
    return;
  }
  res.sendFile(filePath);
}

export function serveDashboardReport(req: Request, res: Response): void {
  const filePath = dashboardReportPath(req.params.id);
  if (!fs.existsSync(filePath)) {
    res.status(404).send("Dashboard report not found.");
    return;
  }
  res.sendFile(filePath);
}

export function downloadBundle(req: Request, res: Response): void {
  const filePath = bundlePath(req.params.id);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "Report bundle not found." });
    return;
  }
  res.download(filePath, `compliance-audit-${req.params.id}.zip`);
}
