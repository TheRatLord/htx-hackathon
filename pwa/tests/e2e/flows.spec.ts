// Spec section E: flows F1–F11 from a cold launch, at 412x800 and 360x640, counting rider actions
// exactly like the baseline protocol (docs/baseline-steps.md), and asserting the goal information is
// on screen at the end. Then the automatable F-rubric checks (L1/L3 font sizes, L8 targets, L6
// contrast, L13 focus, S4c, S10, M1, L5 and console errors).
//
// Set S (scheduled): the API runs OFFLINE=1 DEMO_REALTIME=0 with its clock at a weekday noon
// (playwright.config.ts). Minutes are schedule-dependent, so the goal checks match the stop, ID,
// side, direction and headsign literally and the times by shape ("16 min" → /\d+ min/).

import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  contrastViolations,
  expectFocusOnH1,
  expectInViewport,
  firstTimeBox,
  foldY,
  GPS,
  horizontalOverflow,
  launch,
  mapAnnotate,
  pinPosition,
  Rider,
  SAVED_2958,
  settle,
  smallTargets,
  textSizes,
  VIEWPORTS,
  watchConsole,
  ONBOARDED,
} from "./helpers.ts";

const RESULTS = resolve(import.meta.dirname, ".results");
mkdirSync(RESULTS, { recursive: true });

/**
 * `target` is the hard limit: never more steps than today's RideMETRO flow takes (the task's
 * required counts, docs/baseline-steps.md). `spec` is what the design spec promises; they now agree.
 */
const TARGET: Record<string, { target: number; spec: number; baseline: string }> = {
  F10: { target: 2, spec: 2, baseline: "14" },
  F1: { target: 1, spec: 1, baseline: "2 (4)" },
  F2: { target: 0, spec: 0, baseline: "3" },
  F3: { target: 3, spec: 3, baseline: "10" },
  F4: { target: 2, spec: 2, baseline: "impossible" },
  F5: { target: 4, spec: 4, baseline: "9 (18)" },
  F6: { target: 2, spec: 2, baseline: "6, partial" },
  F7: { target: 1, spec: 1, baseline: "2 (14)" },
  F8: { target: 5, spec: 5, baseline: "9, partial" },
  F9: { target: 1, spec: 1, baseline: "1 (wall)" },
  F11: { target: 3, spec: 3, baseline: "6, partial" },
};

function record(flow: string, viewport: string, rider: Rider, goalReached: boolean, notes = "") {
  const t = TARGET[flow.split(" ")[0]];
  const row = { flow, viewport, measured: rider.count, target: t?.target, spec: t?.spec, baseline: t?.baseline, goalReached, steps: rider.steps.map((s) => `${s.type}: ${s.target}`), notes };
  appendFileSync(resolve(RESULTS, "flows.jsonl"), JSON.stringify(row) + "\n");
}

/**
 * The goal texts must be visible and inside the viewport. At 412x800 this is the pass condition
 * (spec E); at 360x640 an off-fold goal is a soft failure (reported, the flow still counts).
 */
async function goalOnScreen(page: Page, texts: (string | RegExp)[], strict: boolean): Promise<string[]> {
  const navTop = await foldY(page);
  const missing: string[] = [];
  for (const t of texts) {
    const loc = page.getByText(t).filter({ visible: true }).first();
    const visible = await loc.isVisible().catch(() => false);
    const box = visible ? await loc.boundingBox() : null;
    const ok = Boolean(box && box.y >= 0 && box.y + Math.min(box.height, 18) <= navTop);
    if (!ok) missing.push(`${String(t)}${box ? ` (y=${Math.round(box.y)}, fold=${Math.round(navTop)})` : " (not visible)"}`);
  }
  // 412x800 is the pass condition (spec E). At 360x640 an off-fold goal is reported, not failed,
  // unless the spec demands that size too (P1 for F3, F2's saved row, P2 for F8).
  if (strict) expect(missing, "goal texts not on screen at the end").toEqual([]);
  else if (missing.length) test.info().annotations.push({ type: "below the fold", description: missing.join("; ") });
  return missing;
}

function noteConsole(errors: string[]) {
  if (errors.length) test.info().annotations.push({ type: "console errors", description: [...new Set(errors)].join(" | ") });
}

const TIME = /\d+\s*min|\d{1,2}:\d{2}\s?[AP]M/; // a departure: "16 min" or a clock time

async function searchBar(page: Page) {
  return page.getByRole("button", { name: "Search for a place, stop or route" });
}

for (const vp of VIEWPORTS) {
  const strict = vp.name === "412x800";

  test.describe(`flows @ ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test(`F10 first launch → usable map`, async ({ page }, info) => {
      const errors = watchConsole(page);
      await launch(page, "/", { gps: GPS.downtown, storage: {} });
      await expect(page).toHaveURL(/\/welcome$/);
      const rider = new Rider(page);
      await rider.tap(page.getByRole("button", { name: "Show stops near me" }), "Show stops near me");
      rider.systemDialog("Allow in Chrome's location dialog");
      await expect(page).toHaveURL(/\/explore$/);
      await expect(page.getByRole("heading", { level: 1, name: "Nearby stops" })).toBeVisible();

      // S10: no coach marks, tips or unrequested dialogs.
      await expect(page.getByRole("dialog")).toHaveCount(0);
      const missing = await goalOnScreen(page, ["Routes here:", "Fannin St @ McKinney St (246)", "West side of Fannin St", "WESTBOUND to DOWNTOWN"], strict);

      // The first card is 246 with Route 137 westbound first.
      const card1 = page.getByRole("button", { name: /^Fannin St @ McKinney St \(246\)/ });
      await expect(card1).toBeVisible();

      // tooSoon rendering: any "Leaves before you get there" is paired with a clock time in the
      // secondary text colour (a due time the rider can't reach), never with a plain "N min".
      for (const word of await page.getByText("Leaves before you get there").filter({ visible: true }).all()) {
        const row = word.locator("xpath=..");
        await expect(row).toContainText(/\d/);
      }

      // M1: visible map between the search bar and the sheet.
      const bar = await (await searchBar(page)).boundingBox();
      const sheet = await page.getByRole("region").first().boundingBox();
      const strip = Math.round(sheet!.y - (bar!.y + bar!.height));
      info.annotations.push({ type: "M1 map strip", description: `${strip}px` });
      expect.soft(strip, "M1 map strip").toBeGreaterThanOrEqual(vp.height >= 740 ? 180 : 120);

      await rider.attach(info, "F10");
      expect(rider.count).toBeLessThanOrEqual(TARGET.F10.target);
      record("F10", vp.name, rider, missing.length === 0, `M1 strip ${strip}px`);
      noteConsole(errors);
    });

    test(`F1 nearest stop for Route 40 northbound + next bus`, async ({ page }, info) => {
      const errors = watchConsole(page);
      await launch(page, "/explore", { gps: GPS.downtown });
      const rider = new Rider(page);
      const chips = page.getByRole("button", { name: /^Show Route .+ near you$/ });
      const chip40 = page.getByRole("button", { name: "Show Route 40 near you" });
      const idx = (await chips.allInnerTexts()).findIndex((t) => t.trim() === "40");
      info.annotations.push({ type: "chip position", description: `[40] is chip #${idx + 1}` });
      await rider.tap(chip40, "chip [40]");
      await expect(page).toHaveURL(/route=040/);
      await expectFocusOnH1(page);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Route 40 near you");
      const nb = page.getByRole("button", { name: /^Route 40 NORTHBOUND to N SHEPHERD P&R, Lamar St @ Main St \(342\)/ });
      await expect(nb).toBeVisible();
      const missing = await goalOnScreen(page, ["NORTHBOUND to N SHEPHERD P&R", "Lamar St @ Main St (342)", "North side of Lamar St"], strict);
      // The next bus (minutes or a clock time) inside the NB card, and the whole card above the fold.
      const nbCard = nb.locator("xpath=..");
      await expect(nbCard).toContainText(TIME);
      const tb = await firstTimeBox(nbCard);
      const time = tb?.text ?? "";
      const fold = await foldY(page);
      const timeOnScreen = Boolean(tb && tb.bottom <= fold);
      if (strict) expect(timeOnScreen, `NB next bus "${time}" above the fold (bottom ${tb?.bottom}, fold ${fold})`).toBe(true);
      await rider.attach(info, "F1");
      expect(rider.count).toBeLessThanOrEqual(TARGET.F1.target);
      record("F1", vp.name, rider, missing.length === 0 && timeOnScreen, `next bus ${time}; [40] chip #${idx + 1}`);
      noteConsole(errors);
    });

    test(`F2 returning commuter: next 82 at saved stop 2958`, async ({ page }, info) => {
      const errors = watchConsole(page);
      await launch(page, "/explore", { gps: GPS.montrose, storage: { ...ONBOARDED, ...SAVED_2958 } });
      const rider = new Rider(page);
      const saved = page.locator("section[role=region]").getByText("Westheimer Rd @ Montrose Blvd (2958)").first();
      await expect(saved).toBeVisible();
      const missing = await goalOnScreen(page, ["Westheimer Rd @ Montrose Blvd (2958)", "EASTBOUND to DOWNTOWN"], true);
      // The saved row is the first 2958 occurrence and carries a departure.
      const savedRow = page.getByRole("button", { name: /Westheimer Rd @ Montrose Blvd \(2958\)/ }).first();
      await expect(savedRow.locator("xpath=..")).toContainText(TIME);
      await rider.attach(info, "F2");
      expect(rider.count).toBe(0);
      record("F2", vp.name, rider, missing.length === 0);
      noteConsole(errors);
    });

    test(`F2b saved row renders without a location fix`, async ({ page }) => {
      await launch(page, "/explore", { gps: null, storage: { ...ONBOARDED, ...SAVED_2958 } });
      await expect(page.getByText("Westheimer Rd @ Montrose Blvd (2958)").first()).toBeVisible();
      await expect(page.getByText("EASTBOUND to DOWNTOWN").first()).toBeVisible();
    });

    test(`F3 UH → Hobby: know exactly where to board`, async ({ page }, info) => {
      const errors = watchConsole(page);
      await launch(page, "/explore", { gps: GPS.uh });
      const rider = new Rider(page);
      await rider.tap(await searchBar(page), "search bar");
      await rider.type("hobby");
      const place = page.getByRole("button", { name: /^Hobby Airport Airport/ }).locator("xpath=..");
      await rider.tap(place.getByRole("button", { name: "Directions" }).first(), "Directions on 'Hobby Airport'");
      await expect(page).toHaveURL(/\/explore\/plan\?/);
      await expectFocusOnH1(page);
      const missing = await goalOnScreen(page, ["My location", "Hobby Airport", "Edit ›", /Board 80 at #11424 · \d{1,2}:\d{2}\s?[AP]M/], true); // P1: both sizes
      await rider.attach(info, "F3");
      expect(rider.count).toBeLessThanOrEqual(TARGET.F3.target);
      record("F3", vp.name, rider, missing.length === 0);
      noteConsole(errors);
    });

    test(`F4 walking directions to stop 342 (pin path)`, async ({ page }, info) => {
      const errors = watchConsole(page);
      await launch(page, "/explore", { gps: GPS.downtown });
      await page.waitForTimeout(1500); // map tiles and pin labels
      const rider = new Rider(page);
      const pin = await pinPosition(page, "342");
      mapAnnotate(info, "pin 342", pin);
      const sheetTop = (await page.getByRole("region").first().boundingBox())!.y;
      const barBottom = await (await searchBar(page)).boundingBox().then((b) => b!.y + b!.height);
      const inStrip = Boolean(pin && pin.y > barBottom && pin.y < sheetTop && pin.x > 0 && pin.x < vp.width);
      info.annotations.push({ type: "M4 pin 342", description: pin ? `at ${Math.round(pin.x)},${Math.round(pin.y)}; strip ${Math.round(barBottom)}–${Math.round(sheetTop)}` : "not rendered" });
      expect.soft(inStrip, "M4: pin 342 inside the visible map strip").toBe(true);
      let path = "pin";
      if (inStrip) {
        await rider.tapAt(pin!.x, pin!.y, "map pin 342");
        await expect(page).toHaveURL(/\/explore\/stop\/342/);
        await rider.tap(page.getByRole("button", { name: /^Walk here/ }), "Walk here");
      } else {
        path = "chip (pin not in strip)";
        await rider.tap(page.getByRole("button", { name: "Show Route 40 near you" }), "chip [40]");
        await rider.tap(page.getByRole("button", { name: /^Walk to stop 342/ }), "walk button on NB card");
      }
      await expect(page).toHaveURL(/\/explore\/stop\/342\/walk/);
      await expectFocusOnH1(page);
      const missing = await goalOnScreen(page, ["Walk to Lamar St @ Main St (342)", /^\d+ min · [\d,.]+ (ft|mi) · north side of Lamar St$/, /next bus/i, /You have time\.|Hurry: it's close\.|Leaves before you get there\./], strict);
      const streetRouted = !(await page.getByText("Street-by-street directions are unavailable").isVisible());
      info.annotations.push({ type: "walk", description: streetRouted ? "street-routed" : "estimate only (no OSRM offline)" });
      await rider.attach(info, "F4");
      expect(rider.count).toBeLessThanOrEqual(TARGET.F4.target);
      record("F4", vp.name, rider, missing.length === 0, `path: ${path}; ${streetRouted ? "street-routed" : "no street routing offline: straight estimate, 1 step"}`);
      noteConsole(errors);
    });

    test(`F5 Route 82 → its stops → EB arrivals at Westheimer @ Montrose`, async ({ page }, info) => {
      const errors = watchConsole(page);
      await launch(page, "/explore", { gps: GPS.montrose });
      const rider = new Rider(page);
      await rider.tap(await searchBar(page), "search bar");
      await rider.type("82");
      await rider.tap(page.getByRole("button", { name: "82 Westheimer, Eastbound to DOWNTOWN" }), "Eastbound pill on '82 Westheimer'");
      await expect(page).toHaveURL(/\/explore\/route\/082/);
      await expectFocusOnH1(page);
      await expect(page.getByText("101 stops", { exact: false })).toBeVisible();
      await rider.tap(page.getByRole("button", { name: /^Westheimer Rd @ Montrose Blvd \(2958\)/ }), "row 2958");
      await expect(page).toHaveURL(/stop=2958/);
      const missing = await goalOnScreen(page, ["Westheimer Rd @ Montrose Blvd", "Stop details ›", /^Walk \d+ min$/], strict);
      // The expanded row carries the strip (up to 4 times).
      const row = page.locator("li").filter({ hasText: "Westheimer Rd @ Montrose Blvd (2958)" }).filter({ hasText: "Stop details" }).first();
      await expect(row).toContainText(/\d+\s*min/);
      await rider.attach(info, "F5");
      expect(rider.count).toBeLessThanOrEqual(TARGET.F5.target);
      record("F5", vp.name, rider, missing.length === 0);
      noteConsole(errors);
    });

    test(`F5b shortcut "82 montrose" from anywhere`, async ({ page }, info) => {
      await launch(page, "/explore", { gps: GPS.downtown });
      const rider = new Rider(page);
      await rider.tap(await searchBar(page), "search bar");
      await rider.type("82 montrose");
      const hit = page.getByRole("button", { name: /Westheimer Rd @ Montrose Blvd \(2958\)/ }).first();
      await rider.tap(hit, "result 2958");
      await expect(page.getByText("Westheimer Rd @ Montrose Blvd").first()).toBeVisible();
      await expect(page.getByText(/EASTBOUND|Eastbound/).first()).toBeVisible();
      await rider.attach(info, "F5b");
      record("F5b shortcut", vp.name, rider, true, `landed on ${page.url().replace(/^https?:\/\/[^/]+/, "")}`);
      expect(rider.count).toBeLessThanOrEqual(3);
    });

    test(`F6 is there an alert on Route 82?`, async ({ page }, info) => {
      const errors = watchConsole(page);
      await launch(page, "/explore", { gps: GPS.montrose });
      const rider = new Rider(page);
      await rider.tap(await searchBar(page), "search bar");
      await rider.type("82");
      const missing = await goalOnScreen(page, ["82 Westheimer", "Stop moved: Eastbound stop at Westheimer Rd @ Kirby Dr is now 150 ft east", "Demo"], true);
      await rider.attach(info, "F6");
      expect(rider.count).toBeLessThanOrEqual(TARGET.F6.target);
      record("F6", vp.name, rider, missing.length === 0);
      noteConsole(errors);
    });

    test(`F7 Northwest TC: bay for Route 58 + next departure`, async ({ page }, info) => {
      const errors = watchConsole(page);
      await launch(page, "/explore", { gps: GPS.nwtc });
      const rider = new Rider(page);
      const chips = page.getByRole("button", { name: /^Show Route .+ near you$/ });
      const first = (await chips.first().innerText()).trim();
      info.annotations.push({ type: "chip position", description: `first chip is [${first}]` });
      expect.soft(first, "[58] is the first chip").toBe("58");
      await rider.tap(page.getByRole("button", { name: "Show Route 58 near you" }), "chip [58]");
      await expectFocusOnH1(page);
      const missing = await goalOnScreen(page, ["Route 58 near you", "WESTBOUND to WEST BELT", /Northwest Transit Center/, /Bay M/, "Platform 2"], strict);
      // D3 order rule: earliest catchable bus first, the TC card never below second; it shows a departure.
      const cards = page.getByRole("button", { name: /^Route 58 / });
      await expect(cards.first()).toBeVisible();
      const names = await cards.evaluateAll((els) => els.slice(0, 2).map((e) => e.getAttribute("aria-label") ?? e.textContent ?? ""));
      const tcAt = names.findIndex((n) => /Northwest Transit Center/.test(n));
      expect(tcAt, "TC card is one of the first two cards").toBeGreaterThanOrEqual(0);
      await expect(cards.nth(tcAt).locator("xpath=..")).toContainText(TIME);
      await rider.attach(info, "F7");
      expect(rider.count).toBeLessThanOrEqual(TARGET.F7.target);
      record("F7", vp.name, rider, missing.length === 0);
      noteConsole(errors);
    });

    test(`F8 start live trip tracking`, async ({ page }, info) => {
      const errors = watchConsole(page);
      await launch(page, "/explore", { gps: GPS.uh });
      const rider = new Rider(page);
      await rider.tap(await searchBar(page), "search bar");
      await rider.type("hobby");
      const place = page.getByRole("button", { name: /^Hobby Airport Airport/ }).locator("xpath=..");
      await rider.tap(place.getByRole("button", { name: "Directions" }).first(), "Directions");
      await rider.tap(page.locator('a[href*="/explore/plan/0"]').first(), "itinerary card 1");
      await expect(page).toHaveURL(/\/explore\/plan\/0/);
      await expectFocusOnH1(page);
      // P2: Start trip is fully visible on first render (sticky footer).
      const start = page.getByRole("button", { name: /Start trip/ });
      await expectInViewport(page, start, "Start trip");
      await rider.tap(start, "Start trip");
      await expect(page).toHaveURL(/\/explore\/trip/);
      await expect(page.getByRole("dialog")).toHaveCount(0); // the notification ask is not an OS dialog
      const missing = await goalOnScreen(page, ["Trip in progress", /^Arriving \d/, /step 1 of \d+/i, "Walk 5 min to M L King Blvd @ UH University Dr (#11424)", "West side of M L King Blvd", /Your 80 leaves at \d{1,2}:\d{2} [AP]M/], strict);
      await rider.attach(info, "F8");
      expect(rider.count).toBeLessThanOrEqual(TARGET.F8.target);
      record("F8", vp.name, rider, missing.length === 0);
      noteConsole(errors);
    });

    test(`F9 ticket / fare screen`, async ({ page }, info) => {
      const errors = watchConsole(page);
      await launch(page, "/explore", { gps: GPS.downtown });
      const rider = new Rider(page);
      await rider.tap(page.getByRole("link", { name: "Fares" }), "Fares tab");
      await expect(page).toHaveURL(/\/fares$/);
      await expectFocusOnH1(page);
      const missing = await goalOnScreen(page, ["My ticket", "Sign in to show ticket", "REDUCED FARES", "To be confirmed by METRO"], strict);
      await rider.attach(info, "F9");
      expect(rider.count).toBe(TARGET.F9.target);
      record("F9", vp.name, rider, missing.length === 0);
      noteConsole(errors);
    });

    test(`F11 landmark (HMNS) → closest stop → next arrivals`, async ({ page }, info) => {
      const errors = watchConsole(page);
      await launch(page, "/explore", { gps: GPS.eastDowntown });
      const rider = new Rider(page);
      await rider.tap(await searchBar(page), "search bar");
      await rider.type("museum of natural science");
      await expect(page.getByRole("button", { name: /^Closest stop: Main St @ Remington Ln \(688\)/ })).toContainText(/Northbound/);
      const place = page.getByRole("button", { name: /^Houston Museum of Natural Science/ }).locator("xpath=..");
      await rider.tap(place.getByRole("button", { name: "Stops near" }).first(), "Stops near on 'Houston Museum of Natural Science'");
      await expect(page).toHaveURL(/at=.*label=Houston/);
      await expectFocusOnH1(page);
      const missing = await goalOnScreen(page, [/Stops near\s+Houston Museum of Natural Science/, "Walk times from the museum", "Main St @ Remington Ln (688)", "East side of Main St", "NORTHBOUND to GREENSPOINT TC"], strict);
      const card = page.getByRole("button", { name: /^Main St @ Remington Ln \(688\)/ });
      await expect(card).toBeVisible();
      await rider.attach(info, "F11");
      expect(rider.count).toBeLessThanOrEqual(TARGET.F11.target);
      record("F11", vp.name, rider, missing.length === 0);
      noteConsole(errors);
    });
  });
}

// ---------------------------------------------------------------------------------------------
// F rubric: per screen, the checks a script can make.

interface Screen {
  id: string;
  path: string;
  gps?: (typeof GPS)[keyof typeof GPS] | null;
  storage?: Record<string, unknown>;
  prep?: (page: Page) => Promise<void>;
}

const SCREENS: Screen[] = [
  { id: "D1 welcome", path: "/welcome", storage: {} },
  { id: "D2 home", path: "/explore" },
  { id: "D2 home + saved", path: "/explore", gps: GPS.montrose, storage: { ...ONBOARDED, ...SAVED_2958 } },
  { id: "D3 route near you", path: "/explore?route=040" },
  { id: "D4 place", path: "/explore?at=29.72200,-95.38970&label=Houston%20Museum%20of%20Natural%20Science", gps: GPS.eastDowntown },
  { id: "D5 search", path: "/explore/search?q=82", gps: GPS.montrose },
  { id: "D6 stop", path: "/explore/stop/342?route=040" },
  { id: "D7 schedule", path: "/explore/stop/342/schedule?route=040" },
  { id: "D8 walk", path: "/explore/stop/342/walk?route=040" },
  { id: "D9 route", path: "/explore/route/082?dir=0&stop=2958", gps: GPS.montrose },
  { id: "D10 TC", path: "/explore/tc/northwest-transit-center?route=058", gps: GPS.nwtc },
  { id: "D11 plan list", path: "/explore/plan?from=29.71990%2C-95.34220&to=landmark%3Ahobby-airport&toName=Hobby+Airport", gps: GPS.uh },
  { id: "D11 plan form", path: "/explore/plan", gps: GPS.uh },
  { id: "D12 itinerary", path: "/explore/plan/0?from=29.71990%2C-95.34220&to=landmark%3Ahobby-airport&toName=Hobby+Airport", gps: GPS.uh },
  { id: "D14 alerts", path: "/more/alerts?filter=all" },
  { id: "D15 alert detail", path: "/more/alerts/demo-route82-stop-closure" },
  { id: "D16 recent", path: "/recent" },
  { id: "D17 fares", path: "/fares" },
  { id: "D18 more", path: "/more" },
  { id: "D19 settings", path: "/more/settings" },
];

const rubricRows: Record<string, unknown>[] = [];

test.describe("F rubric @ 412x800", () => {
  test.afterAll(() => {
    appendFileSync(resolve(RESULTS, "rubric.jsonl"), rubricRows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  });

  for (const s of SCREENS) {
    test(`rubric ${s.id}`, async ({ page }, info) => {
      const errors = watchConsole(page);
      await launch(page, s.path, { gps: s.gps === undefined ? GPS.downtown : s.gps, storage: s.storage });
      await page.waitForTimeout(800);
      if (s.prep) await s.prep(page);

      const sizes = await textSizes(page);
      const below14 = sizes.filter((t) => t.px < 13.95);
      const below16 = sizes.filter((t) => t.px < 15.95 && t.px >= 13.95);
      const distinct = [...new Set(sizes.map((t) => t.px))].sort((a, b) => a - b);
      const small = await smallTargets(page);
      const contrast = await contrastViolations(page);
      const scheduledWord = s.id.startsWith("D6") ? 0 : await page.getByText(/^Scheduled$/).filter({ visible: true }).count();
      const overflow = await horizontalOverflow(page);
      const dialogs = await page.getByRole("dialog").filter({ visible: true }).count();

      const row = {
        screen: s.id,
        below14: below14.map((t) => `${t.px}px "${t.text}"`),
        at14: below16.map((t) => `${t.px}px "${t.text}"`),
        distinctFontSizes: distinct,
        smallTargets: small.map((t) => `${t.name} ${t.w}x${t.h}`),
        contrast,
        scheduledWord,
        overflow,
        dialogs,
        consoleErrors: [...errors],
      };
      rubricRows.push(row);
      await info.attach("rubric.json", { body: JSON.stringify(row, null, 2), contentType: "application/json" });

      expect.soft(row.below14, "L3: no text below 14px").toEqual([]);
      expect.soft(distinct.length, `S2: ≤ 6 distinct font sizes (${distinct.join(", ")})`).toBeLessThanOrEqual(6);
      expect.soft(row.smallTargets, "L8: targets ≥ 48x48").toEqual([]);
      expect.soft(contrast, "L6: axe colour-contrast").toEqual([]);
      expect.soft(scheduledWord, "S4c: the word Scheduled appears only in D6's legend").toBe(0);
      expect.soft(overflow, "L5: no horizontal page scroll").toBeLessThanOrEqual(0);
      expect.soft(dialogs, "S10: no unrequested dialog").toBe(0);
      expect.soft(row.consoleErrors, "no console errors").toEqual([]);
    });
  }

  test("L13 focus lands on the h1 and the title changes on each navigation", async ({ page }) => {
    await launch(page, "/explore", { gps: GPS.downtown });
    const titles = [await page.title()];
    const hops: [string, () => Promise<void>][] = [
      ["chip [40]", () => page.getByRole("button", { name: "Show Route 40 near you" }).tap()],
      ["NB card", () => page.getByRole("button", { name: /^Route 40 NORTHBOUND/ }).tap()],
      ["Fares tab", () => page.getByRole("link", { name: "Fares" }).tap()],
      ["More tab", () => page.getByRole("link", { name: "More" }).tap()],
      ["Service Alerts", () => page.getByText("Service Alerts").first().tap()],
      ["Recent tab", () => page.getByRole("link", { name: "Recent" }).tap()],
    ];
    const failures: string[] = [];
    for (const [label, go] of hops) {
      await go();
      await settle(page);
      const onH1 = await page.evaluate(() => Boolean(document.activeElement?.closest("h1")));
      const title = await page.title();
      if (!onH1) failures.push(`${label}: focus on ${await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80))}`);
      if (titles.includes(title)) failures.push(`${label}: title unchanged (${title})`);
      titles.push(title);
    }
    expect(failures).toEqual([]);
  });

  test("L5 no horizontal scroll at 360x640 Extra large", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    const xl = { "ridemetro.prefs": { welcomed: true, lang: "en", textSize: "xlarge", walkPace: "normal" } };
    const bad: string[] = [];
    for (const p of ["/explore", "/explore/stop/342?route=040", "/explore/route/082?dir=0&stop=2958", "/fares", "/more"]) {
      await launch(page, p, { gps: GPS.downtown, storage: xl });
      const o = await horizontalOverflow(page);
      if (o > 0) bad.push(`${p}: ${o}px`);
    }
    expect(bad).toEqual([]);
  });

  test("M1 map strip with a saved row", async ({ page }) => {
    for (const v of VIEWPORTS) {
      await page.setViewportSize({ width: v.width, height: v.height });
      await launch(page, "/explore", { gps: GPS.montrose, storage: { ...ONBOARDED, ...SAVED_2958 } });
      const bar = await page.getByRole("button", { name: "Search for a place, stop or route" }).boundingBox();
      const sheet = await page.getByRole("region").first().boundingBox();
      expect.soft(sheet!.y - (bar!.y + bar!.height), `M1 at ${v.name}`).toBeGreaterThanOrEqual(v.height >= 740 ? 180 : 120);
    }
  });
});
