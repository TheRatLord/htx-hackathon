import { test, type Page } from '@playwright/test';
import { settle, watchConsole } from './helpers';

/**
 * Writes screenshots/<name>-<light|dark>.png for every screen and state.
 * Run with `npm run screenshots`.
 */

type Shot = { name: string; hash: string; act?: (page: Page) => Promise<void> };

const SHOTS: Shot[] = [
  { name: '01-home', hash: '#/' },
  { name: '02-nearby-stops', hash: '#/nearby' },
  { name: '03-stop-schedule-live', hash: '#/stop/wheeler-bay-f' },
  {
    name: '04-tracking-lost',
    hash: '#/stop/fannin-alabama',
    act: async (p) => {
      await p.getByRole('tab', { name: /65/ }).click();
    },
  },
  {
    name: '04b-tracking-lost-reported',
    hash: '#/stop/fannin-alabama',
    act: async (p) => {
      await p.getByRole('tab', { name: /65/ }).click();
      await p.getByRole('button', { name: /report a problem/i }).click();
      await p.getByText('Reported. Thank you.').waitFor();
    },
  },
  {
    name: '05-search',
    hash: '#/search',
    act: async (p) => {
      await p.getByRole('searchbox').or(p.getByRole('textbox')).first().fill('zoo');
    },
  },
  { name: '05b-search-empty', hash: '#/search' },
  { name: '06-route-options', hash: '#/routes/houston-zoo' },
  {
    name: '07-least-walking',
    hash: '#/routes/houston-zoo',
    act: async (p) => {
      await p.getByRole('radio', { name: 'Least walking' }).click();
    },
  },
  { name: '08-trip-steps', hash: '#/trip/houston-zoo/C' },
  { name: '09-fares', hash: '#/fares' },
  {
    name: '10-fares-enlarged',
    hash: '#/fares',
    act: async (p) => {
      await p.getByRole('button', { name: /enlarge code/i }).click();
    },
  },
  { name: '11-recent', hash: '#/recent' },
  { name: '12-more', hash: '#/more' },
];

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} screenshots`, () => {
    test.use({ colorScheme: scheme });
    for (const s of SHOTS) {
      test(s.name, async ({ page }) => {
        const con = watchConsole(page);
        await page.goto(`/${s.hash}`);
        // Let camera animations finish so the picture is the settled view.
        await settle(page, 2000);
        if (s.act) {
          await s.act(page);
          await page.waitForTimeout(700);
        }
        await page.screenshot({ path: `screenshots/${s.name}-${scheme}.png` });
        con.expectClean();
      });
    }
  });
}
