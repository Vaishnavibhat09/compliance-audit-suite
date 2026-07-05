import { Page } from "puppeteer";
import { SurfaceSnapshot } from "../../types";
import { SCAN_SURFACE_SCRIPT } from "./surfaceScanner.browser";

type RawSnapshot = Omit<SurfaceSnapshot, "pageKey">;

/**
 * Runs entirely inside the browser context (via page.evaluate) and pulls
 * out the visible building blocks of a page: headings, actionable buttons,
 * search inputs, table headers, form fields, cards, badges, tabs and a
 * rough chart count. The heuristics mirror what a QA engineer would
 * eyeball when comparing a screen against written documentation.
 */
export async function scanSurface(page: Page): Promise<RawSnapshot> {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const snapshot = await page.evaluate(SCAN_SURFACE_SCRIPT);

  return snapshot as RawSnapshot;
}

export async function captureFullPageScreenshot(page: Page, filePath: `${string}.png`): Promise<void> {
  await page.screenshot({ path: filePath, fullPage: true });
}
