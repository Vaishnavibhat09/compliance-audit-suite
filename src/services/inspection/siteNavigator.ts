import { Page } from "puppeteer";
import { createLogger } from "../../utils/logger";

const logger = createLogger("siteNavigator");

/**
 * Maps a human-readable section name to the `data-testid` the demo
 * application renders on its sidebar navigation links.
 */
export const NAVIGATION_MAP: Record<string, string> = {
  "My Applications": "nav-my-applications",
  Facilities: "nav-facilities",
  "Action Items": "nav-action-items",
  "User Management": "nav-user-management",
  Announcements: "nav-announcements",
  Settings: "nav-settings",
  FAQs: "nav-faqs",
  Tickets: "nav-tickets",
  Contact: "nav-contact",
};

export async function visitSection(page: Page, sectionName: string): Promise<boolean> {
  const testId = NAVIGATION_MAP[sectionName];
  logger.info(`Opening ${sectionName}`);

  try {
    const link = await page.waitForSelector(`[data-testid="${testId}"]`, { timeout: 10000 });
    if (!link) return false;

    await link.click();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await page.waitForNetworkIdle({ idleTime: 750, timeout: 10000 }).catch(() => undefined);

    logger.info("Opened", { url: page.url() });
    return true;
  } catch (error) {
    logger.warn(`Could not open ${sectionName}`, error);
    return false;
  }
}
