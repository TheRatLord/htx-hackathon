# RideMETRO Concept: Progress

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
- [ ] **T2 Search.** Input autofocus, "zoo" finds Houston Zoo, Home/Work quick picks, recent searches, star to save a place, empty and no-results states. Picking a result opens Route options and records a recent.
  Owns: `src/screens/Search/**`
- [ ] **T3 Route options.** All 3 routes on the map at once with A/B/C badges, cards below, Fastest / Least walking sort, tap card or map badge/line to select, star to save destination, loading state, Start trip button.
  Owns: `src/screens/Routes/**`
- [ ] **T4 Trip steps.** Selected route on the map, step list (walk, board with Live/Scheduled/Lost, transfer, get off), Start trip, Save trip (shows saved state), End trip.
  Owns: `src/screens/Trip/**`
- [x] **T5 Stop screen.** Original schedule format restyled: route/direction tabs, departures strip with Live/Scheduled labels, legend, hourly timetable. Tracking lost banner with Report -> "Reported. Thank you."
  Owns: `src/screens/Stop/**`
- [x] **T6 Fares.** Sample boarding code (QR), "Trouble scanning? Enlarge code" / "Shrink code", works offline badge, stay-signed-in note, free ride progress.
  Owns: `src/screens/Fares/**`
- [ ] **T7 Recent + More.** Recent destinations and saved trips (Recent); saved places, saved trips, appearance (System/Light/Dark), about/concept note (More). Empty states.
  Owns: `src/screens/Recent/**`, `src/screens/More/**`
- [ ] **T8 Playwright smoke + screenshots.** Smoke test opens every screen at 390x844 and clicks through the main flow with zero console errors; screenshot spec writes every screen in light and dark to `screenshots/`.
  Owns: `e2e/**`, `screenshots/**`
- [ ] **T9 README.** Run, test, build, deploy as a static site, what is faked.
  Owns: `README.md`
- [ ] **T10 Screenshot review.** Compare every screen with `../demo/`, fix anything worse. (lead)
- [ ] **T11 Final polish.** Alignment, 8px spacing, contrast, transitions; clean install + all checks; summary at top of this file. (lead)

## Decisions

- **Offline vector basemap.** Public tile hosts (OpenFreeMap, CARTO) are blocked from the build sandbox, and the brief asks for no API keys. The map is real MapLibre with drag, pinch, scroll and +/- zoom, but its streets, parks, water and freeway are a hand-made GeoJSON stand-in for Midtown/Museum Park generated in `src/map/basemap.ts`. It works offline and on any static host.
- **Map labels without a glyph server.** Street and place labels are drawn to canvas in the app font and registered as map images (`src/map/labels.ts`).
- **MapLibre 6 worker** is bundled through Vite (`?worker&url`) so the build works from any sub-path.
- **Frozen sample clock at 4:19 PM** (`SAMPLE_NOW`) so every screen and screenshot is repeatable and matches the storyboard (Route A arrives 4:46 PM, leave by 4:22 PM).
- **Zoo routes are hand-made** to match the storyboard. Other destinations get three generated options (one per nearby stop) from `planRoutes`, so Home, Work and every search result work end to end. Home and Work chip minutes are computed from those (18 and 21 min), not copied from the storyboard.
- **Card status is the least trustworthy leg.** Route C rides the 65, whose tracking is lost, so its card says Tracking lost even though the 700 leg is live.
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

## Next

Review and merge T3, T2, T4 when their workers finish. Then launch T7 (Recent + More). Then run the full smoke + screenshot specs (T8), verify README (T9), then T10, T11.
