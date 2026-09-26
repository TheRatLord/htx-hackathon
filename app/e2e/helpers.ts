import { expect, type Page } from '@playwright/test';

/** Collect console errors/warnings and page errors; assert none at the end. */
export function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`console.${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  return {
    problems,
    expectClean: () => expect(problems, problems.join('\n')).toEqual([]),
  };
}

/** Wait until the map has drawn and simulated loading has finished. */
export async function settle(page: Page, ms = 900) {
  await page.waitForFunction(() => !!document.querySelector('.maplibregl-canvas'), undefined, { timeout: 15_000 });
  await page.waitForTimeout(ms);
}

/** Every screen, reachable directly by URL. */
export const SCREENS = [
  { name: 'home', hash: '#/' },
  { name: 'nearby', hash: '#/nearby' },
  { name: 'search', hash: '#/search' },
  { name: 'routes', hash: '#/routes/houston-zoo' },
  { name: 'trip', hash: '#/trip/houston-zoo/C' },
  { name: 'stop', hash: '#/stop/wheeler-bay-f' },
  { name: 'stop-lost', hash: '#/stop/fannin-alabama' },
  { name: 'fares', hash: '#/fares' },
  { name: 'recent', hash: '#/recent' },
  { name: 'more', hash: '#/more' },
] as const;
