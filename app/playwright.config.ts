import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// Use the preinstalled Chromium when present (cloud dev boxes), otherwise
// Playwright's own download (`npx playwright install chromium`).
const localChromium = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    userAgent: devices['iPhone 13'].userAgent,
    launchOptions: existsSync(localChromium)
      ? { executablePath: localChromium, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }
      : { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: 'npm run build && npm run preview -- --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
