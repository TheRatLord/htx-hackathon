# RideMETRO Concept: Progress

## Summary

A runnable, static mobile-web version of the RideMETRO redesign: map-first Home with a tucked "Near you" sheet and "Where to?", numbered nearby stops, Search, all three route options on the map with Fastest / Least walking, Trip steps with Start / Save / End trip, the stop schedule with Live / Scheduled / Tracking lost and Report, the Fares boarding code with Enlarge code, and Recent / More with saved places, saved trips and a theme switch. Light and dark mode, reduced motion respected.

**Run it:** `cd app && npm install && npm run dev`, open the printed URL at phone size (390 x 844). **Check it:** `npm run typecheck && npm test && npm run build && npm run test:e2e`. **Deploy:** `npm run build`, then host `app/dist/` on any static host (relative paths and hash URLs, no rewrites). Details in `README.md`.

**What's faked:** all places, stops, routes, times, timetables and fares are sample data (only the Wheeler Transit Center Bay F name and "5 Eastbound to Richey St" come from the real app); the clock is frozen at 4:19 PM; "you are here" is fixed; the map is a real MapLibre map over a hand-drawn Midtown/Museum Park stand-in, not real map data; Live / Scheduled / Tracking lost are sample labels; Report goes nowhere; the boarding code is a sample QR; brightness, Face ID and Wallet are described, not implemented; loading states use a short fake delay; saved items live in local storage only. Every screen says "Concept with sample data".

**Status:** every task is done and verified from a clean install (typecheck 0 errors, 104 unit tests, build, 13 Playwright tests, 28 screenshots with no console errors). The only thing not done is pushing: GitHub refuses pushes from this session (see Blocked), so all commits are on the local `ridemetro-app` branch.

Branch: `ridemetro-app` (never `main`). Everything lives in `app/`.
Stack: Vite + React 19 + TypeScript + MapLibre GL 6, sample data only, hash routing, static build.

## How to pick up

1. `cd app && npm install && npm run typecheck && npm test && npm run build`
2. Read the task list below. Pick unchecked tasks whose "Owns" don't overlap.
3. Shared foundation files (`src/app`, `src/components`, `src/map`, `src/data`, `src/lib`, `src/styles`, `package.json`, config files) are owned by the lead. Screen tasks only touch their own `src/screens/<Name>/` folder.
4. Screens talk to the map only through `useMapScene(scene)` from `src/map/scene.tsx`, and use `BottomSheet`, `Page`, `ui.tsx` components and tokens from `src/styles/tokens.css`.

## Tasks

- [x] **F0 Foundation.** Vite scaffold, scripts, tokens, Atkinson Hyperlegible, app shell + tab bar, hash router, store, offline MapLibre map with pins/lines/controls, bottom sheet, sample data, trip planning and sorting logic, Vitest setup and unit tests.
  Owns: everything outside `src/screens/*` except Home.
- [x] **T1 Home + Nearby stops.** Map, tucked sheet (3 snaps), "Where to?", Home/Work chips, numbered pins by distance, Near you list, saved trips, loading and empty states.
  Owns: `src/screens/Home/**`
- [x] **T2 Search.** Input autofocus, "zoo" finds Houston Zoo, Home/Work quick picks, recent searches, star to save a place, empty and no-results states. Picking a result opens Route options and records a recent.
  Owns: `src/screens/Search/**`
- [x] **T3 Route options.** All 3 routes on the map at once with A/B/C badges, cards below, Fastest / Least walking sort, tap card or map badge/line to select, star to save destination, loading state, Start trip button.
  Owns: `src/screens/Routes/**`
- [x] **T4 Trip steps.** Selected route on the map, step list (walk, board with Live/Scheduled/Lost, transfer, get off), Start trip, Save trip (shows saved state), End trip.
  Owns: `src/screens/Trip/**`
- [x] **T5 Stop screen.** Original schedule format restyled: route/direction tabs, departures strip with Live/Scheduled labels, legend, hourly timetable. Tracking lost banner with Report -> "Reported. Thank you."
  Owns: `src/screens/Stop/**`
- [x] **T6 Fares.** Sample boarding code (QR), "Trouble scanning? Enlarge code" / "Shrink code", works offline badge, stay-signed-in note, free ride progress.
  Owns: `src/screens/Fares/**`
- [x] **T7 Recent + More.** Recent destinations and saved trips (Recent); saved places, saved trips, appearance (System/Light/Dark), about/concept note (More). Empty states.
  Owns: `src/screens/Recent/**`, `src/screens/More/**`
- [x] **T8 Playwright smoke + screenshots.** Smoke test opens every screen at 390x844 and clicks through the main flow with zero console errors; screenshot spec writes every screen in light and dark to `screenshots/`.
  Owns: `e2e/**`, `screenshots/**`
- [x] **T9 README.** Run, test, build, deploy as a static site, what is faked.
  Owns: `README.md`
- [x] **T10 Screenshot review.** Compare every screen with `../demo/`, fix anything worse. (lead)
- [x] **T11 Final polish.** Alignment, 8px spacing, contrast, transitions; clean install + all checks; summary at top of this file. (lead)

## Decisions

- **Offline vector basemap.** Public tile hosts (OpenFreeMap, CARTO) are blocked from the build sandbox, and the brief asks for no API keys. The map is real MapLibre with drag, pinch, scroll and +/- zoom, but its streets, parks, water and freeway are a hand-made GeoJSON stand-in for Midtown/Museum Park generated in `src/map/basemap.ts`. It works offline and on any static host.
- **Map labels without a glyph server.** Street and place labels are drawn to canvas in the app font and registered as map images (`src/map/labels.ts`).
- **MapLibre 6 worker** is bundled through Vite (`?worker&url`) so the build works from any sub-path.
- **Frozen sample clock at 4:19 PM** (`SAMPLE_NOW`) so every screen and screenshot is repeatable and matches the storyboard (Route A arrives 4:46 PM, leave by 4:22 PM).
- **Zoo routes are hand-made** to match the storyboard. Other destinations get three generated options (one per nearby stop) from `planRoutes`, so Home, Work and every search result work end to end. Home and Work chip minutes are computed from those (18 and 21 min), not copied from the storyboard.
- **Changing the sort selects the new top option**, as in the storyboard (Least walking selects B).
- **Card status is the least trustworthy leg.** Route C rides the 65, whose tracking is lost, so its card says Tracking lost even though the 700 leg is live.
- **Map extent** reaches latitude 29.678 so every sample route fits above a 42% sheet; if a fit is still impossible the camera centres on the points at the widest zoom.
- **Hash routes** (`#/stop/wheeler-bay-f`) so the static build needs no rewrites and tests can open any screen directly. `#/nearby` opens Home with the sheet at half.
- **Walk minutes** use straight-line distance x 1.2 at 80 m/min, rounded up; the sample stop positions were placed so this gives 3, 4 and 6 min like the storyboard.
- **Simulated loading** (about 450 ms) on lists that would fetch data, so loading states are real.
- **Theme**: follows the OS by default; More lets the rider force Light or Dark (`<html data-theme>`).

## Blocked

- **Push to GitHub is refused (HTTP 403).** Every `git push` from this session fails with: "Claude doesn't have GitHub access to TheRatLord/htx-hackathon for your organization." Work is committed locally on `ridemetro-app` and the push is retried each iteration. Fix: reconnect GitHub at https://claude.ai/connect-github (and install the Claude GitHub App on the repo if needed).

## Log

- Iteration 1: created `ridemetro-app` from `origin/main` (push refused, see Blocked). Built foundation F0 and Home T1; typecheck, 50 unit tests and build pass; Home and Nearby checked at 390x844 in light and dark with no console errors or warnings.

- Iteration 1 (cont.): fixed sheet drag for fast flicks (window listeners); drafted README (T9) and Playwright smoke + screenshot specs (T8). Pan, button/scroll/pinch zoom, dark mode and reduced motion e2e checks pass. Launched workers for T3, T5, T6 in worktrees.
- Merged T6 Fares (worker commit 3f6eec4 applied as 8d8af8a; the worker's worktree started from main, so only its Fares files were taken). Typecheck, 58 tests and build pass; Fares checked in light and dark, no console errors. Push still refused (403).
- Merged T5 Stop screen (9d599bf, merge 1eba4b4). Applied its suggested shared fix: map fits leave room for pin captions (bottom +64) and clear of controls (right 108); Stop screen now fits all numbered stops. 64 tests pass. Launched T2 Search and T4 Trip workers (T3 Routes still running).
- Merged T3 Route options (9b625e8). Worker found the zoo sat near the southern map edge so route fits silently failed with a taller sheet: extended the basemap south, added a centring fallback when fitBounds can't be satisfied, and restored the 42% sheet. Labels now show from zoom 12.6. 74 tests pass. Launched T7 Recent + More (T2, T4 still running).
- Merged T2 Search (0a1ca96). 83 tests pass; search screenshots (empty and "zoo") in light and dark saved to screenshots/, no console errors.

- Merged T7 Recent + More (b113657) with its two shared suggestions: finite skeleton shimmer, pressed state on danger buttons.
- T4 Trip: the worker hit a usage limit before committing. Its Trip files were reviewed, finished and committed by the lead (sheet opens at 44% so the whole route fits). Its unowned edit to shared map bounds was dropped.
- T8: full smoke suite passes (every screen at 390x844 with zero console errors, the main flow end to end, drag pan, button/scroll/pinch zoom, dark mode + reduced motion). Fixed the flow test to use route B, since C is a saved sample trip.
- T10: compared all 28 screenshots with demo/. One behaviour was worse than the storyboard: changing sort kept the old selection. Now the new top option is selected (Least walking selects B, "Start trip · Route B"). Everything else matches or improves on the demo.
- T11: clean `npm ci`, typecheck, 104 unit tests, build and 13 e2e tests all pass. Push still refused (403).

## Next

Nothing left to build. Once GitHub access is fixed, run `git push -u origin ridemetro-app` from the repo root; the branch has a clean working tree.
