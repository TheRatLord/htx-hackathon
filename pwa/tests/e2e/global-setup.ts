// Warms the Vite dev server (dependency optimisation can reload the first page) before any test.
import { chromium, type FullConfig } from "@playwright/test";

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL!;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const path of ["/welcome", "/explore", "/explore/route/082", "/fares"]) {
    await page.goto(baseURL + path);
    await page.waitForLoadState("networkidle").catch(() => {});
  }
  await page.waitForTimeout(2000);
  await browser.close();
}
