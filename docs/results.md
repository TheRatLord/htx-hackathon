# Results: RideMETRO PWA redesign on Android Chrome

A detailed version with screenshots: https://docs.google.com/document/d/1_nXLdg0VGtA2UOi4Y1-4UmPsV6V3n4Ttn7OJr0snCug

Final check of the redesign on a real Android browser, against the RideMETRO v2.71 baseline (`docs/baseline-steps.md`).

**Setup (2026-09-26, about 7:20–7:45 AM CDT)**
- Device: Android 14 emulator (`pixel34`, 1080x2400, 420 dpi, Google APIs image), Chrome 113.0.5672.136.
- Build: `npm run web:build`, served by `npm run web:preview` on :5173. `/api` proxied to the API on :8787, running on **live METRO feeds** (`metroArrivalsApi`, `gtfsRtTripUpdates` and alerts on; not `OFFLINE`, not `DEMO_REALTIME`).
- Connection: `adb reverse tcp:5173 tcp:5173`; GPS via `adb emu geo fix`.
- F10 ran in a Chrome tab; all other flows in the **installed PWA** (Chrome menu › Install app › Add to home screen, launched from the icon; `display-mode: standalone`, 412x839 CSS px).
- Counting follows the baseline: each tap, typed field, swipe, back press and system dialog is one action. Each flow starts from a cold load of `/` at the scenario's GPS fix.
- Screenshots: `ux-audit/redesign/emulator/`.

## Before and after (expert actions, measured on the emulator)

| Flow | Goal | Baseline v2.71 | Target | **Redesign (emulator)** | Reached? | Notes |
|---|---|---|---|---|---|---|
| F10 | First launch → usable map | 14 | ≤ 3 | **3** | yes | **Show stops near me** › Allow (Chrome location dialog) › **Show list** → "Fannin St @ McKinney St (246) · 1 min walk", live times. No coach marks, no notification ask. Chrome's own first-run screens (sign-in, notifications) not counted. |
| F1 | Nearest stop for Route 40 NB + next bus | 2 (4 first-timer) | ≤ 1 | **1** (2 while a Route 40 alert is up) | yes | Chip [40] → "Route 40 near you". A real Route 40 detour alert took the second card's room, so **Lamar St @ Main St (342) · NORTHBOUND · 24 min** needed 1 swipe (13 px short at 412x839). Without the alert it's above the fold. |
| F2 | Next 82 at my saved stop 2958 | 3 | 0 | **0** | yes | ★ Westheimer Rd @ Montrose Blvd (2958) · [82] EASTBOUND to DOWNTOWN · 14 min Live · 17 min, on the home sheet at launch. |
| F3 | UH → Hobby, know where to board | 10 | ≤ 4 | **3** | yes | Search › "hobby" › **Directions** → first card "Board 4 at #1665 · 7:53 AM" above the fold, with the live detour alert. Planned live by Transitous. |
| F4 | Walking directions to stop 342 | impossible (3 to a dead end) | ≤ 2 | **2** | partly | 342 pin › **Walk here · 2 min** → "Walk to Lamar St @ Main St (342) · 2 min · 600 ft · north side of Lamar St", "[41] Next bus in 1 min · Leaves before you get there. The next one: 30 min". **Straight-line estimate**, no street steps: live OSRM snapped to a 945 m detour, rejected by the server as implausible. Street steps work away from downtown (`walk-2958-street-steps.png`: Head west 350 ft, Turn right 200 ft …). |
| F5 | Route 82 → stops → live EB arrivals at 2958 | 9 (18) | ≤ 4 | **4** | yes | Search › "82" › **Eastbound** › row 2958 → "13 min · 17 min · 33 min" Live, plus Stop details and Walk 3 min. |
| F6 | Alert on Route 82? | 6, partial | ≤ 2 | **2** | yes | Search › "82" → "✓ No alerts for Route 82" (live alerts feed). |
| F7 | NW TC: Route 58 bay + next departure | 2 (14) | ≤ 2 | **1** | yes | Chip [58] → first card "Northwest Transit Center · **Bay M** · Platform 2 · [58] WESTBOUND to WEST BELT · 16 min"; map tag "NW TC · Bay M". |
| F8 | Start live trip tracking | 9, partial | ≤ 5 | **6** | no (1 over) | Search › "hobby" › Directions › Details on card 1 › **▶ Start trip** › **Show list** → "● Trip in progress · Arriving 8:37 AM", "Step 1 of 5 · Walk 12 min to Elgin St @ E18 U Of H (#1665) · Your 4 leaves at 7:57 AM · You have time." Alerts offered in-app ("Want a buzz before your stop?"); OS dialog only if the rider taps Turn on alerts. |
| F9 | Ticket / fare screen | 1 (login wall) | 1 | **1** | yes (stub) | Fares → "My ticket · Sign in to show ticket", fare table with REDUCED FARES and "Prices to be confirmed by METRO". |
| F11 | HMNS → closest stop → next arrivals | 6, partial | ≤ 3 | **3** | yes | Search › "museum of natural science" › **Stops near** → "Stops near Houston Museum of Natural Science · Walk times from the museum": 2504 (4 min) [56] SB, then 688 (5 min) [56] NB · 5 min Live. |

F10 and F8 counts match the side-by-side comparison videos (`ux-audit/video/out/sbs/`, `ux-audit/video/out/steps.json`), which count the **Show list** tap.

All 11 flows reach their goal on real Android Chrome. Two go one action over target: F8 (6 vs ≤ 5, due to the Show list tap that raises the step card), and F1 while METRO has a live Route 40 alert (one extra swipe to the northbound card).

## Screenshots: before (v2.71) and after (redesign, emulator)

Baseline screenshots (`ux-audit/baseline/`) are gitignored (246 MB) and exist only on the measuring machine. Redesign screenshots are committed.

| Flow | Before | After |
|---|---|---|
| F10 | `ux-audit/baseline/F10/09-map-usable.png` | `ux-audit/redesign/emulator/F10-0-welcome.png` → `F10-end.png` |
| F1 | `ux-audit/baseline/F1/verify-06-nb.png` | `ux-audit/redesign/emulator/F1-end.png` (standalone, alert on top), `F1-end-scrolled-chrome-tab.png` |
| F2 | `ux-audit/baseline/F2/verify-09-stop-2958.png` | `ux-audit/redesign/emulator/F2-end.png` |
| F3 | `ux-audit/baseline/F3/alt-route80-sb-from-chip.png` | `ux-audit/redesign/emulator/F3-end.png` |
| F4 | `ux-audit/baseline/F4/verify-06-plan-result.png` ("Cannot find any trips") | `ux-audit/redesign/emulator/F4-1-stop342.png` → `F4-end.png` |
| F5 | `ux-audit/baseline/F5/verify-22-stop-2958.png` | `ux-audit/redesign/emulator/F5-3-eastbound.png` → `F5-end.png` |
| F6 | `ux-audit/baseline/F6/verify-06-picker-scrolled.png` | `ux-audit/redesign/emulator/F6-end.png` |
| F7 | `ux-audit/baseline/F7/verify-06-chip58.png` | `ux-audit/redesign/emulator/F7-end.png` |
| F8 | `ux-audit/baseline/F8/10-bell-dialog.png` | `ux-audit/redesign/emulator/F8-4-itinerary.png` → `F8-end.png`, `F8-alerts-on.png`, `F8-notification-shade.png` |
| F9 | `ux-audit/baseline/F9/verify-01-fares.png` | `ux-audit/redesign/emulator/F9-end.png` |
| F11 | `ux-audit/baseline/F11/verify-08-tap-dot-retry.png` | `ux-audit/redesign/emulator/F11-2-typed.png` → `F11-end.png` |
| Walk (street steps) | none (no walking directions) | `ux-audit/redesign/emulator/walk-2958-street-steps.png` |
| Install | (native app) | `install-dialog.png`, `homescreen.png`, `home-standalone.png` |

## Android Chrome issues found and fixed

| # | Issue on the device | Fix | Commit |
|---|---|---|---|
| 1 | **Bottom nav cut off in the installed PWA after a reload.** In standalone mode Chrome 113 resolved `100dvh` to 895 px in an 839 px window (adding a toolbar standalone doesn't have). `#root` overflowed, the nav slid off-screen and the half sheet sat 56 px too low. | Shell fills the initial containing block (`html`, `body`, `#root` at `height: 100%`). Half sheet's 52% reads `--win-h` (set from `window.innerHeight` on resize) instead of `52dvh`. Checked: `#root` = `innerHeight` = 839 across reloads. | `611dc49` |
| 2 | **Blue focus box around "Nearby stops" on launch.** The app starts at `/`, redirects to `/explore`, and moves focus to the screen title for screen readers; with no prior tap, Chrome drew `:focus-visible` on it. Same after a notification tap. (`bug-focus-ring-before-fix.png`) | `h1[tabindex="-1"]:focus { outline: none }`. Titles aren't controls; real controls keep their 3 px focus ring. | `38801c0` |
| 3 | **Tapping a trip or tracking notification did nothing.** `showNotification` worked via the service worker (`F8-notification-shade.png`), but the generated Workbox worker had no `notificationclick` handler, so tapping "Your stop is next" just closed it and left the app in the background. | `public/sw-notify.js` (via Workbox `importScripts`) focuses the app window or opens the sending screen, passed by `notify()` in `data.url`. Verified: from the background, a tap brings the standalone app (`WebappActivity`) to front. | `b979755` |

Also checked, no change needed:
- **Geolocation.** Prompt appears on the Welcome button, not before; the fix arrives and the sheet fills in place.
- **Keyboard.** In the installed app the layout resizes above the keyboard; search field and results stay visible (`F5-2-typed.png`).
- **Bottom sheet touch.** Dragging the handle moves half → full → half, swiping the list scrolls it, and the map pans ("Search this area" appears).
- **Install.** Chrome offers "Install app" (localhost is a secure context); the app launches standalone with the theme-coloured status bar.
- `npm test`: 186 tests pass.

## What's real and what's demo or stub

| Part | Status |
|---|---|
| Stops, routes, stop order, schedules, transit centers and bays | **Real**: METRO GTFS `August2026IVOMS_20260828` (8,797 stops, 120 routes), built into `server/data/generated/`. |
| "Live" arrival times | **Real** with `METRO_TRANSIT_API_KEY` / `METRO_API_KEY` (METRO arrivals API + GTFS-RT trip updates), as in this run; otherwise labelled scheduled. `DEMO_REALTIME=1` gives simulated "Live (demo)" times (not used here). |
| Service alerts | **Real** METRO alerts feed (`api.ridemetro.org/v2alertspb`), e.g. Route 40 and 41 detours. The `[Demo]` Route 82 alert is offline-fixtures only. |
| Trip planning | **Real**, from Transitous (`api.transitous.org`, public MOTIS), not METRO's planner. `OFFLINE=1` uses recorded fixtures shifted to now, labelled "Sample times". |
| Walking directions | **Real** OSRM foot routing (`routing.openstreetmap.de`). Missing or implausible route → straight-line estimate plus Google Maps. |
| Place search | **Real**: Photon (OpenStreetMap) plus a curated landmark list. |
| Base map | **Real**: OpenFreeMap tiles, restyled to match the current app. |
| Live trip | Real plan and times, **driven by phone GPS**. Step card advances by position; "stop is next" buzz and notification are local (no push server). |
| My ticket | **Stub**: "Sign in to show ticket" hands off to METRO. No login or payment in the prototype. |
| Fare table | Hard-coded from METRO's public fare page (2026-09-25), marked "Prices to be confirmed by METRO". |

## Remaining known issues

1. **F1 with a live route alert (design).** The D3 half sheet is capped (`routeCap`) to keep the map strip and two FABs visible, so a real two- or three-line detour alert pushes the second direction's card 13 px below the fold at 412x839, further in a Chrome tab (783 px). Options: a one-line alert summary on D3 with full text one tap away, or let the sheet cover the lower FAB when the route has an alert.
2. **F4: no street steps downtown on live data.** From the F1/F4 fix (29.7563,-95.3639), OSRM snaps the start to a poor point: the route to 342 comes back as 945 m, 246 and 567 are also rejected, and the plausibility check falls back to a straight-line estimate ("600 ft"). The rider still gets distance, the next-bus verdict and the Google Maps button, but no turn-by-turn. Steps work away from downtown (Montrose → 2958). Fix: better snapping (OSRM `radiuses`, or snap to the nearest walkable way first).
3. **Stop 342 has no ID label on the home map.** Only the saved stop and first 3 cards are tagged (round 5), so the spec's "tap the pin labelled 342" relies on knowing which unlabelled pin it is. The chip path costs the same 2 actions when no alert is up.
4. **Trip banner covers the map label.** On the live-trip map, "● Trip in progress" overlaps the top of the "Stop 1665" tag at 412x839 (`F8-end.png`).
5. **Saved stop shown first even when far away.** At the NW TC fix, ★ 2958 is the first card with "6.4 mi walk · Leaves before you get there" (`F7-0-home.png`). This follows the F2 rule (saved stop always on top) but pushes nearby stops down far from home.
6. **Two walk numbers for the same landmark stop.** For HMNS the search row says "Closest stop: 688 · 4 min walk", but "Stops near" lists 2504 first at 4 min and 688 at 5 min.
7. **Chrome 113 without the Play Store.** This emulator image can't mint a WebAPK, so "Install app" falls back to a home-screen shortcut that still opens standalone; a Play-enabled phone installs a real app. The shortcut is named "RideMETRO", same as the native app.
8. **MapLibre console warnings.** One restyled layer logs repeated "Expected value to be of type number, but found null" warnings. Nothing visibly wrong.
9. **Emulator GPU mode.** With `-gpu swiftshader_indirect` Chrome's WebGL canvas never shows in screenshots (blank map); use `-gpu swangle_indirect -feature -Vulkan`. Emulator issue, not an app bug.
