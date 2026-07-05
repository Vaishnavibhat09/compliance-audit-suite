import { Request, Response } from "express";
import { settings } from "../config/settings";
import { auditRepository } from "../db/repositories/auditRepository";

export function renderHome(_req: Request, res: Response): void {
  res.render("index", {
    defaults: settings.defaults,
    recentAudits: auditRepository.listRecent(10),
  });
}

export function renderAuditView(req: Request, res: Response): void {
  const audit = auditRepository.findById(req.params.id);
  if (!audit) {
    res.status(404).render("not-found", { auditId: req.params.id });
    return;
  }
  res.render("audit", { audit });
}
