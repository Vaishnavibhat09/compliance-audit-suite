import puppeteer, { Browser, Page } from "puppeteer";
import { settings } from "../../config/settings";

export interface LiveSession {
  browser: Browser;
  page: Page;
  close(): Promise<void>;
}

export async function openSession(): Promise<LiveSession> {
  const browser = await puppeteer.launch({
    headless: settings.browser.headless,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  return {
    browser,
    page,
    async close() {
      await browser.close();
    },
  };
}
