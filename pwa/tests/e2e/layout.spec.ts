// Layout guards: defects the judges found in the capture set that no flow or rubric check caught
// (fix round 1). Each test shoots the same state as a judged screenshot and checks one geometric or
// consistency rule, so a regression fails here instead of only in a screenshot review.
//   npm run test:e2e -- layout.spec.ts
//
//   G1  the locate FAB never sits under the search bar (03-home-saved-xlarge-360, 47-stop-342-xlarge-360)
//   G2  a stop title never splits its "(ID)" across lines (03-home-saved-xlarge-360)
//   G3  the Start trip footer never slices a timeline row (24-itinerary-xlarge-360)
//   G4  the itinerary card's leg strip stays on one line (22-plan-list-xlarge-360, -es-360)
//   G5  Home's saved card shows the stop's next bus, or says it leaves before you get there
//       (03-home-saved vs 18 / 31 / 37, same frozen instant)
//   G6  the first listed stop has a pin inside the visible map strip (02-home-es-360)
//   G7  Home at Extra large keeps "Updated … / Refresh" (03-home-saved-xlarge-360)
//   G8  Live trip's backup bus is the one the trip options offered (26/27 vs 22: 'Next bus 26 min' vs
//       'Also at 12:30 PM' for the same trip)
//   G9  a half sheet at its peek never slices a line of text or a button at the tab bar
//       (03-home-saved-xlarge-360: 'The 1 min bus leaves before you get there' cut in half;
//       47-stop-342-xlarge-360: Schedule / Track bus cut in half; 46-home-xlarge-360: the 51's
//       'DOWNTOWN TC' cut in half with no saved stop)
//   G10 a place's stop list tags its listed stops on the map, inside the visible strip (07-place-hmns)
//   G11 Route 82's expanded 2958 and Home's saved 2958 agree on whether the first bus can be caught
//       (18-route-82-stop-2958 showed '1 min' as the lead time beside 'Walk 3 min' while Home said
//       'The 1 min bus leaves before you get there', same frozen instant)
//
// Map answers (G6, G10) come only from what maplibre drew (helpers.ts pinPosition / tagPosition):
// when its feature index keeps throwing the guard fails, it never answers from the app's own data.

import { expect, test, type Locator, type Page } from "@playwright/test";
import { firstTimeBox, GPS, launch, ONBOARDED, pinPosition, SAVED_2958, settle, tagPosition, type Gps } from "./helpers.ts";

const PLAN_Q = "from=29.71990%2C-95.34220&to=landmark%3Ahobby-airport&toName=Hobby+Airport";
const prefs = (lang: "en" | "es", textSize: "standard" | "xlarge") => ({ "ridemetro.prefs": { welcomed: true, lang, textSize, walkPace: "normal" } });
const SMALL = { width: 360, height: 640 };

type Box = { x: number; y: number; width: number; height: number };
const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));

/** GUARD_SHOTS=<dir>: each G9/G10 test also saves what it checked, for before/after comparisons. */
async function keepShot(page: Page, name: string) {
  const dir = process.env.GUARD_SHOTS;
  if (dir) await page.screenshot({ path: `${dir}/${name.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "")}.png`, animations: "disabled", caret: "hide" });
}

async function open(page: Page, path: string, opts: { gps?: Gps | null; storage?: Record<string, unknown>; small?: boolean } = {}) {
  if (opts.small) await page.setViewportSize(SMALL);
  await launch(page, path, { gps: opts.gps, storage: opts.storage });
  await page.waitForTimeout(1500); // the sheet settles and the map places its labels
}

/** The locate FAB, when it is shown, does not overlap the search bar. */
async function expectFabClearOfSearch(page: Page, lang: "en" | "es" = "en") {
  const fab = page.getByRole("button", { name: lang === "es" ? "Mostrar mi ubicación" : "Show my location" });
  const bar = page.getByRole("button", { name: lang === "es" ? /^Buscar un lugar/ : /^Search for a place/ }).first();
  await expect(bar).toBeVisible();
  if (!(await fab.isVisible())) return; // hidden when the sheet leaves no map room for it: nothing to collide

  const f = (await fab.boundingBox())!;
  const b = (await bar.boundingBox())!;
  expect(overlap(f, b), `locate FAB (y ${Math.round(f.y)}–${Math.round(f.y + f.height)}) overlaps the search bar (y ${Math.round(b.y)}–${Math.round(b.y + b.height)})`).toBe(0);
  expect(f.y, "locate FAB top edge is on screen").toBeGreaterThanOrEqual(0);
}

/** Lines on which "(" and ")" of every "(ID)" in the element's text fall: the pair must share one. */
async function idSplits(el: Locator): Promise<string[]> {
  return el.evaluate((root) => {
    const out: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const chars: { node: Text; i: number; ch: string }[] = [];
    for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) for (let i = 0; i < n.data.length; i++) chars.push({ node: n, i, ch: n.data[i] });
    const text = chars.map((c) => c.ch).join("");
    const rect = (k: number) => {
      const r = document.createRange();
      r.setStart(chars[k].node, chars[k].i);
      r.setEnd(chars[k].node, chars[k].i + 1);
      return r.getClientRects()[0];
    };
    for (const m of text.matchAll(/\(\d+\)/g)) {
      const a = rect(m.index!);
      const b = rect(m.index! + m[0].length - 1);
      // Two glyphs share a line when their boxes overlap vertically (a smaller ID font sits lower).
      if (a && b && (b.top >= a.bottom - 1 || a.top >= b.bottom - 1)) out.push(`"${m[0]}" split across lines in "${text.trim()}"`);
    }
    return out;
  });
}

/**
 * What the tab bar cuts through at the sheet's peek: a line of text (each line box of each text node)
 * or a button (as a whole) that shows partly above the bar's top edge (or above the edge of a scroll container that
 * clips it first) and continues below it. A line or button wholly below the edge is fine: it is one
 * drag away and nothing of it shows.
 */
async function slicedAtNav(page: Page): Promise<string[]> {
  const nav = (await page.getByRole("navigation").last().boundingBox())!;
  return page.getByRole("region").first().evaluate((sheet, navTop) => {
    const clipOf = (el: Element) => {
      let clip = navTop;
      for (let a: Element | null = el.parentElement; a && a !== document.body; a = a.parentElement)
        if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(a).overflowY)) clip = Math.min(clip, a.getBoundingClientRect().bottom);
      return clip;
    };
    const cut = (top: number, bottom: number, clip: number) => top < clip - 1 && bottom > clip + 1;
    const out: string[] = [];
    // A button or link is one control: it is sliced as a whole. A tappable card or row (it holds a
    // heading, is taller than two rows, or its text runs on more than one line, like a route row's
    // headsign over its times) is a container: its own lines are checked one by one instead, so a
    // row whose route chip peeks above the tab bar with none of its text is not a sliced button.
    const sel = "button, a[href], [role=button]";
    const textLines = (b: Element) => {
      const tops = new Set<number>();
      const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode() as Text | null; n; n = w.nextNode() as Text | null) {
        if (!n.data.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        for (const r of Array.from(range.getClientRects())) if (r.height > 0) tops.add(Math.round(r.top / 4));
      }
      return tops.size;
    };
    const isCard = (b: Element) => Boolean(b.querySelector("h1, h2, h3, h4")) || b.getBoundingClientRect().height > 120 || textLines(b) > 1;
    for (const b of Array.from(sheet.querySelectorAll<HTMLElement>(sel))) {
      const r = b.getBoundingClientRect();
      if (r.height === 0 || isCard(b) || getComputedStyle(b).visibility === "hidden") continue;
      const clip = clipOf(b);
      if (cut(r.top, r.bottom, clip)) out.push(`button "${(b.getAttribute("aria-label") || b.innerText).replace(/\s+/g, " ").trim().slice(0, 40)}" y ${Math.round(r.top)}–${Math.round(r.bottom)}, cut at ${Math.round(clip)}`);
    }
    const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
      const control = n.parentElement?.closest(sel);
      if (!n.data.trim() || !n.parentElement || n.parentElement.closest("[aria-hidden=true]") || (control && !isCard(control))) continue;
      const cs = getComputedStyle(n.parentElement);
      if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      const clip = clipOf(n.parentElement);
      // A line box runs from the font's ascent to its descent: the glyphs' capitals start about a fifth
      // of the way down and sit on a baseline about four fifths down. The line is sliced when the edge
      // crosses that band (a cut through the leading above the caps or a descender tail shows no text).
      for (const r of Array.from(range.getClientRects()))
        if (r.height > 0 && cut(r.top + 0.2 * r.height, r.top + 0.78 * r.height, clip)) out.push(`text "${n.data.trim().slice(0, 40)}" line y ${Math.round(r.top)}–${Math.round(r.bottom)}, cut at ${Math.round(clip)}`);
    }
    return out;
  }, nav.y);
}

test.describe("layout guards", () => {
  for (const size of ["standard", "xlarge"] as const) {
    test(`G1 locate FAB clear of the search bar: Home, saved 2958, ${size} 360x640`, async ({ page }) => {
      await open(page, "/explore", { gps: GPS.montrose, storage: { ...prefs("en", size), ...SAVED_2958 }, small: true });
      await expectFabClearOfSearch(page);
    });
  }

  test("G1 locate FAB clear of the search bar: stop 342, Extra large 360x640", async ({ page }) => {
    await open(page, "/explore/stop/342?route=040", { storage: prefs("en", "xlarge"), small: true });
    await expectFabClearOfSearch(page);
  });

  test("G2 stop title keeps (2958) on one line: Home, saved 2958, Extra large 360x640", async ({ page }) => {
    await open(page, "/explore", { gps: GPS.montrose, storage: { ...prefs("en", "xlarge"), ...SAVED_2958 }, small: true });
    const titles = page.locator("h2, h3").filter({ hasText: /\(\d+\)/ });
    expect(await titles.count(), "a stop title with an ID is on screen").toBeGreaterThan(0);
    const splits: string[] = [];
    for (const t of await titles.all()) if (await t.isVisible()) splits.push(...(await idSplits(t)));
    expect(splits).toEqual([]);
  });

  test("G3 Start trip footer never slices a timeline row: itinerary, Extra large 360x640", async ({ page }) => {
    await open(page, `/explore/plan?${PLAN_Q}`, { gps: GPS.uh, storage: prefs("en", "xlarge"), small: true });
    await page.locator('a[href*="/explore/plan/0"]').first().tap();
    await page.waitForTimeout(1500);
    const footer = page.locator("[data-sheet-footer]").filter({ visible: true }).first();
    await expect(footer).toBeVisible();
    const edge = (await footer.boundingBox())!.y;
    // A row is sliced when part of it shows above the footer and the rest is cut off. What shows is
    // what its scroll container leaves visible (the sheet body may end above the footer on purpose).
    const rows = await page.locator("ol > li").filter({ visible: true }).evaluateAll((els, footerTop) =>
      els.map((e) => {
        let clip = footerTop;
        for (let a = e.parentElement; a; a = a.parentElement) if (/(auto|scroll|hidden)/.test(getComputedStyle(a).overflowY)) clip = Math.min(clip, a.getBoundingClientRect().bottom);
        const r = e.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, clip, text: (e.textContent ?? "").trim().slice(0, 50) };
      }), edge);
    const sliced = rows.filter((r) => r.top < r.clip - 2 && r.bottom > r.clip + 2).map((r) => `"${r.text}" (y ${Math.round(r.top)}–${Math.round(r.bottom)}, cut at ${Math.round(r.clip)})`);
    expect(sliced).toEqual([]);
  });

  for (const v of [
    { name: "Extra large", storage: prefs("en", "xlarge") },
    { name: "Spanish", storage: prefs("es", "standard") },
  ]) {
    test(`G4 leg strip on one line: trip options, ${v.name} 360x640`, async ({ page }) => {
      await open(page, `/explore/plan?${PLAN_Q}`, { gps: GPS.uh, storage: v.storage, small: true });
      const strip = page.locator('[role="img"][class*="modes"]').first();
      await expect(strip).toBeVisible();
      // Every part (walk, badge, separator) overlaps the first part vertically when the strip is one line.
      const parts = await strip.evaluate((s) => Array.from(s.children).map((c) => ({ top: Math.round(c.getBoundingClientRect().top), bottom: Math.round(c.getBoundingClientRect().bottom), text: (c.textContent ?? "").trim() })));
      const [a] = parts;
      const off = parts.filter((p) => p.top >= a.bottom - 1 || a.top >= p.bottom - 1);
      expect(off.map((p) => `"${p.text}" at y ${p.top}–${p.bottom}`), `leg strip wraps: first part at y ${a.top}–${a.bottom}`).toEqual([]);
    });
  }

  test("G5 Home's saved 2958 shows the stop's next Route 82 bus, or says it leaves before you get there", async ({ page }) => {
    await open(page, "/explore/stop/2958?route=082", { gps: GPS.montrose, storage: { ...ONBOARDED, ...SAVED_2958 } });
    const stopFirst = await firstTimeBox(page.getByRole("region").first());
    expect(stopFirst, "stop sheet shows a departure").not.toBeNull();
    await page.goto("/explore");
    await page.waitForTimeout(2000);
    const card = page.locator("article").filter({ has: page.locator("h2", { hasText: "Westheimer Rd @ Montrose Blvd" }) }).first();
    await expect(card).toBeVisible();
    const homeFirst = await firstTimeBox(card);
    const norm = (t?: string) => t?.replace(/\s+/g, "");
    const warned = await card.getByText(/Leaves before you get there/).isVisible().catch(() => false);
    expect(warned || norm(homeFirst?.text) === norm(stopFirst!.text), `Home's saved card says ${homeFirst?.text ?? "nothing"} first; the stop sheet says ${stopFirst!.text}, and Home doesn't say the bus leaves before you get there`).toBe(true);
  });

  test("G6 first listed stop has a pin in the map strip: Home, Spanish 360x640", async ({ page }) => {
    await open(page, "/explore", { storage: prefs("es", "standard"), small: true });
    await page.waitForTimeout(1500);
    const first = page.locator("article h2, article h3").filter({ hasText: /\(\d+\)/ }).first();
    await expect(first).toBeVisible();
    const id = (await first.innerText()).match(/\((\d+)\)/)![1];
    const pin = await pinPosition(page, id);
    const bar = (await page.getByRole("button", { name: /^Buscar un lugar/ }).first().boundingBox())!;
    const sheetTop = (await page.getByRole("region").first().boundingBox())!.y;
    const barBottom = bar.y + bar.height;
    expect(pin && pin.y > barBottom && pin.y < sheetTop && pin.x > 0 && pin.x < SMALL.width, `pin ${id} ${pin ? `at ${Math.round(pin.x)},${Math.round(pin.y)}` : "not rendered"}; visible strip y ${Math.round(barBottom)}–${Math.round(sheetTop)}`).toBe(true);
  });

  for (const size of ["standard", "xlarge"] as const) {
    test(`G7 Home keeps the updated time and Refresh: saved 2958, ${size} 360x640`, async ({ page }) => {
      await open(page, "/explore", { gps: GPS.montrose, storage: { ...prefs("en", size), ...SAVED_2958 }, small: true });
      await expect(page.getByRole("button", { name: /Refresh/ }).first()).toBeInViewport();
    });
  }

  test("G8 Live trip's next bus matches the options card's 'Also at': UH to Hobby, step 2", async ({ page }) => {
    await open(page, `/explore/plan?${PLAN_Q}`, { gps: GPS.uh });
    const card = page.locator('a[href*="/explore/plan/0"]').first();
    const also = await page.getByRole("link", { name: /^The same trip, boarding at / }).first().getAttribute("aria-label").catch(() => null);
    const alsoAt = also?.match(/\d{1,2}:\d{2}\s?[AP]M/)?.[0];
    await card.tap();
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: /Start trip/ }).first().tap();
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: /Next step/ }).first().tap();
    await page.waitForTimeout(1200);
    const line = page.getByText(/^(Scheduled time · )?Next (bus|one)\b/).filter({ visible: true }).first();
    test.skip(!alsoAt || !(await line.isVisible().catch(() => false)), "no backup bus offered on one of the two screens");
    const text = (await line.innerText()).replace(/\s+/g, " ");
    // A minutes-away backup is converted at the frozen instant (the browser clock is fixed there).
    const clock = text.match(/\d{1,2}:\d{2}\s?[AP]M/)?.[0] ?? (await page.evaluate((m) => (m ? new Date(Date.now() + Number(m) * 60_000).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : null), text.match(/(\d+) min/)?.[1]));
    expect(clock?.replace(/\s/g, ""), `Live trip says "${text}", the trip options said "Also at ${alsoAt}"`).toBe(alsoAt!.replace(/\s/g, ""));
  });
  for (const v of [
    { name: "Home, saved 2958", path: "/explore", gps: GPS.montrose, storage: SAVED_2958 },
    { name: "stop 342", path: "/explore/stop/342?route=040", gps: GPS.downtown, storage: {} },
    // Home with no saved stop: the first screen a new rider sees (46-home-xlarge-360 at downtown),
    // and the other places the flows start from, so a card mix not seen in the judged set is covered too.
    { name: "Home, no saved stop, downtown", path: "/explore", gps: GPS.downtown, storage: {} },
    { name: "Home, no saved stop, Montrose", path: "/explore", gps: GPS.montrose, storage: {} },
    { name: "Home, no saved stop, UH", path: "/explore", gps: GPS.uh, storage: {} },
    { name: "Home, no saved stop, Northwest TC", path: "/explore", gps: GPS.nwtc, storage: {} },
  ])
    for (const size of ["standard", "xlarge"] as const)
      test(`G9 the peek sheet ends on whole lines and buttons: ${v.name}, ${size} 360x640`, async ({ page }) => {
        await open(page, v.path, { gps: v.gps, storage: { ...prefs("en", size), ...v.storage }, small: true });
        await keepShot(page, `G9 ${v.name} ${size}`);
        expect(await slicedAtNav(page), "cut in half by the tab bar at the sheet's peek").toEqual([]);
      });

  test("G11 Route 82's stop 2958 and Home's saved 2958 agree that the first bus leaves before you get there", async ({ page }) => {
    const leaves = /leaves before you get there/i;
    const caption = async (scope: Locator) => {
      const el = scope.getByText(leaves).filter({ visible: true }).first();
      return (await el.isVisible().catch(() => false)) ? (await el.innerText()).replace(/\s+/g, " ").trim() : null;
    };
    await open(page, "/explore", { gps: GPS.montrose, storage: { ...ONBOARDED, ...SAVED_2958 } });
    const card = page.locator("article").filter({ has: page.locator("h2", { hasText: "Westheimer Rd @ Montrose Blvd" }) }).first();
    await expect(card).toBeVisible();
    const home = await caption(card);
    await keepShot(page, "G11 home saved 2958");

    await page.getByRole("button", { name: "Search for a place, stop or route" }).first().tap();
    await expect(page.getByRole("searchbox")).toBeFocused();
    await page.keyboard.type("82", { delay: 20 });
    await settle(page, 1000);
    await page.getByRole("button", { name: "82 Westheimer, Eastbound to DOWNTOWN" }).first().tap();
    await settle(page);
    await page.getByRole("button", { name: /^Westheimer Rd @ Montrose Blvd \(2958\)/ }).first().tap();
    await settle(page);
    await page.waitForTimeout(1000); // the expanded row's arrivals load
    // The route view is the page's top sheet now; Home's card is gone with the screen it was on.
    await expect(page.getByRole("button", { name: /^Westheimer Rd @ Montrose Blvd \(2958\)/, expanded: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^Stop details/ }).filter({ visible: true }).first()).toBeVisible();
    const route = await caption(page.locator("body"));
    await keepShot(page, "G11 route 82 stop 2958");
    expect(route, `Home's saved 2958 says ${home ? `"${home}"` : "its first bus can be caught"}; Route 82's expanded 2958 says ${route ? `"${route}"` : "nothing about it"}`).toBe(home);
  });

  test("G10 a place's listed stops are tagged on the map: Stops near the Houston Museum of Natural Science", async ({ page }) => {
    await open(page, "/explore", { gps: GPS.eastDowntown });
    await page.getByRole("button", { name: "Search for a place, stop or route" }).first().tap();
    await expect(page.getByRole("searchbox")).toBeFocused();
    await page.keyboard.type("museum of natural science", { delay: 20 });
    await settle(page, 1000);
    await page.getByRole("button", { name: "Stops near" }).first().tap();
    await settle(page);
    await page.waitForTimeout(1500); // the camera eases to the place and the tags are placed
    const listed = await page.locator("article h2, article h3").filter({ hasText: /\(\d+\)/ }).filter({ visible: true }).allInnerTexts();
    const ids = listed.map((t) => t.match(/\((\d+)\)/)![1]).slice(0, 2);
    expect(ids.length, "the place view lists stops").toBeGreaterThan(0);
    const bar = (await page.getByRole("button", { name: /^Search for a place/ }).first().boundingBox())!;
    const strip = { top: bar.y + bar.height, bottom: (await page.getByRole("region").first().boundingBox())!.y, right: page.viewportSize()!.width };
    await keepShot(page, "G10 place hmns");
    const missing: string[] = [];
    for (const id of ids) {
      const tag = await tagPosition(page, id);
      if (!tag || tag.y < strip.top || tag.y > strip.bottom || tag.x < 0 || tag.x > strip.right) missing.push(`${id}: ${tag ? `tag anchored at ${Math.round(tag.x)},${Math.round(tag.y)}` : "no tag drawn"}`);
    }
    expect(missing, `listed stops ${ids.join(", ")} tagged inside the map strip y ${Math.round(strip.top)}–${Math.round(strip.bottom)}`).toEqual([]);
  });
});

