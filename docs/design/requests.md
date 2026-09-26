# Shared-component requests

Module agents (A–D) never edit `src/ui`, `src/map`, `src/api`, `src/lib`, `src/state` or
`src/app`. When a screen needs a change there (a new prop, a variant, a helper, a bug fix), add an
entry below. F0b, or the lead after merge, makes the change and marks it done.

Format:

```
## <short title>
- From: <module> (<screen, e.g. D6>)
- Where: <file or component>
- Need: <what and why, in one or two sentences>
- Status: open | done (<commit>)
```

## Notes from F0a (contracts that differ slightly from the spec text)

- `AlertStatusLine` navigates itself: the compact AlertBox opens `/more/alerts/:id`, "+N more ›" opens `/more/alerts` (with `?route=` for scope "route"). `useAlerts()` also exposes `retry()` for its "Try again".
- `TimeValue` renders its own status word (or "Leaves before you get there"), so screens never pair a StatusWord with a time by hand. `DepTimes` (src/ui) renders "16 min · 46 min" with the offline rule applied.
- `Button` has `pressed` (toggle pills: Save, Track Bus Stop) and `ariaLabel`. `ListRow` has `href`, `checked`, `sub`, `leading`. `SectionHeader` has `note` ("To be confirmed by METRO") and `id` (anchors such as `#reduced`). `Dialog` has `open` / `onClose`. `StepList` has `currentIndex` ("You are here") and `TimelineStep.duration`. `BayDiagram` has `handAuthored` and `routesByBay` for tile labels.
- `NearbyStopCard.walkFrom` has an optional `name` (the full place name, for the a11y label). `SavedStopRow` has `moreSaved` for "+2 saved ›".
- Explore screens render their sheet with `ExploreSheet` (src/app/layouts/ExploreChrome.tsx), which is the layout's `BottomSheet` bound to `useSheet()`. Snap and `minHalf` reset when the path changes.
- `useWalkDistance(from, stopId, seedM?, seedSource?)` records the seed, so pass `/nearby`'s distance with `"osrm"` when `walkSource === "osrm"`; `recordWalkDistance()` is how D8 reports OSRM's answer.
- `useMapCenter()` (src/map/scene.ts) gives the map centre for the 300 m "Search this area" check; the layout's pill navigates to `/explore?at=<centre>&label=this area`.
- `useOffline()` (src/state/offline.ts) is the one offline signal: `navigator.onLine === false` or the
  last API request failed with `ApiError.code === "network"` (cleared by the next success). TimeValue,
  DepTimes, LiveStrip, UpdatedAgo and ScheduleCaption read it themselves (no `offline` props), and
  the layout's offline banner gets its time from the newest cached `dataUpdatedAt`. `useLang()` is in `src/i18n`.
- `useLocation()` also returns `requested`: `prompt` with `requested === false` means nobody has
  asked yet (e.g. "Not now, I'll search", or a deep link that skipped Welcome). Render that like
  location-off with [Turn on location], not "Finding your location…". `request()` restarts the
  watch every time it is called, so "Turn on location" / "Try again" work after `unavailable`.
- The overlay slot: screens request only `banner: "search-this-area"`. The layout itself adds
  offline, trip-active, "Showing Downtown Houston" (on `/explore` without `?at=` while there is no
  fix) and "Demo location" (`?demoLoc=`). On `/explore/trip` with an active trip, the layout draws
  the trip bar in the search bar's place (no "Open ›"), so D13 only sets `hideSearchBar: true`.
- The map lives in `AppShell` (src/app) and survives every navigation; it is hidden, not
  destroyed, outside ExploreLayout. The bottom nav is also rendered there.
- `departureA11y(dep, now, { walkMin, offline, markScheduled, lang })` (src/lib/format.ts) is the
  spoken form of a time ("4 minutes, Live", "7:02 PM, Leaves before you get there"); use it for
  any accessible label that includes a departure. `platformLabel(stop, lang)` gives "Platform 2" /
  "Stop #79" for TC platforms (BayDiagram labels, C.14).
- `WalkButton` has `tcName` (the TC card's label reads "Walk to Northwest Transit Center, 11 minutes").
- `useInstallPrompt()` (src/state/install.ts) gives `{ available, prompt() }` for More › About's
  "Add to home screen" row (D22).
- `NotifyPermissionCard` remembers each context in `localStorage["ridemetro.notifyAsked"]` and
  renders nothing once asked, or when the browser permission is not "default".
- Walk steps: `depart` steps carry `compass` ("southeast"), and the OSRM `arrive` step's `street`
  is the stop name, so `walkStepText` gives "Head southeast on Calhoun Rd" / "Arrive at Lamar St @ Main St".
- `GET /api/stops/:id/schedule?route=` returns 404 `STOP_NOT_ON_ROUTE` (`error.stop_not_on_route`)
  when the route doesn't serve the stop.
- `parentOf(pathname, search)` keeps the plan query (itinerary → list) and `?route=` (Walk / Full
  Schedule → Stop sheet). "‹ Back" uses history only when `history.state.idx > 0`.

## Foundation review decisions

All 26 findings of the F0a review were fixed. Where the fix differs from the review's suggestion:

- **11 (notifications hang in dev):** `notify()` races `serviceWorker.ready` against 3 s and
  falls back to `vibrate()`, instead of enabling the service worker in `vite dev`. A dev service
  worker with Workbox's navigation fallback can serve stale app shells while modules iterate, and
  the race also covers browsers where registration fails. Real notifications are testable with
  `npm run web:build && npm run web:preview`.
- **14 (Downtown chip):** the layout adds "Showing Downtown Houston" only on the home screen
  (`/explore` without `?at=`) while there is no fix, not on every Explore screen when location is
  off: on the Stop sheet, Walk or the planner the map is not showing Downtown, so the chip would
  be untrue there.
- **10 (card labels):** the LiveStrip keeps its spec label "16 minutes, scheduled"
  (`markScheduled: true`); cards follow C.5a and leave the scheduled default unspoken.

## OSRM walks through the downtown tunnel network
- From: A (D2, D3, D8; flows F1, F4, F10)
- Where: server/services/walk.ts (`walkRoute`, used by `/walk` and `/nearby?precise=1`)
- Need: with live OSRM, the F1/F4/F10 GPS (29.7563,-95.3639) snaps to the pedestrian tunnels:
  342 comes back as 945 m (13 min) instead of ~177 m, and 246/247/567 as 1.0–1.2 km, so they sort
  last on home, D3's 567 card reads "16 min" and D8 shows "Turn left onto East McKinney Tunnel".
  Suggest rejecting an OSRM answer (fall back to the estimate) when any step's street matches
  /tunnel/i or its distance is more than ~2.5× the straight line. Offline fixtures are unaffected.
- Status: open

## sortRouteChips should compare walk minutes, not metres
- From: A (D2 item 4, F1)
- Where: src/lib/sortRoutes.ts
- Need: the spec's order at the F1 GPS (6, 11, 40, 41, 51, …, [40] 3rd) only comes out when
  distances are compared at minute granularity; by metres, 11/51/52/137 (118 m) beat 6 (158 m) and
  40 (177 m) and [40] is 7th. Worked around in `screens/explore/home/chips.ts` (passes
  `walkMinutes(d)` as the distance); move that into the helper and drop the workaround.
- Status: open

## RouteDirectionCard shows nothing when a direction has no departure
- From: A (D3, late night / F7 at night)
- Where: src/ui/RouteDirectionCard.tsx
- Need: with `deps` empty the card has no time line at all. It should read "No buses in the next
  2 hours" (`card.noBuses2h`), like NearbyStopCard's no-service row.
- Status: open

## `enabled` option on useStop, useRoute, useTransitCenter
- From: A (D2 TC card, saved row, D3 cards)
- Where: src/api/hooks.ts
- Need: these hooks fetch unconditionally, so optional fetches are done by rendering a child
  component only when needed (`WithTransitCenter` in home/Home.tsx, `WithIdleRoute` in
  home/SavedRow.tsx, `CardWithDetail` in home/DirectionCard.tsx). An `enabled` flag would allow plain hooks.
- Status: open

## A shared client stop lookup (/data/stops.json)
- From: A (D6 loading title, D3 side of street)
- Where: src/lib (MapView.tsx has a private `stopsById` loader)
- Need: `useClientStop(id)` so D6's loading state can show "Name (ID)" from the cached file (spec
  D6 States) and D3 can read `side` without a `/api/stops/:id` call per card. Today D6 falls back
  to the saved/recent name or "Stop #342", and D3 calls `useStop` for stops not in `/nearby`.
- Status: open

## Map marker kind "place" (black pin)
- From: A (D4 place, D8 `fromName` origin)
- Where: src/map/scene.ts, MapView.tsx
- Need: spec D4 wants a black `place` pin labelled with the place; `markers[].kind` has no such
  kind, so D4/D8 use "destination" (red) for now.
- Status: open

## Button `external` names RideMETRO.org for every link
- From: A (D8 "Open in Google Maps ↗")
- Where: src/ui/Button.tsx
- Need: `external` always appends "(opens RideMETRO.org)". D8 works around it with `onPress`
  → `window.open`. Suggest an `externalLabel` prop (or a neutral "(opens in a new tab)").
- Status: open

## Walk: fitBounds padding hides the start under the FABs
- From: A (D8)
- Where: src/map/MapView.tsx (`applyScene` padding `right: 72`)
- Need: the extended "Plan Trip" FAB is ~130 dp wide, so a walk starting at the right edge ends
  up under it. Use the FAB column's real width as right padding (or hide Plan Trip on D8).
- Status: open

## Smaller items
- From: A
- SheetHeader has no left-aligned 20sp Bold title (spec D8 "Walk to …"); D8 uses the default 22sp
  Regular title.
- Weekday + clock ("Sat 5:12 AM") and service-date ("Fri, Sep 25") formatting live in
  `screens/explore/stop/when.ts`; move them to src/lib/format.ts if another module needs them.
- Status: open
