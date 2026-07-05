import { Router } from "express";
import { renderHome, renderAuditView } from "../controllers/viewController";

export const viewRouter = Router();

viewRouter.get("/", renderHome);
viewRouter.get("/audits/:id", renderAuditView);
