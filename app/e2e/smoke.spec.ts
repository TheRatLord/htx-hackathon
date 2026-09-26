import { expect, test } from '@playwright/test';
import { SCREENS, settle, watchConsole } from './helpers';

test.describe('smoke at 390x844', () => {
  for (const s of SCREENS) {
    test(`${s.name} opens with no console errors`, async ({ page }) => {
      const con = watchConsole(page);
      await page.goto(`/${s.hash}`);
      await settle(page);
      await expect(page.getByText('Concept with sample data').first()).toBeVisible();
      // Nothing may overflow sideways at phone width.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      con.expectClean();
    });
  }

  test('main flow: home -> nearby -> stop -> report -> search zoo -> routes -> trip -> save -> end', async ({ page }) => {
    const con = watchConsole(page);
    await page.goto('/#/');
    await settle(page);

    // Home: tucked sheet, Where to?, Home and Work.
    await expect(page.locator('section.sheet')).toHaveAttribute('data-sheet-state', 'peek');
    await expect(page.getByRole('button', { name: /where to\?/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^home/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^work/i })).toBeVisible();

    // Nearby: open the sheet, three numbered pins and cards.
    await page.getByRole('button', { name: /show nearby stops/i }).click();
    await expect(page.locator('section.sheet')).toHaveAttribute('data-sheet-state', 'half');
    await expect(page.locator('.stop-pin__circle')).toHaveText(['1', '2', '3']);

    // Stop 2 has a route with tracking lost.
    await page.getByRole('button', { name: /fannin st/i }).first().click();
    await expect(page).toHaveURL(/#\/stop\/fannin-alabama/);
    await page.getByRole('tab', { name: /65/ }).click();
    await expect(page.getByText(/tracking lost/i).first()).toBeVisible();
    await page.getByRole('button', { name: /report a problem/i }).click();
    await expect(page.getByText('Reported. Thank you.')).toBeVisible();

    // Search for the zoo.
    await page.goto('/#/search');
    await settle(page, 300);
    await page.getByRole('searchbox').or(page.getByRole('textbox')).first().fill('zoo');
    await page.getByRole('button', { name: /houston zoo/i }).first().click();
    await expect(page).toHaveURL(/#\/routes\/houston-zoo/);
    await settle(page);

    // Route options: 3 routes, both sorts, select by card and by pin.
    await expect(page.locator('.route-pin')).toHaveCount(3);
    await page.getByRole('radio', { name: 'Least walking' }).click();
    await page.getByRole('radio', { name: 'Fastest' }).click();
    // Route C is already a saved sample trip, so pick B by its map badge.
    await page.locator('.route-pin', { hasText: 'B' }).click();
    await expect(page.getByRole('button', { name: /start trip.*route b/i })).toBeVisible();
    await page.getByRole('button', { name: /start trip/i }).click();
    await expect(page).toHaveURL(/#\/trip\/houston-zoo\/B/);

    // Trip: save and end.
    await page.getByRole('button', { name: /save trip/i }).click();
    await expect(page.getByRole('button', { name: /^saved$/i })).toBeVisible();
    await page.getByRole('button', { name: /end trip/i }).click();
    await expect(page).toHaveURL(/#\/$/);
    // The saved trip now shows on Recent.
    await page.getByRole('button', { name: 'Recent' }).click();
    await expect(page.getByText('Route 25 · 25 min')).toBeVisible();

    // Tabs.
    await page.goto('/#/fares');
    await settle(page, 300);
    await page.getByRole('button', { name: /enlarge code/i }).click();
    await expect(page.getByRole('button', { name: /shrink code/i })).toBeVisible();
    await page.getByRole('button', { name: 'More' }).click();
    await expect(page).toHaveURL(/#\/more/);

    con.expectClean();
  });

  test('map pans by drag and zooms with buttons, scroll and pinch', async ({ page }) => {
    const con = watchConsole(page);
    await page.goto('/#/');
    await settle(page);
    const pinX = () => page.locator('.stop-pin').first().evaluate((el) => el.getBoundingClientRect().x);
    // Zoom is measured by how far apart stop pins 1 and 3 are on screen.
    const spacing = () =>
      page.locator('.stop-pin').evaluateAll((els) => {
        const r = els.map((e) => e.getBoundingClientRect());
        return Math.hypot(r[2].x - r[0].x, r[2].y - r[0].y);
      });

    // Drag to pan.
    const x0 = await pinX();
    await page.mouse.move(200, 420);
    await page.mouse.down();
    await page.mouse.move(120, 420, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    expect(Math.round(await pinX())).toBeLessThan(Math.round(x0) - 40);

    // +/- buttons.
    const s0 = await spacing();
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await page.waitForTimeout(600);
    const s1 = await spacing();
    expect(s1).toBeGreaterThan(s0 * 1.5);
    await page.getByRole('button', { name: 'Zoom out' }).click();
    await page.waitForTimeout(600);
    expect(Math.abs((await spacing()) - s0)).toBeLessThan(s0 * 0.1);

    // Scroll wheel.
    await page.mouse.move(200, 420);
    await page.mouse.wheel(0, -500);
    await page.waitForTimeout(800);
    expect(await spacing()).toBeGreaterThan(s0 * 1.2);

    // Pinch (two touch points moving apart), sent through the DevTools protocol.
    const before = await spacing();
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', a: [number, number], b: [number, number]) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints:
          type === 'touchEnd'
            ? []
            : [
                { x: a[0], y: a[1], id: 1 },
                { x: b[0], y: b[1], id: 2 },
              ],
      });
    await touch('touchStart', [195, 400], [195, 440]);
    for (let i = 1; i <= 10; i++) await touch('touchMove', [195, 400 - i * 12], [195, 440 + i * 12]);
    await touch('touchEnd', [0, 0], [0, 0]);
    await page.waitForTimeout(800);
    expect(await spacing()).toBeGreaterThan(before * 1.3);

    con.expectClean();
  });

  test('dark mode and reduced motion render without errors', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: 'dark',
      reducedMotion: 'reduce',
    });
    const page = await ctx.newPage();
    const con = watchConsole(page);
    await page.goto('http://localhost:4173/#/');
    await settle(page);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe('rgb(11, 17, 29)');
    const dur = await page.evaluate(() => getComputedStyle(document.querySelector('section.sheet')!).transitionDuration);
    expect(parseFloat(dur)).toBeLessThan(0.02);
    con.expectClean();
    await ctx.close();
  });
});
