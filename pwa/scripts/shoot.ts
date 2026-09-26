// Headless screenshots of the PWA on a phone-sized viewport, with a mocked GPS fix.
//
//   npx tsx scripts/shoot.ts --url http://localhost:5173/explore --out /tmp/explore.png \
//     [--w 412 --h 800] [--lat 29.7563 --lon -95.3639] [--wait-ms 1500] [--full] \
//     [--actions '[{"click":"text=Show list"},{"fill":["input","342"]},{"wait":500}]'] \
//     [--storage '{"ridemetro.prefs":{"welcomed":true}}']
//
// --storage seeds localStorage before the app loads (default: onboarded, so Welcome is skipped;
// pass --storage '{}' to see first launch).
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
    "wait-ms": { type: "string", default: "1500" },
    actions: { type: "string" },
    full: { type: "boolean", default: false },
    storage: { type: "string", default: '{"ridemetro.prefs":{"welcomed":true}}' },
  },
});

if (!values.url || !values.out) {
  console.error("Usage: tsx scripts/shoot.ts --url <url> --out <png> [--w 412 --h 800] [--lat --lon] [--wait-ms] [--actions '<json>'] [--full]");
  process.exit(2);
}

const actions = values.actions ? (JSON.parse(values.actions) as Action[]) : [];
const geo = values.lat && values.lon ? { latitude: Number(values.lat), longitude: Number(values.lon), accuracy: 10 } : undefined;

/** Selectors ("text=…", "#id", "button[aria-pressed]", a bare tag) go to page.locator; anything else is visible text. */
const isSelector = (s: string) => /^(text=|css=|xpath=)/.test(s) || /[#.[\]>:=]/.test(s) || /^[a-z][a-z0-9]*$/.test(s);
const locate = (page: Page, target: string) => (isSelector(target) ? page.locator(target) : page.getByText(target)).first();

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
  if (values.full) await page.addStyleTag({ content: "#root, #root > div, main { height: auto !important; overflow: visible !important; }" });
  await page.screenshot({ path: values.out, fullPage: values.full });
  console.log(`saved ${values.out}`);
} finally {
  await browser.close();
}
