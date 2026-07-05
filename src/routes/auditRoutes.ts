import { Router } from "express";
import multer from "multer";
import path from "path";
import os from "os";
import {
  createAudit,
  getAuditStatus,
  listAudits,
  listAuditPages,
  servePageReport,
  serveDashboardReport,
  downloadBundle,
} from "../controllers/auditController";

const upload = multer({ dest: path.join(os.tmpdir(), "compliance-audit-suite-uploads") });

export const auditRouter = Router();

auditRouter.post("/audits", upload.single("documentationPdf"), createAudit);
auditRouter.get("/audits", listAudits);
auditRouter.get("/audits/:id", getAuditStatus);
auditRouter.get("/audits/:id/pages", listAuditPages);
auditRouter.get("/audits/:id/pages/:pageKey/report", servePageReport);
auditRouter.get("/audits/:id/dashboard-report", serveDashboardReport);
auditRouter.get("/audits/:id/bundle", downloadBundle);
