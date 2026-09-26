// Headless screenshots of the PWA on a phone-sized viewport, with a mocked GPS fix.
//
//   npx tsx scripts/shoot.ts --url http://localhost:5173/explore --out /tmp/explore.png \
//     [--w 412 --h 800] [--lat 29.7563 --lon -95.3639] [--wait-ms 3000] [--full] \
//     [--actions '[{"click":"Show list"},{"fill":["css=input","342"]},{"wait":500}]'] \
//     [--storage '{"ridemetro.prefs":{"welcomed":true}}'] [--now 2026-09-25T12:00:00-05:00 | --now api]
//
// An action target is visible text ("7:05 PM", "Try again."), unless it starts with "css=",
// "text=", "xpath=" or "#", which go to page.locator.
// --storage seeds localStorage before the app loads (default: onboarded, so Welcome is skipped;
// pass --storage '{}' to see first launch).
// --now freezes the page's clock (Date.now() and new Date()) at that instant for the whole shot, so
// every relative time and clock time on screen is reproducible. "api" takes the instant from the API
// (API_PORT, default 8787; its /api/nearby generatedAt), which agrees with the departures it sends
// when it runs through tests/e2e/fake-now.mjs (E2E_NOW=<ISO> E2E_FREEZE=1). Without --now the
// browser uses the real clock (the in-app dev override ?now=<ISO> also works, see src/dev/frozenNow.ts).
// Prints console errors and failed requests; exits non-zero if the page fails to load.

import { parseArgs } from "node:util";
import { chromium, type Page } from "playwright";

type Action = { click: string } | { fill: [string, string] } | { wait: number } | { press: string };

// Let "--lon -95.36" work: parseArgs would read the negative number as an option.
const args = process.argv.slice(2).reduce<string[]>((out, a) => {
  const prev = out.at(-1);
  if (prev?.startsWith("--") && !prev.includes("=") && /^-\d/.test(a)) out[out.length - 1] = `${prev}=${a}`;
  else out.push(a);
  return out;
}, []);

const { values } = parseArgs({
  args,
  options: {
    url: { type: "string" },
    out: { type: "string" },
    w: { type: "string", default: "412" },
    h: { type: "string", default: "800" },
    lat: { type: "string" },
    lon: { type: "string" },
    // Map tiles often need more than 2 s to paint.
    "wait-ms": { type: "string", default: "3000" },
    actions: { type: "string" },
    full: { type: "boolean", default: false },
    storage: { type: "string", default: '{"ridemetro.prefs":{"welcomed":true}}' },
    now: { type: "string" },
  },
});

if (!values.url || !values.out) {
  console.error(
    "Usage: tsx scripts/shoot.ts --url <url> --out <png> [--w 412 --h 800] [--lat --lon] [--wait-ms] [--actions '<json>'] [--full] [--storage '<json>'] [--now <ISO>|api]",
  );
  process.exit(2);
}

const actions = values.actions ? (JSON.parse(values.actions) as Action[]) : [];
const geo = values.lat && values.lon ? { latitude: Number(values.lat), longitude: Number(values.lon), accuracy: 10 } : undefined;

/** Only an explicit prefix makes a selector, so text such as "7:05 PM" or "walk" is matched as text. */
const isSelector = (s: string) => /^(css=|text=|xpath=|#)/.test(s);
const locate = (page: Page, target: string) => (isSelector(target) ? page.locator(target) : page.getByText(target)).first();

/** The instant to freeze the page clock at, if any. */
async function frozenAt(now: string | undefined): Promise<Date | undefined> {
  if (!now) return undefined;
  if (now === "api") {
    const res = await fetch(`http://localhost:${process.env.API_PORT ?? 8787}/api/nearby?lat=29.75&lon=-95.36`);
    return new Date(((await res.json()) as { generatedAt: string }).generatedAt);
  }
  const t = new Date(now);
  if (Number.isNaN(t.getTime())) {
    console.error(`--now: not a date: ${now}`);
    process.exit(2);
  }
  return t;
}
const at = await frozenAt(values.now);

const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: Number(values.w), height: Number(values.h) },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "en-US",
    timezoneId: "America/Chicago",
    ...(geo && { geolocation: geo, permissions: ["geolocation"] }),
  });
  await context.addInitScript((seed: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(seed)) if (localStorage.getItem(k) === null) localStorage.setItem(k, JSON.stringify(v));
  }, JSON.parse(values.storage!) as Record<string, unknown>);
  const page = await context.newPage();
  if (at) {
    await page.clock.setFixedTime(at);
    console.log(`clock frozen at ${at.toISOString()}`);
  }
  page.on("console", (m) => m.type() === "error" && console.log(`console error: ${m.text()}`));
  page.on("pageerror", (e) => console.log(`page error: ${e.message}`));
  page.on("requestfailed", (r) => console.log(`request failed: ${r.url()} (${r.failure()?.errorText})`));

  await page.goto(values.url, { waitUntil: "load" });
  for (const a of actions) {
    if ("click" in a) await locate(page, a.click).click();
    else if ("fill" in a) await locate(page, a.fill[0]).fill(a.fill[1]);
    else if ("press" in a) await page.keyboard.press(a.press);
    else await page.waitForTimeout(a.wait);
  }
  await page.waitForTimeout(Number(values["wait-ms"]));
  // The app scrolls inside <main>, not the document; unroll it so a full-page shot shows everything.
  if (values.full)
    await page.addStyleTag({ content: "#root, #root > div, #root > div > div, main { position: static !important; height: auto !important; overflow: visible !important; }" });
  await page.screenshot({ path: values.out, fullPage: values.full, animations: "disabled", caret: "hide" });
  console.log(`saved ${values.out}`);
} finally {
  await browser.close();
}
