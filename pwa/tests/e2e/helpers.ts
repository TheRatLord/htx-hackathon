// Shared e2e helpers: rider-action counting (the baseline protocol, spec E), app setup with a mocked
// GPS fix and a browser clock synced to the API's (shifted) clock, and the F-rubric probes.

import { AxeBuilder } from "@axe-core/playwright";
import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";

export const API = `http://localhost:${process.env.API_PORT ?? 8787}`;

/**
 * The API clock is frozen (fake-now.mjs, E2E_FREEZE; playwright.config.ts defaults it on): the
 * browser's Date is then fixed at the same instant, so every time on screen is reproducible.
 */
export const FROZEN = (process.env.E2E_FREEZE ?? "1") !== "0";

/** Scenario GPS positions from docs/baseline-flows.json. */
export const GPS = {
  downtown: { latitude: 29.7563, longitude: -95.3639 }, // F10, F1, F4 (Main St @ Lamar)
  montrose: { latitude: 29.744, longitude: -95.39 }, // F2, F5
  uh: { latitude: 29.7199, longitude: -95.3422 }, // F3, F8
  nwtc: { latitude: 29.789, longitude: -95.456 }, // F7
  eastDowntown: { latitude: 29.75, longitude: -95.36 }, // F11
} as const;
export type Gps = (typeof GPS)[keyof typeof GPS];

export const VIEWPORTS = [
  { name: "412x800", width: 412, height: 800 },
  { name: "360x640", width: 360, height: 640 },
] as const;

export const ONBOARDED = { "ridemetro.prefs": { welcomed: true, lang: "en", textSize: "standard", walkPace: "normal" } };

/** F2 precondition: stop 2958 saved once from D6 with Route 82 expanded. */
export const SAVED_2958 = {
  "ridemetro.saved": { stops: [{ id: "2958", name: "Westheimer Rd @ Montrose Blvd", addedAt: 1_758_000_000_000, preferredRouteId: "082" }], routes: [] },
};

export interface SetupOptions {
  gps?: Gps | null; // null = no permission (the location is never granted)
  storage?: Record<string, unknown>; // localStorage seed; {} = first launch
}

/** Console errors and page errors seen by this page, for the "no console errors" check. */
export function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const loc = m.location()?.url ?? "";
    errors.push(`${m.text()}${loc ? ` [${loc.replace(/^https?:\/\/localhost:\d+/, "")}]` : ""}`);
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  // A failed resource logs "Failed to load resource: 5xx" without saying which: name it.
  page.on("response", (r) => {
    if (r.status() >= 500) errors.push(`HTTP ${r.status()} ${r.url().replace(/^https?:\/\/localhost:\d+/, "")}`);
  });
  return errors;
}

/** The API's current (possibly shifted, see fake-now.mjs) time. */
export async function serverNow(page: Page): Promise<Date> {
  const res = await page.request.get(`${API}/api/nearby?lat=29.75&lon=-95.36`);
  const body = (await res.json()) as { generatedAt: string };
  return new Date(body.generatedAt);
}

const launched = new WeakSet<Page>();

/** Cold launch of `path` with a GPS fix, seeded storage and the browser clock on the API's (frozen) clock. */
export async function launch(page: Page, path: string, opts: SetupOptions = {}) {
  const ctx = page.context();
  const gps = opts.gps === undefined ? GPS.downtown : opts.gps;
  if (gps) {
    await ctx.setGeolocation({ ...gps, accuracy: 10 });
    await ctx.grantPermissions(["geolocation"]);
  } else {
    await ctx.clearPermissions();
  }
  const seed = opts.storage ?? ONBOARDED;
  if (!launched.has(page)) {
    launched.add(page);
    await ctx.addInitScript((s: Record<string, unknown>) => {
      if (sessionStorage.getItem("__e2e_seeded")) return; // seed once per tab, like a real install
      sessionStorage.setItem("__e2e_seeded", "1");
      localStorage.clear();
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v));
    }, seed);
    // Frozen: Date.now() and new Date() return the API's instant for the whole test, while timers,
    // animations and requests run in real time. Otherwise the fake clock starts there and runs on.
    const now = await serverNow(page);
    if (FROZEN) await page.clock.setFixedTime(now);
    else await page.clock.install({ time: now });
  } else {
    // A second launch in the same test: reseed on the current origin, then reload cold.
    await page.evaluate((s: Record<string, unknown>) => {
      localStorage.clear();
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v));
    }, seed);
    await page.goto("about:blank");
  }
  await page.goto(path);
  await settle(page);
}

/** Waits for the screen to finish loading (no skeletons, network quiet). */
export async function settle(page: Page, extraMs = 600) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(extraMs);
}

export type ActionType = "tap" | "type" | "swipe" | "back" | "system-dialog" | "overlay";
export interface Step {
  n: number;
  type: ActionType;
  target: string;
  url: string;
}

/**
 * A rider. Every method is one counted action (spec E counting rules: 1 tap, 1 typed field however
 * many characters, 1 swipe/scroll, 1 back press, 1 system dialog, 1 overlay dismissal).
 */
export class Rider {
  steps: Step[] = [];
  constructor(readonly page: Page) {}

  get count() {
    return this.steps.length;
  }

  private log(type: ActionType, target: string) {
    this.steps.push({ n: this.steps.length + 1, type, target, url: this.page.url().replace(/^https?:\/\/[^/]+/, "") });
  }

  /** One tap. The target must already be on screen: a tap never scrolls for free. */
  async tap(target: Locator, label: string) {
    await expect(target, `"${label}" must be visible before tapping it`).toBeVisible();
    await expectInViewport(this.page, target, label);
    await target.tap();
    this.log("tap", label);
    await settle(this.page);
  }

  /** One tap at page coordinates (a map pin). */
  async tapAt(x: number, y: number, label: string) {
    await this.page.mouse.click(x, y);
    this.log("tap", label);
    await settle(this.page);
  }

  /** One typed field, into the focused input. */
  async type(text: string, label = `type "${text}"`) {
    await this.page.keyboard.type(text, { delay: 20 });
    this.log("type", label);
    await settle(this.page, 900);
  }

  async back(label = "browser back") {
    await this.page.goBack();
    this.log("back", label);
    await settle(this.page);
  }

  async swipe(label: string, fn: () => Promise<void>) {
    await fn();
    this.log("swipe", label);
    await settle(this.page);
  }

  /**
   * An OS permission dialog. Playwright cannot show Chrome's prompt: the permission is pre-granted
   * in launch(), and this records the one "Allow" tap the rider makes (spec E, F10 step 2).
   */
  systemDialog(label: string) {
    this.log("system-dialog", label);
  }

  attach(testInfo: TestInfo, flow: string) {
    testInfo.annotations.push({ type: "actions", description: `${flow}: ${this.count} (${this.steps.map((s) => `${s.type}:${s.target}`).join(" > ")})` });
    return testInfo.attach(`${flow}-steps.json`, { body: JSON.stringify(this.steps, null, 2), contentType: "application/json" });
  }
}

/** The element's box must intersect the viewport and not sit under the bottom nav. */
export async function expectInViewport(page: Page, target: Locator, label: string) {
  const box = await target.boundingBox();
  if (await target.evaluate((el) => Boolean(el.closest("nav")))) return; // the bottom nav itself
  expect(box, `${label}: no bounding box`).not.toBeNull();
  const navTop = await foldY(page);
  expect(box!.y + box!.height / 2, `${label} must be above the fold (not under the nav)`).toBeLessThan(navTop);
  expect(box!.y + box!.height / 2, `${label} must be on screen`).toBeGreaterThan(0);
}

/** The top of the bottom nav (the fold), or the viewport bottom on screens without one. */
export async function foldY(page: Page): Promise<number> {
  const vp = page.viewportSize()!;
  const nav = page.locator("nav").last();
  if ((await nav.count()) === 0) return vp.height;
  const b = await nav.boundingBox();
  return b && b.y > vp.height / 2 ? b.y : vp.height;
}

/** Page box of the first departure time ("16 min", "7:05 PM") inside a container. */
export async function firstTimeBox(container: Locator) {
  return container.evaluate((root) => {
    const re = /^\s*(\d+\s*min|\d{1,2}:\d{2}\s?[AP]M)\s*$/;
    for (const el of Array.from(root.querySelectorAll<HTMLElement>("*"))) {
      if (el.closest('[aria-label^="Walk"], [aria-label^="Caminar"]')) continue; // the walk pill, not a departure
      if (re.test(el.textContent ?? "") && el.getBoundingClientRect().height > 0) {
        const r = el.getBoundingClientRect();
        return { text: (el.textContent ?? "").trim(), y: r.y, bottom: r.bottom };
      }
    }
    return null;
  });
}

/** Every text must be on screen at the end of a flow: present, visible, and inside the viewport. */
export async function expectOnScreen(page: Page, texts: (string | RegExp)[]) {
  const vp = page.viewportSize()!;
  for (const t of texts) {
    const loc = page.getByText(t).filter({ visible: true }).first();
    await expect(loc, `goal text ${t} must be visible`).toBeVisible();
    const box = await loc.boundingBox();
    expect(box, `goal text ${t}: no box`).not.toBeNull();
    expect(box!.y, `goal text ${t} must start inside the viewport (y=${box!.y})`).toBeGreaterThanOrEqual(0);
    expect(box!.y + Math.min(box!.height, 20), `goal text ${t} must be above the fold (y=${box!.y}, viewport ${vp.height})`).toBeLessThanOrEqual(vp.height);
  }
}

/** L13: after a navigation, focus lands on the screen's <h1>. */
export async function expectFocusOnH1(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.tagName === "H1" || Boolean(document.activeElement?.closest("h1"))), { timeout: 3000, message: "focus should be on the h1 after navigation" })
    .toBe(true);
}

// ---------- map pins (canvas features; reached through the MapLibre instance) ----------

/** Exposes the MapLibre instance as window.__map by hooking the pre-bundled module's Map.prototype.fire. */
export async function hookMap(page: Page) {
  await page.evaluate(async () => {
    const w = window as unknown as { __mapHooked?: boolean };
    if (w.__mapHooked) return;
    // The pre-bundled dependency URL carries Vite's hash; read it from the module that imports it.
    const src = await fetch("/src/map/MapView.tsx").then((r) => r.text());
    const url = src.match(/\/node_modules\/\.vite\/deps\/maplibre-gl\.js\?v=[\w]+/)?.[0] ?? "/node_modules/.vite/deps/maplibre-gl.js";
    const mod = (await import(/* @vite-ignore */ url)) as { Map?: { prototype: { fire: (...a: unknown[]) => unknown } }; default?: { Map: { prototype: { fire: (...a: unknown[]) => unknown } } } };
    const M = mod.Map ?? mod.default!.Map;
    const orig = M.prototype.fire;
    M.prototype.fire = function (this: unknown, ...a: unknown[]) {
      // fire() lives on maplibre's Evented, shared by sources and the style: keep only the Map.
      if (this instanceof (M as unknown as new () => unknown)) (window as unknown as { __map: unknown }).__map = this;
      return orig.apply(this, a);
    };
    w.__mapHooked = true;
  });
  // Any render fires an event; nudge the pointer so one happens.
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await page.mouse.move(5, 100);
  await page.mouse.move(6, 101);
  await expect.poll(() => page.evaluate(() => Boolean((window as unknown as { __map?: unknown }).__map)), { timeout: 5000 }).toBe(true);
}

/** Page coordinates of a rendered stop pin, or null when it is not drawn (or not in the map strip). */
export async function pinPosition(page: Page, stopId: string): Promise<{ x: number; y: number } | null> {
  await hookMap(page);
  // queryRenderedFeatures throws maplibre's "Out of bounds" (FeatureIndex) while a tile is being
  // re-parsed, which can last a few seconds after a camera move or a label nudge. That is a moment,
  // not an answer: wait for the map to go idle and ask again for up to 3 s, then read the pin from
  // the map's sources (queryPin).
  const deadline = Date.now() + 3000;
  for (;;) {
    const final = Date.now() > deadline;
    const r = await queryPin(page, stopId, final);
    if (r.ok) return r.pin;
    if (final || !/Out of bounds|not hooked/.test(r.error)) throw new Error(`pinPosition(${stopId}): ${r.error}`);
    await page.waitForTimeout(250);
  }
}

type PinQuery = { ok: true; pin: { x: number; y: number } | null } | { ok: false; error: string };

function queryPin(page: Page, stopId: string, final = false): Promise<PinQuery> {
  return page.evaluate(async ({ id, final }): Promise<PinQuery> => {
    type F = { properties: { id: string; ids?: string }; geometry: { type: string; coordinates: [number, number] } };
    type M = {
      queryRenderedFeatures: (o?: unknown) => F[];
      project: (c: [number, number]) => { x: number; y: number };
      getCanvas: () => HTMLCanvasElement;
      loaded: () => boolean;
      getLayer: (id: string) => unknown;
      once: (ev: string, fn: () => void) => void;
    };
    const m = (window as unknown as { __map?: M }).__map;
    if (!m) return { ok: false, error: "map not hooked yet" };
    // Mid-render (tiles loading, a camera ease): let the frame finish first, but never hang on it.
    if (!m.loaded()) await new Promise<void>((done) => (m.once("idle", done), setTimeout(done, 1500)));
    // Only the pin layers, one at a time: a query that touches a GeoJSON tile whose index is being
    // rebuilt throws maplibre's "Out of bounds" (DictionaryCoder). A layer that throws is skipped.
    // A stacked pin ("567 · 259") stands for every stop in its `ids`.
    const has = (x: F) => x.geometry.type === "Point" && (String(x.properties?.id) === id || String(x.properties?.ids ?? "").split(",").includes(id));
    const at = (c: [number, number]) => {
      const p = m.project(c);
      const r = m.getCanvas().getBoundingClientRect();
      return { x: r.left + p.x, y: r.top + p.y };
    };
    const layers = ["stops-pin", "stops-pin-far", "stops-cluster", "tc-pin", "scene-markers"].filter((l) => m.getLayer(l));
    let error = "";
    for (const layer of layers) {
      try {
        const f = m.queryRenderedFeatures({ layers: [layer] }).find(has);
        if (f) return { ok: true, pin: at(f.geometry.coordinates) };
      } catch (e) {
        error = `${layer}: ${String(e)}`;
      }
    }
    if (!error) return { ok: true, pin: null };
    if (!final) return { ok: false, error };
    // Still throwing at the deadline: a GeoJSON tile whose feature index maplibre left empty after a
    // setData can stay that way until the next update, while its pins draw fine (seen at 412x800 and
    // 360x640, 1 load in 3). Answer from the data the app gave the sources instead: from zoom 16
    // every stop is drawn (stops-pin allows overlap) unless the covered list in its filter hides it,
    // and then it is drawn as the stacked pin whose `ids` name it.
    type Src = { serialize?: () => { data?: unknown } };
    const q = m as unknown as { getSource: (s: string) => Src | undefined; getFilter: (l: string) => unknown; getZoom: () => number };
    if (q.getZoom() < 16) return { ok: false, error: `${error} (data fallback needs zoom 16, map at ${q.getZoom().toFixed(1)})` };
    const features = (s: string) => {
      const d = q.getSource(s)?.serialize?.().data as { features?: F[] } | undefined;
      return d && typeof d === "object" && Array.isArray(d.features) ? d.features : [];
    };
    const covered = JSON.stringify(q.getFilter("stops-pin") ?? []).match(/"literal",\[([^\]]*)\]/)?.[1].split(",").map((x) => x.replace(/"/g, "")) ?? [];
    const own = covered.includes(id) ? undefined : features("stops").find(has);
    const f = own ?? features("stops-clusters").find(has);
    if (!f) return { ok: true, pin: null };
    const pin = at(f.geometry.coordinates);
    const c = m.getCanvas().getBoundingClientRect();
    return { ok: true, pin: pin.x >= c.left && pin.x <= c.right && pin.y >= c.top && pin.y <= c.bottom ? pin : null };
  }, { id: stopId, final });
}

// ---------- F-rubric probes ----------

export interface FontIssue {
  text: string;
  px: number;
  tag: string;
}

/** Visible text nodes and their computed font size. */
export async function textSizes(page: Page): Promise<FontIssue[]> {
  return page.evaluate(() => {
    const out: { text: string; px: number; tag: string }[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const vw = innerWidth;
    const vh = innerHeight;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = (n.textContent ?? "").trim();
      if (!text || !/[\p{L}\p{N}]/u.test(text)) continue;
      const el = n.parentElement!;
      if (el.closest("[aria-hidden=true], .maplibregl-ctrl, script, style")) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
      out.push({ text: text.slice(0, 60), px: parseFloat(cs.fontSize), tag: el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? `.${el.className.split(" ")[0]}` : "") });
    }
    return out;
  });
}

export interface TargetIssue {
  name: string;
  w: number;
  h: number;
}

/** L8: interactive controls on screen smaller than 48x48 CSS px. */
export async function smallTargets(page: Page): Promise<TargetIssue[]> {
  return page.evaluate(() => {
    const out: { name: string; w: number; h: number }[] = [];
    const sel = "button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=radio], [role=switch], [role=link]";
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      if (el.closest("[aria-hidden=true], .maplibregl-ctrl-attrib")) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > innerHeight) continue;
      // A control nested in a larger control shares its target.
      const outer = el.parentElement?.closest<HTMLElement>(sel);
      if (outer) continue;
      // Measure the effective hit area: a ::before/::after expander or padding counts via elementFromPoint.
      if (r.width >= 47.5 && r.height >= 47.5) continue;
      const name = (el.getAttribute("aria-label") || el.innerText || (el as HTMLInputElement).placeholder || el.tagName).replace(/\s+/g, " ").trim().slice(0, 50);
      out.push({ name, w: Math.round(r.width), h: Math.round(r.height) });
    }
    return out;
  });
}

/** L6: axe-core colour-contrast violations (map canvas excluded). */
export async function contrastViolations(page: Page) {
  const res = await new AxeBuilder({ page }).withRules(["color-contrast"]).exclude(".maplibregl-map").analyze();
  return res.violations.flatMap((v) => v.nodes.map((n) => `${n.target.join(" ")}: ${n.failureSummary?.split("\n").slice(1).join(" ").trim()}`));
}

/** L5: no horizontal page scroll. */
export async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const d = document.documentElement;
    return Math.max(d.scrollWidth - d.clientWidth, document.body.scrollWidth - document.body.clientWidth);
  });
}
