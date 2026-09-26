// The review screenshot set: every screen and important state, at 412x800 (plus 360x640 for home,
// stop, plan and itinerary). Set S data (OFFLINE fixtures, scheduled times at a weekday noon).
//   npm run test:e2e -- screens.spec.ts
// Files go to SHOTS_DIR (default ../ux-audit/redesign/round1), named NN-screen[-state][-360].png.

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { GPS, launch, ONBOARDED, SAVED_2958, settle, type Gps } from "./helpers.ts";

const OUT = process.env.SHOTS_DIR ?? resolve(import.meta.dirname, "../../../ux-audit/redesign/round1");
const NOW_FILE = resolve(import.meta.dirname, ".results/now.txt");
mkdirSync(OUT, { recursive: true });

const ES = { "ridemetro.prefs": { welcomed: true, lang: "es", textSize: "standard", walkPace: "normal" } };
const PLAN_Q = "from=29.71990%2C-95.34220&to=landmark%3Ahobby-airport&toName=Hobby+Airport";

interface Shot {
  file: string;
  path: string;
  gps?: Gps | null;
  storage?: Record<string, unknown>;
  size?: "412" | "360";
  /** Steps after launch (rider actions or state changes) before the shot. */
  then?: (page: Page) => Promise<void>;
  wait?: number;
}

const tap = (page: Page, name: string | RegExp, role: "button" | "link" = "button") => page.getByRole(role, { name }).first().tap();
const search = async (page: Page, q: string) => {
  await tap(page, "Search for a place, stop or route");
  await expect(page.getByRole("searchbox")).toBeFocused();
  await page.waitForTimeout(300);
  await page.keyboard.type(q, { delay: 20 });
  await settle(page, 1000);
};

const SHOTS: Shot[] = [
  { file: "01-welcome", path: "/", storage: {} },
  { file: "02-home", path: "/explore" },
  { file: "02-home-360", path: "/explore", size: "360" },
  { file: "03-home-saved", path: "/explore", gps: GPS.montrose, storage: { ...ONBOARDED, ...SAVED_2958 } },
  { file: "03-home-saved-360", path: "/explore", gps: GPS.montrose, storage: { ...ONBOARDED, ...SAVED_2958 }, size: "360" },
  { file: "04-home-list-full", path: "/explore", then: (p) => tap(p, "Show list") },
  { file: "05-route-near-40", path: "/explore", then: (p) => tap(p, "Show Route 40 near you") },
  { file: "06-route-near-58-tc", path: "/explore", gps: GPS.nwtc, then: (p) => tap(p, "Show Route 58 near you") },
  { file: "07-place-hmns", path: "/explore", gps: GPS.eastDowntown, then: async (p) => (await search(p, "museum of natural science"), tap(p, "Stops near")) },
  { file: "08-search-hobby", path: "/explore", gps: GPS.uh, then: (p) => search(p, "hobby") },
  { file: "09-search-82-alert", path: "/explore", gps: GPS.montrose, then: (p) => search(p, "82") },
  { file: "10-search-museum", path: "/explore", gps: GPS.eastDowntown, then: (p) => search(p, "museum of natural science") },
  { file: "11-search-empty", path: "/explore", then: (p) => tap(p, "Search for a place, stop or route") },
  { file: "12-stop-342", path: "/explore/stop/342?route=040" },
  { file: "12-stop-342-360", path: "/explore/stop/342?route=040", size: "360" },
  { file: "13-stop-342-full", path: "/explore/stop/342?route=040", then: (p) => tap(p, "Show list") },
  { file: "14-stop-342-tracking", path: "/explore/stop/342?route=040", then: (p) => tap(p, /Track Bus Stop/) },
  { file: "15-full-schedule", path: "/explore/stop/342/schedule?route=040" },
  { file: "16-walk-342", path: "/explore/stop/342?route=040", then: (p) => tap(p, /^Walk here/) },
  { file: "17-route-82", path: "/explore", gps: GPS.montrose, then: async (p) => (await search(p, "82"), tap(p, "82 Westheimer, Eastbound to DOWNTOWN")) },
  { file: "18-route-82-stop-2958", path: "/explore", gps: GPS.montrose, then: async (p) => (await search(p, "82"), await tap(p, "82 Westheimer, Eastbound to DOWNTOWN"), await settle(p), tap(p, /^Westheimer Rd @ Montrose Blvd \(2958\)/)) },
  { file: "19-tc-northwest", path: "/explore/tc/northwest-transit-center", gps: GPS.nwtc },
  { file: "20-tc-northwest-route58", path: "/explore/tc/northwest-transit-center?route=058", gps: GPS.nwtc },
  { file: "21-plan-form", path: "/explore", gps: GPS.uh, then: (p) => tap(p, "Plan Trip") },
  { file: "21-plan-form-360", path: "/explore", gps: GPS.uh, size: "360", then: (p) => tap(p, "Plan Trip") },
  { file: "22-plan-list", path: `/explore/plan?${PLAN_Q}`, gps: GPS.uh },
  { file: "22-plan-list-360", path: `/explore/plan?${PLAN_Q}`, gps: GPS.uh, size: "360" },
  { file: "23-plan-edit", path: `/explore/plan?${PLAN_Q}`, gps: GPS.uh, then: (p) => tap(p, /^Edit trip/) },
  { file: "24-itinerary", path: `/explore/plan?${PLAN_Q}`, gps: GPS.uh, then: (p) => p.locator('a[href*="/explore/plan/0"]').first().tap() },
  { file: "24-itinerary-360", path: `/explore/plan?${PLAN_Q}`, gps: GPS.uh, size: "360", then: (p) => p.locator('a[href*="/explore/plan/0"]').first().tap() },
  { file: "25-itinerary-map", path: `/explore/plan?${PLAN_Q}`, gps: GPS.uh, then: async (p) => (await p.locator('a[href*="/explore/plan/0"]').first().tap(), await settle(p), tap(p, "Show map")) },
  { file: "26-live-trip", path: `/explore/plan?${PLAN_Q}`, gps: GPS.uh, then: async (p) => (await p.locator('a[href*="/explore/plan/0"]').first().tap(), await settle(p), tap(p, /Start trip/)) },
  { file: "27-live-trip-ride-step", path: `/explore/plan?${PLAN_Q}`, gps: GPS.uh, then: async (p) => (await p.locator('a[href*="/explore/plan/0"]').first().tap(), await settle(p), await tap(p, /Start trip/), await settle(p), tap(p, /Next step/)) },
  { file: "28-alerts", path: "/more/alerts?filter=all" },
  { file: "29-alert-detail", path: "/more/alerts/demo-route82-stop-closure" },
  { file: "30-recent-empty", path: "/recent" },
  {
    file: "31-recent",
    path: "/explore/stop/342?route=040",
    then: async (p) => {
      await p.goto("/explore/route/082?dir=0");
      await settle(p);
      await p.goto("/explore/stop/2958?route=082");
      await settle(p);
      await tap(p, "Recent", "link");
    },
  },
  { file: "32-fares", path: "/fares" },
  { file: "33-more", path: "/more" },
  { file: "34-settings", path: "/more/settings" },
  { file: "35-route-schedules", path: "/more/routes" },
  { file: "36-location-denied", path: "/explore", gps: null },
  { file: "37-location-denied-saved", path: "/explore", gps: null, storage: { ...ONBOARDED, ...SAVED_2958 } },
  {
    file: "38-offline",
    path: "/explore",
    then: async (p) => {
      await p.context().setOffline(true);
      await p.evaluate(() => window.dispatchEvent(new Event("offline")));
      await p.waitForTimeout(1500);
    },
  },
  {
    file: "39-offline-stop",
    path: "/explore/stop/342?route=040",
    then: async (p) => {
      await p.context().setOffline(true);
      await p.evaluate(() => window.dispatchEvent(new Event("offline")));
      await p.waitForTimeout(1500);
    },
  },
  { file: "42-home-es", path: "/explore", storage: ES },
  { file: "43-stop-342-es", path: "/explore/stop/342?route=040", storage: ES },
  { file: "44-itinerary-es", path: `/explore/plan/0?${PLAN_Q}`, gps: GPS.uh, storage: ES },
  { file: "45-alerts-es", path: "/more/alerts?filter=all", storage: ES },
  { file: "46-home-xlarge-360", path: "/explore", size: "360", storage: { "ridemetro.prefs": { welcomed: true, lang: "en", textSize: "xlarge", walkPace: "normal" } } },
  { file: "47-stop-342-xlarge-360", path: "/explore/stop/342?route=040", size: "360", storage: { "ridemetro.prefs": { welcomed: true, lang: "en", textSize: "xlarge", walkPace: "normal" } } },
  { file: "48-not-found", path: "/nowhere" },
];

/** Late night (Saturday 2:30 AM): the API clock jumps through fake-now.mjs's NOW_FILE. */
const LATE: Shot[] = [
  { file: "40-late-night-home", path: "/explore" },
  { file: "41-late-night-stop", path: "/explore/stop/342?route=040" },
];

async function shoot(page: Page, s: Shot) {
  if (s.size === "360") await page.setViewportSize({ width: 360, height: 640 });
  await launch(page, s.path, { gps: s.gps === undefined ? GPS.downtown : s.gps, storage: s.storage });
  await page.waitForTimeout(1200); // map tiles
  if (s.then) {
    await s.then(page);
    await settle(page);
  }
  await page.waitForTimeout(s.wait ?? 1200);
  await page.screenshot({ path: resolve(OUT, `${s.file}.png`) });
}

test.describe("screenshots", () => {
  for (const s of SHOTS) {
    test(s.file, async ({ page }) => {
      await shoot(page, s);
      expect(await page.title()).toContain("RideMETRO");
    });
  }

  test.describe("late night", () => {
    test.beforeAll(async () => {
      writeFileSync(NOW_FILE, "2026-09-26T02:30:00-05:00");
      await new Promise((r) => setTimeout(r, 1200));
    });
    test.afterAll(async () => {
      rmSync(NOW_FILE, { force: true });
      await new Promise((r) => setTimeout(r, 1200));
    });
    for (const s of LATE) test(s.file, ({ page }) => shoot(page, s));
  });
});
