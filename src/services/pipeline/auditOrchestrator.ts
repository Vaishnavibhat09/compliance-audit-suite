import path from "path";
import { AiProvider, PageFindingRecord, SurfaceSnapshot, Verdict } from "../../types";
import { settings } from "../../config/settings";
import { createLogger } from "../../utils/logger";
import { ensureDir, writeJson } from "../../utils/fileStorage";
import { slugify } from "../../utils/idGenerator";

import { auditRepository } from "../../db/repositories/auditRepository";
import { blueprintRepository } from "../../db/repositories/blueprintRepository";
import { pageFindingRepository, classifyStatus } from "../../db/repositories/pageFindingRepository";

import { extractPdfPages } from "../ingestion/pdfTextExtractor";
import { segmentIntoSections } from "../ingestion/blueprintSegmenter";
import { tagSectionFeatures } from "../ingestion/blueprintFeatureTagger";

import { openSession } from "../inspection/browserSession";
import { signIn } from "../inspection/siteAuthenticator";
import { NAVIGATION_MAP, visitSection } from "../inspection/siteNavigator";
import { scanSurface, captureFullPageScreenshot } from "../inspection/surfaceScanner";

import { alignPageToBlueprint } from "../alignment/pageAligner";
import { buildDocumentationItems, buildSurfaceItems } from "../alignment/itemListBuilder";
import { reconcileElements } from "../alignment/elementReconciler";
import { reconcileComponent } from "../alignment/componentReconciler";
import { extractRelevantExcerpt } from "../alignment/sectionExcerptExtractor";

import { buildVerdictPrompt } from "../adjudication/verdictPromptFactory";
import { requestVerdict } from "../adjudication/llmGateway";
import { sanitizeVerdict } from "../adjudication/verdictSanitizer";
import { computeComplianceScore } from "../adjudication/verdictScorer";

import { renderPageReport } from "../reporting/pageReportRenderer";
import { renderDashboard } from "../reporting/dashboardRenderer";
import { buildReportBundle } from "../reporting/bundleArchiver";

const logger = createLogger("auditOrchestrator");

export interface AuditRunOptions {
  auditId: string;
  pdfPath: string;
  targetUrl: string;
  loginEmail: string;
  loginPassword: string;
  aiProvider: AiProvider;
  aiModel: string;
  apiKey: string;
}

const STRUCTURED_COMPONENTS = ["headings", "tableHeaders"] as const;

export async function runAudit(options: AuditRunOptions): Promise<void> {
  const { auditId } = options;

  try {
    // ---------------------------------------------------------
    // Stage 1 -- read the documentation PDF into blueprint sections
    // ---------------------------------------------------------
    auditRepository.updateStatus(auditId, "reading_blueprint");
    logger.info("Reading documentation blueprint", { auditId });

    const pages = await extractPdfPages(options.pdfPath);
    const rawSections = segmentIntoSections(pages);
    const blueprintSections = rawSections.map(tagSectionFeatures);

    if (blueprintSections.length === 0) {
      throw new Error("No documentation sections could be identified in the uploaded PDF.");
    }

    blueprintRepository.saveAll(auditId, blueprintSections);

    // ---------------------------------------------------------
    // Stage 2 -- inspect the live application
    // ---------------------------------------------------------
    auditRepository.updateStatus(auditId, "inspecting_surface");
    logger.info("Inspecting live application surface", { auditId });

    const snapshots = await inspectLiveApplication(options);

    // ---------------------------------------------------------
    // Stage 3 -- reconcile documentation against what was observed
    // ---------------------------------------------------------
    auditRepository.updateStatus(auditId, "reconciling");
    logger.info("Reconciling blueprint against observed surface", { auditId });

    const findings: PageFindingRecord[] = [];

    for (const snapshot of snapshots) {
      const finding = await reconcileScreen(options, snapshot, blueprintSections);
      findings.push(finding);
      await renderPageReport(finding);
    }

    // ---------------------------------------------------------
    // Stage 4 -- render dashboard + bundle
    // ---------------------------------------------------------
    const { overallScore } = await renderDashboard(auditId, options.targetUrl, findings);
    await buildReportBundle(auditId);

    auditRepository.markCompleted(auditId, overallScore);
    logger.info("Audit completed", { auditId, overallScore });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Audit failed", { auditId, message });
    auditRepository.markFailed(auditId, message);
  }
}

async function inspectLiveApplication(options: AuditRunOptions): Promise<SurfaceSnapshot[]> {
  const session = await openSession();
  const snapshots: SurfaceSnapshot[] = [];

  try {
    await signIn(
      session.page,
      {
        targetUrl: options.targetUrl,
        email: options.loginEmail,
        password: options.loginPassword,
      },
      options.auditId
    );

    for (const sectionName of Object.keys(NAVIGATION_MAP)) {
      const opened = await visitSection(session.page, sectionName);
      if (!opened) {
        logger.warn("Skipping section that failed to open", { sectionName });
        continue;
      }

      const raw = await scanSurface(session.page);
      const pageKey = slugify(sectionName);

      const screenshotPath = path.join(
        settings.storage.screenshots,
        `${options.auditId}__${pageKey}.png`
      );
      ensureDir(path.dirname(screenshotPath));
      await captureFullPageScreenshot(session.page, screenshotPath as `${string}.png`);

      const snapshot: SurfaceSnapshot = { ...raw, pageKey };

      const extractedPath = path.join(
        settings.storage.extracted,
        options.auditId,
        `${pageKey}.json`
      );
      writeJson(extractedPath, { ...snapshot, screenshotPath });

      snapshots.push(snapshot);
    }
  } finally {
    await session.close();
  }

  return snapshots;
}

async function reconcileScreen(
  options: AuditRunOptions,
  snapshot: SurfaceSnapshot,
  blueprintSections: ReturnType<typeof tagSectionFeatures>[]
): Promise<PageFindingRecord> {
  const alignment = alignPageToBlueprint(snapshot.title || snapshot.pageKey, blueprintSections);

  if (!alignment.section) {
    return persistFinding(options.auditId, snapshot, null, {
      complianceScore: 0,
      matched: [],
      missing: [],
      extra: [],
      issues: [],
      summary: `No documentation section could be matched to '${snapshot.title || snapshot.pageKey}'.`,
    }, {});
  }

  const section = alignment.section;

  // -- Deterministic fuzzy pass (also used as the AI fallback) --
  const documentationItems = buildDocumentationItems(section);
  const surfaceItems = buildSurfaceItems(snapshot);
  const fuzzyResult = reconcileElements(documentationItems, surfaceItems);

  // -- Structured per-component pass --
  const componentReconciliation: Record<string, ReturnType<typeof reconcileComponent>> = {};
  for (const component of STRUCTURED_COMPONENTS) {
    const expected = component === "headings" ? [] : section.tableHeaders;
    const actual = component === "headings" ? snapshot.headings : snapshot.tableHeaders;
    componentReconciliation[component] = reconcileComponent(expected, actual);
  }

  // -- LLM adjudication with deterministic fallback --
  const excerpt = extractRelevantExcerpt(section.content, snapshot.title || snapshot.pageKey);
  const prompt = buildVerdictPrompt(excerpt, JSON.stringify(snapshot, null, 2));

  let verdict: Verdict;
  try {
    const raw = await requestVerdict(
      { provider: options.aiProvider, apiKey: options.apiKey, model: options.aiModel },
      prompt
    );
    verdict = sanitizeVerdict(raw);
  } catch (error) {
    logger.warn("AI adjudication failed, using deterministic fallback", error);
    verdict = {
      complianceScore: 0,
      matched: [],
      missing: [],
      extra: [],
      issues: [],
      summary: "AI comparison was skipped because the request failed; deterministic matching was used instead.",
    };
  }

  if (verdict.complianceScore === 0 && verdict.matched.length === 0 && verdict.missing.length === 0) {
    verdict = {
      ...verdict,
      matched: fuzzyResult.matched,
      missing: fuzzyResult.missing,
      extra: fuzzyResult.extra,
      summary:
        verdict.summary && verdict.summary !== "The AI response could not be parsed as JSON."
          ? verdict.summary
          : "Compliance generated using deterministic fuzzy matching because the AI response was unavailable or invalid.",
    };
  }

  if (verdict.issues.length === 0) {
    verdict.issues = verdict.missing.map((item) => ({
      component: item,
      expected: item,
      actual: "Not Found",
      severity: "Medium" as const,
      confidence: 0.9,
      guidelineReference: "Documentation",
      reason: "Required by documentation but not detected on the live screen.",
    }));
  }

  // Always recompute the final score deterministically so every report is reproducible.
  const finalScore = computeComplianceScore(verdict.matched, verdict.missing, verdict.extra);

  return persistFinding(options.auditId, snapshot, section.title, { ...verdict, complianceScore: finalScore }, componentReconciliation);
}

function persistFinding(
  auditId: string,
  snapshot: SurfaceSnapshot,
  matchedBlueprintTitle: string | null,
  verdict: Verdict,
  componentReconciliation: Record<string, ReturnType<typeof reconcileComponent>>
): PageFindingRecord {
  const screenshotPath = path.join(settings.storage.screenshots, `${auditId}__${snapshot.pageKey}.png`);

  return pageFindingRepository.create({
    auditId,
    pageKey: snapshot.pageKey,
    pageTitle: snapshot.title || snapshot.pageKey,
    matchedBlueprintTitle,
    complianceScore: verdict.complianceScore,
    status: classifyStatus(verdict.complianceScore),
    matched: verdict.matched,
    missing: verdict.missing,
    extra: verdict.extra,
    issues: verdict.issues,
    componentReconciliation,
    summary: verdict.summary,
    screenshotPath,
  });
}
