// Playwright e2e: spec section E (flows F1–F11) and the F rubric, plus the screenshot set.
//   npm run test:e2e                      # all flows and rubric checks
//   npm run test:e2e -- screens.spec.ts   # the screenshot set only (SHOTS_DIR overrides where it goes)
// Starts its own API (Set S: OFFLINE=1, DEMO_REALTIME=0) and Vite dev server on API_PORT / WEB_PORT
// (default 8787 / 5173), or reuses ones already running there. The API clock is shifted to a
// weekday noon (E2E_NOW) so scheduled times exist; the browser clock is synced to it per test.

import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const apiPort = Number(process.env.API_PORT ?? 8787);
const webPort = Number(process.env.WEB_PORT ?? 5173);
const e2eNow = process.env.E2E_NOW ?? "2026-09-25T12:00:00-05:00"; // a Friday, weekday service
// One clock file per API port: a late-night shot run on one port doesn't move another run's clock.
const NOW_FILE = resolve(import.meta.dirname, `tests/e2e/.results/now-${apiPort}.txt`);

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: /.*\.spec\.ts$/,
  outputDir: "tests/e2e/.results/artifacts",
  globalSetup: "./tests/e2e/global-setup.ts",
  // One API clock is shared by every test (late-night shots move it), so run serially.
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 8_000 },
  reporter: [["list"], ["json", { outputFile: "tests/e2e/.results/results.json" }]],
  use: {
    ...devices["Pixel 7"],
    browserName: "chromium",
    baseURL: `http://localhost:${webPort}`,
    viewport: { width: 412, height: 800 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "en-US",
    timezoneId: "America/Chicago",
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: `node --import ./tests/e2e/fake-now.mjs --import tsx server/index.ts`,
      url: `http://localhost:${apiPort}/api/health`,
      reuseExistingServer: true,
      timeout: 60_000,
      env: { PORT: String(apiPort), OFFLINE: "1", DEMO_REALTIME: "0", E2E_NOW: e2eNow, E2E_NOW_FILE: NOW_FILE },
    },
    {
      command: `npx vite --port ${webPort} --strictPort`,
      url: `http://localhost:${webPort}/`,
      reuseExistingServer: true,
      timeout: 60_000,
      env: { API_PORT: String(apiPort), WEB_PORT: String(webPort) },
    },
  ],
});
