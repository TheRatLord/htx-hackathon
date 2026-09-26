# Results: RideMETRO PWA redesign on Android Chrome

Final check of the redesign on a real Android browser, compared with the baseline of the current
RideMETRO v2.71 app (`docs/baseline-steps.md`).

**Setup (2026-09-26, about 7:20–7:45 AM CDT)**
- Device: Android 14 emulator (`pixel34`, 1080x2400, 420 dpi, Google APIs image) running Chrome 113.0.5672.136.
- Build: production build (`npm run web:build`), served by `npm run web:preview` on :5173. `/api` is proxied to the API on :8787, which ran against **live METRO feeds** (`metroArrivalsApi`, `gtfsRtTripUpdates` and alerts all on; not `OFFLINE`, not `DEMO_REALTIME`).
- Connection: `adb reverse tcp:5173 tcp:5173`, GPS set with `adb emu geo fix`.
- F10 was run in a Chrome tab. Every other flow was run in the **installed PWA** (Chrome menu › Install app › Add to home screen, then launched from the home-screen icon; `display-mode: standalone`, 412x839 CSS px).
- Counting rules are the baseline's: every tap, typed field, swipe, back press and system dialog counts as one action. Each flow starts from a cold load of `/` at the scenario's GPS fix.
- Screenshots are in `ux-audit/redesign/emulator/`.

## Before and after (expert actions, measured on the emulator)

| Flow | Goal | Baseline v2.71 | Target | **Redesign (emulator)** | Reached? | Notes |
|---|---|---|---|---|---|---|
| F10 | First launch → usable map | 14 | ≤ 3 | **2** | yes | Tap **Show stops near me**, then Allow in Chrome's location dialog. No coach marks and no notification ask. Chrome's own first-run screens (sign-in, notifications) come before the app and are not counted. |
| F1 | Nearest stop for Route 40 NB + next bus | 2 (4 first-timer) | ≤ 1 | **1** (2 while a Route 40 alert is up) | yes | Tap chip [40] → "Route 40 near you". The live feed had a real Route 40 detour alert. It fills the room of the second card, so **Lamar St @ Main St (342) · NORTHBOUND · 24 min** needed 1 swipe (13 px short at 412x839). Without that alert the card is above the fold. |
| F2 | Next 82 at my saved stop 2958 | 3 | 0 | **0** | yes | ★ Westheimer Rd @ Montrose Blvd (2958) · [82] EASTBOUND to DOWNTOWN · 14 min Live · 17 min, on the home sheet at launch. |
| F3 | UH → Hobby, know where to board | 10 | ≤ 4 | **3** | yes | Search › type "hobby" › **Directions**. The first card reads "Board 4 at #1665 · 7:53 AM" above the fold, with the live detour alert. The trip was planned live by Transitous. |
| F4 | Walking directions to stop 342 | impossible (3 to a dead end) | ≤ 2 | **2** | partly | Tap the 342 pin → **Walk here · 2 min**. The screen shows "Walk to Lamar St @ Main St (342) · 2 min · 600 ft · north side of Lamar St" and "[41] Next bus in 1 min · Leaves before you get there. The next one: 30 min". For this stop the path is a **straight-line estimate**, with no street steps: the live OSRM route snapped to a 945 m detour and the server rejected it as implausible. Away from downtown the street steps do show (`walk-2958-street-steps.png`: Head west 350 ft, Turn right 200 ft …). |
| F5 | Route 82 → stops → live EB arrivals at 2958 | 9 (18) | ≤ 4 | **4** | yes | Search › "82" › **Eastbound** › row 2958 → "13 min · 17 min · 33 min" Live, plus Stop details and Walk 3 min. |
| F6 | Alert on Route 82? | 6, partial | ≤ 2 | **2** | yes | Search › "82" → "✓ No alerts for Route 82", from the live alerts feed. |
| F7 | NW TC: Route 58 bay + next departure | 2 (14) | ≤ 2 | **1** | yes | Chip [58] → first card "Northwest Transit Center · **Bay M** · Platform 2 · [58] WESTBOUND to WEST BELT · 16 min", map tag "NW TC · Bay M". |
| F8 | Start live trip tracking | 9, partial | ≤ 5 | **5** | yes | Search › "hobby" › Directions › card 1 › **▶ Start trip** → "● Trip in progress · Arriving 8:37 AM", "Step 1 of 5 · Walk 12 min to Elgin St @ E18 U Of H (#1665) · Your 4 leaves at 7:57 AM · You have time." Alerts are offered in the app ("Want a buzz before your stop?"). The OS dialog comes only if the rider taps Turn on alerts. |
| F9 | Ticket / fare screen | 1 (login wall) | 1 | **1** | yes (stub) | Fares → "My ticket · Sign in to show ticket" plus the fare table with REDUCED FARES and "Prices to be confirmed by METRO". |
| F11 | HMNS → closest stop → next arrivals | 6, partial | ≤ 3 | **3** | yes | Search › "museum of natural science" › **Stops near** → "Stops near Houston Museum of Natural Science · Walk times from the museum": 2504 (4 min) with [56] SB, then 688 (5 min) with [56] NB · 5 min Live. |

All 11 flows are within their targets on real Android Chrome. The one exception is F1: while METRO
has a live Route 40 alert, the northbound card needs one extra swipe.

## Screenshots: before (v2.71) and after (redesign, emulator)

Baseline screenshots are under `ux-audit/baseline/`, which is gitignored (246 MB) and exists only on
the measuring machine. The redesign screenshots below are committed.

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
| 1 | **Bottom nav cut off in the installed PWA after a reload.** In standalone mode, Chrome 113 resolved `100dvh` to 895 px in an 839 px window: it added the height of the toolbar, which a standalone app doesn't have. `#root` overflowed, the nav slid below the screen and the half sheet sat 56 px too low. | The shell fills the initial containing block (`html`, `body` and `#root` at `height: 100%`). The half sheet's 52% now reads `--win-h`, which is set from `window.innerHeight` on resize, instead of `52dvh`. Checked: `#root` = `innerHeight` = 839 after several reloads. | `611dc49` |
| 2 | **Blue focus box around "Nearby stops" on launch.** The installed app starts at `/` and redirects to `/explore`. Focus then moves to the screen title for screen readers, and because no tap came first, Chrome drew `:focus-visible` around the title. The same happens after a notification tap. (`bug-focus-ring-before-fix.png`) | `h1[tabindex="-1"]:focus { outline: none }`. Titles are not controls. Every real control keeps its 3 px focus ring. | `38801c0` |
| 3 | **Tapping a trip or tracking notification did nothing.** `showNotification` worked through the service worker (`F8-notification-shade.png`). But the generated Workbox worker had no `notificationclick` handler, so a tap on "Your stop is next" closed the notification and left the app in the background. | `public/sw-notify.js`, loaded through Workbox `importScripts`, focuses the app window or opens the screen that sent the notification. `notify()` now passes that screen in `data.url`. Verified: with the app in the background, a tap brings the standalone app (`WebappActivity`) to the front. | `b979755` |

Also checked, with no change needed:
- **Geolocation.** The prompt appears on the Welcome button and not before. The fix arrives and the sheet fills in place.
- **Keyboard.** In the installed app the layout resizes above the keyboard, and the search field and results stay visible (`F5-2-typed.png`).
- **Bottom sheet touch.** Dragging the handle moves half → full → half, a swipe on the list scrolls the list, and the map pans ("Search this area" appears).
- **Install.** Chrome offers "Install app" (localhost is a secure context), and the app launches standalone with the theme-coloured status bar.
- `npm test`: 186 tests pass.

## What's real and what's demo or stub

| Part | Status |
|---|---|
| Stops, routes, stop order, schedules, transit centers and bays | **Real**: METRO GTFS feed `August2026IVOMS_20260828` (8,797 stops, 120 routes), built into `server/data/generated/`. |
| "Live" arrival times | **Real** when the API has `METRO_TRANSIT_API_KEY` / `METRO_API_KEY` (METRO arrivals API and GTFS-RT trip updates), as in this run. Other times are labelled as scheduled. `DEMO_REALTIME=1` gives simulated times labelled "Live (demo)". This run did not use it. |
| Service alerts | **Real** METRO alerts feed (`api.ridemetro.org/v2alertspb`), for example the Route 40 and Route 41 detours. The `[Demo]` Route 82 alert exists only in the offline fixtures. |
| Trip planning | **Real**, from Transitous (`api.transitous.org`, a public MOTIS instance), not METRO's own planner. With `OFFLINE=1` it uses recorded fixtures shifted to now and labelled "Sample times". |
| Walking directions | **Real** OSRM foot routing (`routing.openstreetmap.de`). When a route is missing or implausible, the app uses a straight-line estimate and offers Google Maps. |
| Place search | **Real**, from Photon (OpenStreetMap), plus a curated landmark list. |
| Base map | **Real**: OpenFreeMap tiles, restyled to look like the current app's map. |
| Live trip | Real plan and real times, **driven by the phone's GPS**. The step card advances by position, and the "stop is next" buzz and notification are local (no push server). |
| My ticket | **Stub**: "Sign in to show ticket" hands off to METRO. There is no login and no payment in the prototype. |
| Fare table | Hard-coded from METRO's public fare page on 2026-09-25 and marked "Prices to be confirmed by METRO". |

## Remaining known issues

1. **F1 with a live route alert (design).** The D3 half sheet is capped (`routeCap`) so that the map strip and two FABs stay visible. A real two-line or three-line detour alert then pushes the second direction's card 13 px under the fold at 412x839, and further in a Chrome tab (783 px). Options: a one-line alert summary on D3 with the full text one tap away, or letting the sheet cover the lower FAB when the route has an alert.
2. **F4: no street steps downtown on live data.** From the F1/F4 fix (29.7563,-95.3639), OSRM snaps the start to a poor point. The route to 342 comes back as 945 m, and 246 and 567 are also rejected, so the server's plausibility check falls back to a straight-line estimate ("600 ft"). The rider gets the distance, the next-bus verdict and the Google Maps button, but no turn-by-turn steps. Away from downtown the steps work (Montrose → 2958). A better snap would help: OSRM `radiuses`, or snapping to the nearest walkable way first.
3. **Stop 342 has no ID label on the home map.** The home map tags only the saved stop and the first 3 cards (round 5). The spec's "tap the pin labelled 342" therefore relies on knowing which unlabelled pin it is. The chip path costs the same 2 actions when no alert is up.
4. **The trip banner covers the map label.** On the live-trip map, "● Trip in progress" overlaps the top of the "Stop 1665" tag at 412x839 (`F8-end.png`).
5. **The saved stop is shown first even when it's far away.** At the NW TC fix, ★ 2958 is the first card with "6.4 mi walk · Leaves before you get there" (`F7-0-home.png`). This follows the F2 rule (the saved stop is always on top), but far from home it pushes the nearby stops down.
6. **Two walk numbers for the same landmark stop.** For HMNS the search row says "Closest stop: 688 · 4 min walk", but the "Stops near" list puts 2504 first at 4 min and 688 at 5 min.
7. **Chrome 113 without the Play Store.** On this emulator image Chrome can't mint a WebAPK, so "Install app" falls back to a home-screen shortcut, which still opens standalone. On a Play-enabled phone it installs as a real app. The shortcut is also named "RideMETRO", the same as the native app.
8. **MapLibre console warnings.** The base style logs repeated "Expected value to be of type number, but found null" warnings from one of the restyled layers. Nothing is visibly wrong.
9. The emulator's own GPU mode matters: with `-gpu swiftshader_indirect` Chrome's WebGL canvas never shows in screenshots (blank map). Use `-gpu swangle_indirect -feature -Vulkan`. This is an emulator issue, not an app bug.
