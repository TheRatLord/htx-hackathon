// The review screenshot set: every screen and important state, at 412x800 (plus 360x640 for home,
// stop, plan and itinerary, and their Extra-large-text and Spanish variants at 360x640). Set S data
// (OFFLINE fixtures, scheduled times at a weekday noon).
//   npm run test:e2e -- screens.spec.ts            # just the shots
//   npx tsx scripts/capture-set.ts <dir>           # the whole judged set: shots + INDEX.md + original/
// Files go to SHOTS_DIR (default ../ux-audit/redesign/latest), named NN-screen[-state][-360].png,
// with one <file>.json per shot in SHOTS_DIR/.manifest (what capture-set.ts writes INDEX.md from).
//
// Deterministic clock: the API clock is frozen (fake-now.mjs with E2E_FREEZE=1) and reset to the
// shot's instant before every shot; the browser's Date is fixed at the same instant (helpers.ts
// launch). Every time on every screen is computed for exactly NOON (or 2:30 AM for the late-night
// shots), however long the run takes. A shot fails if the API's clock isn't at that instant (e.g. a
// reused server that wasn't started through fake-now.mjs).

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { FROZEN, GPS, launch, ONBOARDED, SAVED_2958, serverNow, settle, type Gps } from "./helpers.ts";

const OUT = process.env.SHOTS_DIR ?? resolve(import.meta.dirname, "../../../ux-audit/redesign/latest");
const MANIFEST = resolve(OUT, ".manifest");
// The API server's clock file (playwright.config.ts): one per API port.
const NOW_FILE = resolve(import.meta.dirname, `.results/now-${process.env.API_PORT ?? 8787}.txt`);
// Every shot starts at the same API instant (fake-now.mjs re-applies a time when its tag changes).
export const NOON = process.env.E2E_NOW ?? "2026-09-25T12:00:00-05:00"; // playwright.config.ts's default
export const LATE_NIGHT = "2026-09-26T02:30:00-05:00"; // Saturday 2:30 AM
mkdirSync(OUT, { recursive: true });
mkdirSync(MANIFEST, { recursive: true });
mkdirSync(resolve(NOW_FILE, ".."), { recursive: true });

const ES = { "ridemetro.prefs": { welcomed: true, lang: "es", textSize: "standard", walkPace: "normal" } };
const PLAN_Q = "from=29.71990%2C-95.34220&to=landmark%3Ahobby-airport&toName=Hobby+Airport";

interface Shot {
  file: string;
  /** What the shot shows (state, not content): the INDEX.md caption. */
  desc: string;
  path: string;
  gps?: Gps | null;
  storage?: Record<string, unknown>;
  size?: "412" | "360";
  /** Steps after launch (rider actions or state changes) before the shot. */
  then?: (page: Page) => Promise<void>;
  wait?: number;
}

const PREFS = (lang: "en" | "es", textSize: "standard" | "xlarge") => ({ "ridemetro.prefs": { welcomed: true, lang, textSize, walkPace: "normal" } });

const tap = (page: Page, name: string | RegExp, role: "button" | "link" = "button") => page.getByRole(role, { name }).first().tap();
const search = async (page: Page, q: string) => {
  await tap(page, "Search for a place, stop or route");
  await expect(page.getByRole("searchbox")).toBeFocused();
  await page.waitForTimeout(300);
  await page.keyboard.type(q, { delay: 20 });
  await settle(page, 1000);
};

const SHOTS: Shot[] = [
  { file: "01-welcome", desc: "First launch (storage cleared): Welcome", path: "/", storage: {} },
  { file: "02-home", desc: "Home, no saved stop, downtown", path: "/explore" },
  { file: "02-home-360", desc: "Home, no saved stop, downtown", path: "/explore", size: "360" },
  { file: "03-home-saved", desc: "Home at Montrose with stop 2958 saved (F2 end)", path: "/explore", gps: GPS.montrose, storage: { ...ONBOARDED, ...SAVED_2958 } },
  { file: "03-home-saved-360", desc: "Home at Montrose with stop 2958 saved (F2 end)", path: "/explore", gps: GPS.montrose, storage: { ...ONBOARDED, ...SAVED_2958 }, size: "360" },
  // Home opens map-first, at its peek: Show list goes to half, and again to full.
  { file: "04-home-list-full", desc: "Home after Show list twice (full-height sheet)", path: "/explore", then: async (p) => (await tap(p, "Show list"), await settle(p, 400), tap(p, "Show list")) },
  { file: "05-route-near-40", desc: "Home filtered to Route 40 after tapping chip [40] (F1 end)", path: "/explore", then: async (p) => (await tap(p, "Show list"), await settle(p, 400), tap(p, "Show Route 40 near you")) },
  { file: "06-route-near-58-tc", desc: "Chip [58] at Northwest TC (F7 end)", path: "/explore", gps: GPS.nwtc, then: async (p) => (await tap(p, "Show list"), await settle(p, 400), tap(p, "Show Route 58 near you")) },
  { file: "07-place-hmns", desc: "Stops near the Houston Museum of Natural Science (F11 end)", path: "/explore", gps: GPS.eastDowntown, then: async (p) => (await search(p, "museum of natural science"), tap(p, "Stops near")) },
  { file: "08-search-hobby", desc: 'Search "hobby" at UH', path: "/explore", gps: GPS.uh, then: (p) => search(p, "hobby") },
  { file: "09-search-82-alert", desc: 'Search "82" with a route alert (F6 end)', path: "/explore", gps: GPS.montrose, then: (p) => search(p, "82") },
  { file: "10-search-museum", desc: 'Search "museum of natural science"', path: "/explore", gps: GPS.eastDowntown, then: (p) => search(p, "museum of natural science") },
  { file: "11-search-empty", desc: "Search opened, no query, no history", path: "/explore", then: (p) => tap(p, "Search for a place, stop or route") },
  { file: "12-stop-342", desc: "Stop sheet 342, Route 40 NB", path: "/explore/stop/342?route=040" },
  { file: "12-stop-342-360", desc: "Stop sheet 342, Route 40 NB", path: "/explore/stop/342?route=040", size: "360" },
  { file: "13-stop-342-full", desc: "Stop sheet 342 at full height", path: "/explore/stop/342?route=040", then: (p) => tap(p, "Show list") },
  { file: "14-stop-342-tracking", desc: "Stop 342 after Track bus", path: "/explore/stop/342?route=040", then: (p) => tap(p, /^Track bus/) },
  { file: "15-full-schedule", desc: "Full Schedule for 342 / Route 40 NB", path: "/explore/stop/342/schedule?route=040" },
  { file: "16-walk-342", desc: "Walk to stop 342 (F4 end)", path: "/explore/stop/342?route=040", then: (p) => tap(p, /^Walk here/) },
  { file: "17-route-82", desc: "Route 82 Eastbound from search, Montrose", path: "/explore", gps: GPS.montrose, then: async (p) => (await search(p, "82"), tap(p, "82 Westheimer, Eastbound to DOWNTOWN")) },
  { file: "18-route-82-stop-2958", desc: "Route 82 with stop 2958 expanded (F5 end)", path: "/explore", gps: GPS.montrose, then: async (p) => (await search(p, "82"), await tap(p, "82 Westheimer, Eastbound to DOWNTOWN"), await settle(p), tap(p, /^Westheimer Rd @ Montrose Blvd \(2958\)/)) },
  { file: "19-tc-northwest", desc: "Northwest Transit Center", path: "/explore/tc/northwest-transit-center", gps: GPS.nwtc },
  { file: "20-tc-northwest-route58", desc: "Northwest TC with Route 58 selected", path: "/explore/tc/northwest-transit-center?route=058", gps: GPS.nwtc },
  { file: "21-plan-form", desc: "Plan Your Trip form at UH, empty", path: "/explore", gps: GPS.uh, then: (p) => tap(p, /^(Plan Trip|Planear viaje)$/) },
  { file: "21-plan-form-360", desc: "Plan Your Trip form at UH, empty", path: "/explore", gps: GPS.uh, size: "360", then: (p) => tap(p, /^(Plan Trip|Planear viaje)$/) },
  { file: "22-plan-list", desc: "Trip options UH to Hobby Airport (F3 end)", path: `/explore/plan?${PLAN_Q}`, gps: GPS.uh },
  { file: "22-plan-list-360", desc: "Trip options UH to Hobby Airport (F3 end)", path: `/explore/plan?${PLAN_Q}`, gps: GPS.uh, size: "360" },
  { file: "23-plan-edit", desc: "Trip form after Edit", path: `/explore/plan?${PLAN_Q}`, gps: GPS.uh, then: (p) => tap(p, /^Edit trip/) },
  { file: "24-itinerary", desc: "Itinerary option 1, UH to Hobby", path: `/explore/plan?${PLAN_Q}`, gps: GPS.uh, then: (p) => p.locator('a[href*="/explore/plan/0"]').first().tap() },
  { file: "24-itinerary-360", desc: "Itinerary option 1, UH to Hobby", path: `/explore/plan?${PLAN_Q}`, gps: GPS.uh, size: "360", then: (p) => p.locator('a[href*="/explore/plan/0"]').first().tap() },
  { file: "25-itinerary-map", desc: "Itinerary after Show map", path: `/explore/plan?${PLAN_Q}`, gps: GPS.uh, then: async (p) => (await p.locator('a[href*="/explore/plan/0"]').first().tap(), await settle(p), tap(p, "Show map")) },
  { file: "26-live-trip", desc: "Live trip after Start (F8 end)", path: `/explore/plan?${PLAN_Q}`, gps: GPS.uh, then: async (p) => (await p.locator('a[href*="/explore/plan/0"]').first().tap(), await settle(p), tap(p, /Start trip/)) },
  { file: "27-live-trip-ride-step", desc: "Live trip, step 2 (wait and board)", path: `/explore/plan?${PLAN_Q}`, gps: GPS.uh, then: async (p) => (await p.locator('a[href*="/explore/plan/0"]').first().tap(), await settle(p), await tap(p, /Start trip/), await settle(p), await tap(p, "Show list"), await settle(p, 400), tap(p, /Next step/)) },
  { file: "28-alerts", desc: "Service Alerts, all routes", path: "/more/alerts?filter=all" },
  { file: "29-alert-detail", desc: "Alert detail: Route 82 stop moved", path: "/more/alerts/demo-route82-stop-closure" },
  { file: "30-recent-empty", desc: "Recent with nothing viewed", path: "/recent" },
  {
    file: "31-recent",
    desc: "Recent after viewing 342, route 82 and 2958",
    path: "/explore/stop/342?route=040",
    then: async (p) => {
      await p.goto("/explore/route/082?dir=0");
      await settle(p);
      await p.goto("/explore/stop/2958?route=082");
      await settle(p);
      await tap(p, "Recent", "link");
    },
  },
  { file: "32-fares", desc: "Fares (F9 end)", path: "/fares" },
  { file: "33-more", desc: "More", path: "/more" },
  { file: "34-settings", desc: "Settings", path: "/more/settings" },
  { file: "35-route-schedules", desc: "Route Schedules", path: "/more/routes" },
  { file: "36-location-denied", desc: "Home with location not granted", path: "/explore", gps: null },
  { file: "37-location-denied-saved", desc: "Location not granted, 2958 saved", path: "/explore", gps: null, storage: { ...ONBOARDED, ...SAVED_2958 } },
  {
    file: "38-offline",
    desc: "Home offline",
    path: "/explore",
    then: async (p) => {
      await p.context().setOffline(true);
      await p.evaluate(() => window.dispatchEvent(new Event("offline")));
      await p.waitForTimeout(1500);
    },
  },
  {
    file: "39-offline-stop",
    desc: "Stop 342 offline",
    path: "/explore/stop/342?route=040",
    then: async (p) => {
      await p.context().setOffline(true);
      await p.evaluate(() => window.dispatchEvent(new Event("offline")));
      await p.waitForTimeout(1500);
    },
  },
  { file: "42-home-es", desc: "Home in Spanish", path: "/explore", storage: ES },
  { file: "43-stop-342-es", desc: "Stop 342 in Spanish", path: "/explore/stop/342?route=040", storage: ES },
  { file: "44-itinerary-es", desc: "Itinerary 1 in Spanish", path: `/explore/plan/0?${PLAN_Q}`, gps: GPS.uh, storage: ES },
  { file: "45-alerts-es", desc: "Service alerts in Spanish", path: "/more/alerts?filter=all", storage: ES },
  { file: "46-home-xlarge-360", desc: "Home, Extra large text", path: "/explore", size: "360", storage: { "ridemetro.prefs": { welcomed: true, lang: "en", textSize: "xlarge", walkPace: "normal" } } },
  { file: "47-stop-342-xlarge-360", desc: "Stop 342, Extra large text", path: "/explore/stop/342?route=040", size: "360", storage: { "ridemetro.prefs": { welcomed: true, lang: "en", textSize: "xlarge", walkPace: "normal" } } },
  { file: "48-not-found", desc: "Unknown URL", path: "/nowhere" },
];

/**
 * 360x640 variants of the small-phone shots: Extra large text (the setting riders with low vision
 * pick) and Spanish. Home and stop at Extra large are 46 and 47 already.
 */
const VARIANTS: Shot[] = SHOTS.filter((s) => s.size === "360" && !s.file.includes("xlarge")).flatMap((s) => {
  const base = s.file.replace(/-360$/, "");
  const storage = s.storage ?? ONBOARDED;
  const out: Shot[] = [];
  if (!["02-home", "12-stop-342"].includes(base))
    out.push({ ...s, file: `${base}-xlarge-360`, desc: `${s.desc}; Extra large text`, storage: { ...storage, ...PREFS("en", "xlarge") } });
  out.push({ ...s, file: `${base}-es-360`, desc: `${s.desc}; Spanish`, storage: { ...storage, ...PREFS("es", "standard") } });
  return out;
});

/** Late night (Saturday 2:30 AM): the API clock jumps through fake-now.mjs's NOW_FILE. */
const LATE: Shot[] = [
  { file: "40-late-night-home", desc: "Home at Saturday 2:30 AM", path: "/explore" },
  { file: "41-late-night-stop", desc: "Stop 342 at Saturday 2:30 AM", path: "/explore/stop/342?route=040" },
];

async function shoot(page: Page, s: Shot, at = NOON) {
  writeFileSync(NOW_FILE, `${at} ${s.file}`);
  // fake-now.mjs checks the file every 300 ms: wait until the API is at the shot's instant.
  const want = new Date(at).getTime();
  await expect
    .poll(async () => (await serverNow(page)).getTime(), {
      message: `The API clock must be at ${at}. Start the API through tests/e2e/fake-now.mjs (playwright.config.ts does) with E2E_NOW_FILE=${NOW_FILE}.`,
      timeout: 5000,
    })
    .toBe(want);
  if (FROZEN) {
    // And it must stay there: a clock that runs on would put different minutes in different shots.
    await page.waitForTimeout(1100);
    expect((await serverNow(page)).getTime(), "The API clock must be frozen (E2E_FREEZE=1)").toBe(want);
  }
  if (s.size === "360") await page.setViewportSize({ width: 360, height: 640 });
  await launch(page, s.path, { gps: s.gps === undefined ? GPS.downtown : s.gps, storage: s.storage });
  await page.waitForTimeout(1200); // map tiles
  if (s.then) {
    await s.then(page);
    await settle(page);
  }
  await page.waitForTimeout(s.wait ?? 1200);
  // The browser clock must agree with the API's (helpers.ts launch fixes it when FROZEN).
  const browserNow = await page.evaluate(() => Date.now());
  if (FROZEN) expect(browserNow, "The browser clock must be frozen at the shot's instant").toBe(want);
  // Nothing may be caught mid-blink: finite animations jump to their end, infinite ones (the pulsing
  // location dot) to their start, and the text caret is hidden.
  await page.screenshot({ path: resolve(OUT, `${s.file}.png`), animations: "disabled", caret: "hide" });
  const prefs = (s.storage ?? ONBOARDED)["ridemetro.prefs"] as { lang?: string; textSize?: string } | undefined;
  const meta = {
    file: `${s.file}.png`,
    desc: s.desc,
    path: s.path,
    viewport: s.size === "360" ? "360x640" : "412x800",
    gps: s.gps === null ? "not granted" : (Object.entries(GPS).find(([, g]) => g === (s.gps ?? GPS.downtown))?.[0] ?? "custom"),
    lang: prefs?.lang ?? "en",
    textSize: prefs?.textSize ?? "standard",
    now: at,
    frozen: FROZEN,
  };
  writeFileSync(resolve(MANIFEST, `${s.file}.json`), JSON.stringify(meta, null, 2));
}

test.describe("screenshots", () => {
  test.afterAll(() => rmSync(NOW_FILE, { force: true }));
  for (const s of [...SHOTS, ...VARIANTS]) {
    test(s.file, async ({ page }) => {
      await shoot(page, s);
      expect(await page.title()).toContain("RideMETRO");
    });
  }

  test.describe("late night", () => {
    test.afterAll(async () => {
      rmSync(NOW_FILE, { force: true });
      await new Promise((r) => setTimeout(r, 1200));
    });
    for (const s of LATE) test(s.file, ({ page }) => shoot(page, s, LATE_NIGHT));
  });
});
