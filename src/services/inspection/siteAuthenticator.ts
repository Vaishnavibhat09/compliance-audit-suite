import { Page } from "puppeteer";
import path from "path";
import { settings } from "../../config/settings";
import { ensureDir } from "../../utils/fileStorage";
import { createLogger } from "../../utils/logger";

const logger = createLogger("siteAuthenticator");

export interface Credentials {
  targetUrl: string;
  email: string;
  password: string;
}

/**
 * Reproduces the demo application's landing-page -> "Getting Started" ->
 * email/password -> Login flow. A debug screenshot is always captured so a
 * failed run can still be diagnosed from the finished audit.
 */
export async function signIn(page: Page, credentials: Credentials, auditId: string): Promise<void> {
  await page.goto(credentials.targetUrl, { waitUntil: "domcontentloaded" });
  logger.info("Opened landing page");

  const gettingStarted = await page
    .waitForSelector("::-p-text(Getting Started)", { timeout: 15000 })
    .catch(() => null);
  if (gettingStarted) {
    await gettingStarted.click();
  }

  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  logger.info("Login form loaded");

  await page.type('input[type="email"]', credentials.email, { delay: 15 });
  await page.type('input[type="password"]', credentials.password, { delay: 15 });
  logger.info("Credentials entered");

  const loginButton = await page.waitForSelector("xpath/.//button[contains(., 'Login')]", {
    timeout: 15000,
  }).catch(() => null);

  if (loginButton) {
    await loginButton.click();
  } else {
    await page.keyboard.press("Enter");
  }

  await new Promise((resolve) => setTimeout(resolve, 5000));

  const screenshotDir = settings.storage.screenshots;
  ensureDir(screenshotDir);
  await page.screenshot({
    path: path.join(screenshotDir, `${auditId}__login_debug.png`) as `${string}.png`,
    fullPage: true,
  });

  logger.info("Sign-in sequence complete", { url: page.url() });
}
