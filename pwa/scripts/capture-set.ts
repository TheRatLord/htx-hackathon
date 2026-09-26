// The complete judged screenshot set, deterministically, into one folder:
//
//   npx tsx scripts/capture-set.ts ../ux-audit/redesign/round6
//   API_PORT=8787 WEB_PORT=5173 npx tsx scripts/capture-set.ts <dir> [--grep <shot name regex>]
//
// Writes <dir>/NN-*.png (tests/e2e/screens.spec.ts: the round-5 list plus Extra-large-text and Spanish
// variants at 360x640), <dir>/original/ (the most comparable RideMETRO v2.71 screenshots, named to
// match) and <dir>/INDEX.md (capture conditions, one row per shot, the originals table).
//
// Deterministic: the API runs Set S (OFFLINE=1 DEMO_REALTIME=0) with its clock frozen at Friday
// 2026-09-25 12:00 CDT (late-night shots at Saturday 2:30 AM) through tests/e2e/fake-now.mjs, and the
// browser's clock is fixed at the same instant, so every minute count and clock time is the same in
// every shot and every run. Playwright starts both servers, or reuses ones already on API_PORT /
// WEB_PORT; a reused API must have been started through fake-now.mjs, or every shot fails and says so.
// Exits non-zero if any shot failed (INDEX.md then lists only the shots that were taken).

import { spawnSync, execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, relative, resolve } from "node:path";
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { grep: { type: "string" } } });
if (positionals.length !== 1) {
  console.error("Usage: tsx scripts/capture-set.ts <output dir> [--grep <regex>]");
  process.exit(2);
}

const PWA = resolve(import.meta.dirname, "..");
const REPO = resolve(PWA, "..");
const AUDIT = resolve(REPO, "ux-audit");
const OUT = resolve(positionals[0]);
const MANIFEST = resolve(OUT, ".manifest");
const NOON = process.env.E2E_NOW ?? "2026-09-25T12:00:00-05:00";
const LATE_NIGHT = "2026-09-26T02:30:00-05:00"; // screens.spec.ts LATE_NIGHT

/** Our file -> the RideMETRO v2.71 screenshot (under ux-audit/) and what to compare. */
const ORIGINALS: [string, string, string][] = [
  ["01-welcome.png", "baseline/F10/01-perm-location.png", "First of 3 permission explainers (then OS dialogs, an intro card and 7 coach marks)"],
  ["02-home.png", "baseline/F1/verify-01-home.png", "Map with an unlabeled chip rail and \"44 Nearby Arrivals\""],
  ["03-home-saved.png", "baseline/F2/verify-02-home.png", "Montrose home; the original has no saved stops"],
  ["04-home-list-full.png", "baseline/F3/12-nearby-sheet-up.png", "The Nearby Arrivals list (no stop names or walk times)"],
  ["05-route-near-40.png", "baseline/F1/verify-05-chip40-again.png", "Chip [40] opens \"Choose Direction\""],
  ["06-route-near-58-tc.png", "j1-nearest-stop/47-nwtc-choose-direction.png", "At Northwest TC, a chip opens \"Choose Direction\" with no bay"],
  ["07-place-hmns.png", "baseline/F11/verify-06-show-on-map.png", "\"Show on map\" for the museum, with no stop list"],
  ["08-search-hobby.png", "baseline/F3/03-typed-hobby.png", "Search \"hobby\""],
  ["09-search-82-alert.png", "baseline/F5/verify-07-search82.png", "No alert on the route result"],
  ["10-search-museum.png", "baseline/F11/verify-02-results.png", "Search for the museum"],
  ["11-search-empty.png", "j1-nearest-stop/28-search-open.png", "\"No Recent Searches\" and a Close button, no suggestions"],
  ["12-stop-342.png", "baseline/F1/verify-06-nb.png", "Stop sheet for 342, Route 40 NB"],
  ["13-stop-342-full.png", "j1-nearest-stop/18-stop342-sheet-up.png", "Stop sheet pulled up"],
  ["15-full-schedule.png", "j4-route-stop-lookup/20-full-schedule.png", "Full schedule"],
  ["16-walk-342.png", "baseline/F4/verify-06-plan-result.png", "\"Cannot find any trips\" (no walking directions)"],
  ["17-route-82.png", "baseline/F5/verify-13-fresh-timetable.png", "A raw timetable is the only stop list"],
  ["18-route-82-stop-2958.png", "baseline/F5/verify-22-stop-2958.png", "Stop 2958 on Route 82"],
  ["19-tc-northwest.png", "baseline/F7/verify-06-chip58.png", "Route 58 at \"Northwest Transit Center - Bay M (79)\""],
  ["20-tc-northwest-route58.png", "j1-nearest-stop/49-nwtc-arrivals-list.png", "\"19 Nearby Arrivals\" at the TC, with no bay shown"],
  ["21-plan-form.png", "baseline/F3/01-trip-fab.png", "Trip planner form"],
  ["22-plan-list.png", "baseline/F3/05-itinerary-list.png", "No boarding stop, ID or headsign"],
  ["24-itinerary.png", "baseline/F3/06-itinerary1.png", "Itinerary 1"],
  ["25-itinerary-map.png", "j2-trip-plan/24-itin1-map.png", "Itinerary map under a \"Track your journey\" coach mark"],
  ["26-live-trip.png", "baseline/F8/10-bell-dialog.png", "The only tracking status is a dialog behind a bell"],
  ["27-live-trip-ride-step.png", "j2-trip-plan/34-tracking.png", "Tracking shows the same itinerary list, with no current step"],
  ["28-alerts.png", "baseline/F6/verify-02-alerts-web.png", "Alerts open in an external browser"],
  ["29-alert-detail.png", "j3-in-trip-nav/47-route-alerts.png", "Route Alerts as one plain paragraph"],
  ["31-recent.png", "baseline/F2/verify-07-recent.png", "Recent"],
  ["32-fares.png", "baseline/F9/verify-01-fares.png", "Login wall, no fare table"],
  ["33-more.png", "baseline/F6/verify-01-more.png", "More"],
  ["34-settings.png", "j4-route-stop-lookup/48-settings.png", "Settings has one Pulse Vibration switch (no language, text size or walking pace)"],
  ["36-location-denied.png", "j4-route-stop-lookup/05-home-nolocation.png", "Location denied: a tutorial card over a map of Montrose, no stops near the rider"],
];

interface Meta {
  file: string;
  desc: string;
  path: string;
  viewport: string;
  gps: string;
  lang: string;
  textSize: string;
  now: string;
  frozen: boolean;
}

mkdirSync(OUT, { recursive: true });
rmSync(MANIFEST, { recursive: true, force: true });
if (!values.grep) for (const f of readdirSync(OUT)) if (/^\d\d-.*\.png$/.test(f)) rmSync(resolve(OUT, f)); // no stale shots

// 1. The shots.
const run = spawnSync("npx", ["playwright", "test", "screens.spec.ts", ...(values.grep ? ["--grep", values.grep] : [])], {
  cwd: PWA,
  stdio: "inherit",
  env: { ...process.env, SHOTS_DIR: OUT, E2E_NOW: NOON, E2E_FREEZE: "1" },
});

// 2. The originals.
const orig = resolve(OUT, "original");
mkdirSync(orig, { recursive: true });
for (const [file, src] of ORIGINALS) {
  const from = resolve(AUDIT, src);
  if (existsSync(from)) copyFileSync(from, resolve(orig, file));
  else console.warn(`original missing: ${src}`);
}

// 3. INDEX.md.
const metas: Meta[] = existsSync(MANIFEST)
  ? readdirSync(MANIFEST)
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(readFileSync(resolve(MANIFEST, f), "utf8")) as Meta)
      .sort((a, b) => a.file.localeCompare(b.file))
  : [];
const commit = (() => {
  try {
    const head = execSync("git rev-parse --short HEAD", { cwd: REPO }).toString().trim();
    const dirty = execSync("git status --porcelain -- pwa/src pwa/server pwa/shared", { cwd: REPO }).toString().trim();
    return dirty ? `${head} + uncommitted changes in pwa/` : head;
  } catch {
    return "unknown";
  }
})();
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const cell = (s: string) => s.replace(/\|/g, "\\|");
const origFor = new Map(ORIGINALS.map(([f, src, note]) => [f, { src, note }]));

const lines = [
  `# Screenshot set: ${basename(OUT)}`,
  "",
  `Captured by \`pwa/scripts/capture-set.ts\` (\`npx tsx scripts/capture-set.ts ${relative(PWA, OUT)}\`), which runs \`pwa/tests/e2e/screens.spec.ts\`. Code: ${commit}.`,
  "",
  `- **Clock:** frozen at ${when(NOON)} CDT for every shot (API through \`tests/e2e/fake-now.mjs\` with E2E_FREEZE=1, browser Date fixed at the same instant), so minute counts and clock times are the same across shots and across runs. The late-night shots (40, 41) are frozen at ${when(LATE_NIGHT)} CDT.`,
  "- **Data:** Set S (`OFFLINE=1 DEMO_REALTIME=0`): recorded fixtures, scheduled times only, demo alerts.",
  "- **Device:** Chromium, device scale 2, touch, en-US locale, America/Chicago. Files are 412x800 unless the name ends in `-360` (360x640).",
  "- **Variants:** `-xlarge-360` is Extra large text at 360x640 and `-es-360` is Spanish at 360x640.",
  `- **GPS:** mocked per shot: downtown (29.7563,-95.3639) unless noted; montrose (29.744,-95.39), uh (29.7199,-95.3422), nwtc (29.789,-95.456), eastDowntown (29.75,-95.36).`,
  "",
  `${metas.length} shots.${run.status === 0 ? "" : " **Some shots failed; see the Playwright output.**"}`,
  "",
  "| File | Shows | Viewport | GPS | Language | Text | Clock | URL |",
  "|---|---|---|---|---|---|---|---|",
  ...metas.map(
    (m) =>
      `| ${m.file} | ${cell(m.desc)} | ${m.viewport} | ${m.gps} | ${m.lang === "es" ? "Spanish" : "English"} | ${m.textSize === "xlarge" ? "Extra large" : "Standard"} | ${new Date(m.now).toLocaleTimeString("en-US", { timeZone: "America/Chicago", weekday: "short", hour: "numeric", minute: "2-digit" })}${m.frozen ? "" : " (running)"} | \`${cell(m.path)}\` |`,
  ),
  "",
  "## original/ (RideMETRO v2.71, Android emulator)",
  "",
  "| File | Source (ux-audit/) | Compare |",
  "|---|---|---|",
  ...ORIGINALS.filter(([f]) => existsSync(resolve(orig, f))).map(([f]) => `| ${f} | ${origFor.get(f)!.src} | ${cell(origFor.get(f)!.note)} |`),
  "",
];
writeFileSync(resolve(OUT, "INDEX.md"), lines.join("\n"));
rmSync(MANIFEST, { recursive: true, force: true });
console.log(`\n${metas.length} shots, ${readdirSync(orig).length} originals, INDEX.md -> ${OUT}`);
process.exit(run.status ?? 1);

