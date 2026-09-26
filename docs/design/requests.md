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

## Turn on the service worker config and the IndexedDB persister (D22)
- From: F0b
- Where: `pwa/vite.config.ts`, `pwa/src/app/App.tsx`
- Need: F0b's `src/sw/pwaOptions.ts` (manifest + Workbox: precache shell, fonts, icons,
  `stops.json`, `routes.json`; tiles CacheFirst 7 days / 2,000) and `src/sw/persister.ts`
  (TanStack cache in IndexedDB, 24 h) are built but not wired, because those two files are F0a's.
  Verified with exactly this change on a local build: offline reload serves the shell, map
  style, tiles, glyphs, stops and the persisted queries.
  - `vite.config.ts`: `import { pwaOptions } from "./src/sw/pwaOptions.ts";` and replace the
    inline `VitePWA({...})` with `VitePWA(pwaOptions)`.
  - `App.tsx`: `QueryClientProvider` → `PersistQueryClientProvider client={queryClient}
    persistOptions={persistOptions}` (from `@tanstack/react-query-persist-client` and
    `../sw/persister.ts`), and add `gcTime: PERSIST_MAX_AGE` to the query defaults (otherwise
    restored entries are garbage-collected after 5 min).
  - Until this lands, D22 (offline cache) is not met, and the manifest exists twice: the inline
    one in `vite.config.ts` lacks `includeAssets`, `orientation` and `description`.
- Status: open (blocks D22)

## Favicon and home-screen icon links
- From: F0b
- Where: `pwa/index.html`
- Need: `<link rel="icon" href="/brand/icon.svg" type="image/svg+xml" />` and
  `<link rel="apple-touch-icon" href="/brand/apple-touch-icon.png" />` in `<head>` (both files are
  in `public/brand/`).
- Status: open

## OSRM routes the F4 GPS through the downtown tunnels (1.1 km for a 35 m walk)
- From: F0b (fixture recording)
- Where: `pwa/server/services/walk.ts`
- Need: at 29.7563,-95.3639 OSRM snaps the start onto a tunnel entrance, so the recorded walks
  are 945 m to stop 342 (136 m away) and 1,124 m to stop 246 (35 m away). D8 would say 13 min,
  and `/nearby?precise=1` would sort the nearest stop last. Suggest: when OSRM's distance is more
  than 3× the straight line plus 150 m, return the straight-line estimate (with its "Street
  directions unavailable" warning) instead. Meanwhile `record-fixtures.ts` drops any recorded
  walk over that limit, so the offline run uses the estimate (246 · 1 min, 342 · 2 min).
- Status: open

## Vehicle age in the map scene
- From: F0b
- Where: `pwa/src/map/scene.ts` (`MapScene.vehicles`)
- Need: D22 draws a bus older than 120 s grey with "Last seen 3 min ago". The scene's vehicles
  carry no age, so the map can't grey them. An optional `ageSeconds?: number` per vehicle (C/A
  pass `Vehicle.ageSeconds`) would let MapView switch to a grey icon; screens can already put
  "Last seen 3 min ago" in `label`. Not changed here because it alters an exported type.
- Status: open

## F11: the real street walk from the museum puts 688 second
- From: F0b (fixture recording)
- Where: `docs/design/spec.md` E/F11 and D4
- Need: F11's end state ("Main St @ Remington Ln (688) · 🚶 4 min", first) holds with the
  straight-line estimate (688: 288 m, 4 min; 2504: 313 m). OSRM's street walks from the museum
  (29.7220,-95.3897) say 688 is 345 m (5 min) and 2504 is 331 m (4 min), so with recorded walks
  2504 sorts first. The recordings are not committed, so the demo matches the spec; the spec
  owner should decide whether F11 names 688 at 4 min (estimate) or 2504 (street route).
- Status: open

## Map attribution sits top-left, not bottom-left (C.16)
- From: F0b (review defect 6)
- Where: `docs/design/spec.md` C.16 ("Attribution is compact bottom-left")
- Need: bottom-left, the (i) button covered stop pins and ID chips in the map strip (at 360x640
  it sat on chip 342, the F4 target). It now sits top-left, 8dp under the search bar, inside
  the camera's top padding, where focused pins are never drawn. While an offline or trip banner
  fills the overlay slot it covers the (i); the credit returns when the banner goes. Please
  update C.16 to match.
- Status: open

## A shorter "walk from" sub-label for D4
- From: F0b (review defect 20)
- Where: `pwa/src/i18n/strings/common.ts` (`card.walkFrom`), D4's `walkFrom.label`
- Need: "walk from the museum" is two lines in the WalkButton at any width; F0b caps its width
  so the stop name beside it keeps two lines at 360dp. A one-line sub-label needs shorter copy,
  e.g. `walkFrom.label` = "from museum" and `card.walkFrom` = "{from}" (the a11y label already
  says "Walk from Houston Museum of Natural Science …"). Spec D4 names the current wording, so
  this is a copy decision for the spec owner.

## OSRM walks through the downtown tunnel network
- From: A (D2, D3, D8; flows F1, F4, F10)
- Where: server/services/walk.ts (`walkRoute`, used by `/walk` and `/nearby?precise=1`)
- Need: with live OSRM, the F1/F4/F10 GPS (29.7563,-95.3639) snaps to the pedestrian tunnels:
  342 comes back as 945 m (13 min) instead of ~177 m, and 246/247/567 as 1.0–1.2 km, so they sort
  last on home, D3's 567 card reads "16 min" and D8 shows "Turn left onto East McKinney Tunnel".
  Suggest rejecting an OSRM answer (fall back to the estimate) when any step's street matches
  /tunnel/i or its distance is more than ~2.5× the straight line. Offline fixtures are unaffected.
  Meanwhile module A treats an OSRM distance over max(3× the estimate, estimate + 400 m) as unknown
  (`screens/explore/walk/plausible.ts`): /nearby's distance and D8's walk fall back to the estimate.
- Status: open

## sortRouteChips should compare walk minutes, not metres
- From: A (D2 item 4, F1)
- Where: src/lib/sortRoutes.ts
- Need: the spec's order at the F1 GPS (6, 11, 40, 41, 51, …, [40] 3rd) only comes out when
  distances are compared at minute granularity; by metres, 11/51/52/137 (118 m) beat 6 (158 m) and
  40 (177 m) and [40] is 7th. Suggest `sortRouteChips(stops, tcs, bucket?: (m: number) => number)`.
  Until then `screens/explore/home/chips.ts` has its own comparator (walk minutes, then rail, then
  `compareRouteNames`); replace it with one call once the helper takes a bucket.
- Status: open

## RouteDirectionCard shows nothing when a direction has no departure
- From: A (D3, late night / F7 at night)
- Where: src/ui/RouteDirectionCard.tsx
- Need: with `deps` empty the card has no time line at all. It should read "No buses in the next
  2 hours" (`card.noBuses2h`), like NearbyStopCard's no-service row, once the times have loaded
  (a `loaded` or `noServiceText` prop). Until then `home/DirectionCard.tsx` joins that line under
  the card. For the TC variant the window is the TC detail's 90 min (`windowEnd`), so its wording
  should say so rather than "2 hours".
- Status: open

## `enabled` and `refetchInterval` options on useStop, useRoute, useTransitCenter
- From: A (D2 TC card, saved row, D3 cards, D6)
- Where: src/api/hooks.ts
- Need: these hooks fetch unconditionally, so optional fetches are done by rendering a child
  component only when needed (`WithTransitCenter` in home/Home.tsx, `WithIdleRoute` in
  home/SavedRow.tsx, `CardWithDetail` in home/DirectionCard.tsx). An `enabled` flag would allow plain hooks.
  `useStop` also polls every 30 s, but D6 needs `/stops/:id` once (spec D6 Data): its times come
  from the 20- and 4-arrival polls. `useStop(id, { refetchInterval: false })` would stop the third poll.
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
- Status: done in module A (D8 asks for `fabs: ["locate"]`); the padding still assumes one narrow
  column for any other screen with an extended FAB.

## SavedStopRow: "+N saved ›" wraps and breaks the fold rule M2
- From: A (D2 item 5, F2)
- Where: src/ui/SavedStopRow.tsx
- Need: at 412x800 with 2 saved stops, "+1 saved" wraps onto two lines and squeezes the name to 2
  lines, so the row is ~128 dp against the 88 dp budget and card #1's first route row falls under
  the nav. Keep the text button on one line (`white-space: nowrap`) and drop the separate chevron
  when it is shown (C.5b / D2 item 5: the chevron is replaced by "+2 saved ›").
- Status: open

## Fold targets without markup selectors
- From: A (D2 M2/M3, D3, D6, D8: `home/useHalfUpTo.ts`)
- Where: src/app/layouts/ExploreChrome.tsx, src/ui/NearbyStopCard.tsx
- Need: the half-sheet hook finds the sheet with `closest("section[role=region]")` and card #1's
  first route row with `querySelector("li")`. Expose the sheet element (e.g. `useSheetBodyRef()`)
  and a `firstRowRef` prop on NearbyStopCard so the hook takes explicit refs.
- Status: open

## BottomSheet: a half height below --sheet-half-min, and the FAB column at large text
- From: A (D3 at 360x640)
- Where: src/ui/BottomSheet.tsx, src/app/layouts/ExploreLayout.tsx
- Need: `minHalf` can only raise the half height (floor 340 dp), so three FABs (Locate, Plan Trip,
  "1 alert") don't fit under the search bar at 360x640, and at 412x800 they cost D3 its second
  card. D3 drops Locate whenever the alerts FAB shows (`routeFabs` in home/Home.tsx). At extra-large text the search bar grows to 2 lines and the top FAB still slides
  under it; the layout could hide the lowest-priority FAB when the column doesn't fit.
- Status: open

## DepTimes: the tooSoon word pushes "· 34 min" onto a line that starts with "·"
- From: A (D2/D3 cards, far-360, live-f1-412)
- Where: src/ui/DepTimes.tsx, TimeValue
- Need: "9:50 PM Leaves before you get there" wraps so the next line starts "· 34 min Live". Put the
  tooSoon word on its own line and keep the "·" attached to the next time (`white-space: nowrap`).
- Status: open

## Map: the highlighted stop looks like the rider's dot
- From: A (D6, D8, D3)
- Where: src/map/MapView.tsx (highlight and marker paint)
- Need: `highlightStopId` and `board` markers draw the same blue circle as the user dot, next to
  it. Draw a navy stop pin with the white "Stop: 342" callout (C.16). D4/D8 place markers use
  `board` until the "place" kind above exists.
- Status: open

## Formatting and small contract gaps
- From: A
- `lib/format.ts`: export a weekday + clock ("Sat 5:12 AM"), a service-date ("Fri, Sep 25") and an
  hour-label formatter; `screens/explore/stop/when.ts` repeats the time zone and locales until then.
- `MapScene.legs[].color` is required, but walk legs are painted with `--c-walk-line`; make it
  optional so D8 doesn't pass `color: ""`.
- `Button.label` is a string, so D6's "Part of **Northwest Transit Center**" can't be bold; accept
  a ReactNode (or a `strong` part).
- SheetHeader has no left-aligned 20sp Bold title (spec D8 "Walk to …"); D8 uses the default 22sp
  Regular title.
- NotifyPermissionCard keeps showing its buttons after "Turn on alerts" is granted (only a decline
  changes its state); D6 hides it through `onDone`.
- Status: open

## src/lib/text.ts (spec G.2 lists it; missing)
- From: B (D5, D9, D20)
- Where: src/lib/text.ts
- Need: re-export `tokenize` / `normalize` from `server/lib/text.ts`, so screens don't import server code directly.
- Status: no longer blocking B: `stopMatch.ts` now has its own small normaliser and imports no server code. (`src/lib/format.ts` and `src/lib/geo.ts` still import `server/lib/geo.ts`.)

## Shared stop-name lookup (or platform names in TC detail)
- From: B (D10)
- Where: src/lib (e.g. `stopName(id)` over `/data/stops.json`, shared with MapView's loader) or `getTransitCenterDetail` (add `platforms: {stopId, name}[]`)
- Need: the bay diagram labels platforms "Platform 2 · Stop #79" from the stop name, which the TC detail doesn't carry. B loads `/data/stops.json` (1.6 MB) itself in `screens/explore/tc/usePlatformNames.ts` (a second loader next to MapView's) until then. Preferred: `platforms: {stopId, name}[]` in `getTransitCenterDetail`, so a cold TC visit doesn't download every stop. B then deletes `usePlatformNames.ts`.
- Status: open (review B #23)

## Static routes list
- From: B (D20)
- Where: src/lib/routes.ts
- Need: export the loaded `ClientRoute[]` (e.g. `useAllRoutes()` with an error state), so D20 doesn't fetch `/data/routes.json` again through its own query. D20 now checks `res.ok`, shows ErrorState, and takes its badges from `routeRef()`.
- Status: open

## SearchField focus ring
- From: B (D5)
- Where: src/ui/SearchField.module.css
- Need: the input draws a rectangular 3px focus ring inside the pill (visible in every D5 screenshot, since the input is autofocused). Put the ring on the pill with `.field:focus-within` and give the input `outline-offset: -3px` or a pill radius, without `outline: none`.
- Status: open

## Map attribution shows on pushed pages
- From: B (D9, D10)
- Where: src/app/AppShell.tsx / src/map/MapView.tsx
- Need: the MapLibre attribution ("OpenFreeMap © OpenMapTiles …") stays visible above the bottom nav on PageLayout screens after coming from Explore (seen on /explore/route/82). Hide it with the map. Cause: `.hidden` uses `visibility: hidden`, and MapLibre's compact attribution sets `visibility: visible` on itself; its `z-index: 2` then paints over `<main>`.
- Status: open. B's pages (D9, D10, D20) work around it with a `position: relative; z-index: 3` screen wrapper; they can drop it once this is fixed.

## useRoute enabled flag
- From: B (D5)
- Where: src/api/hooks.ts
- Need: `useRoute(id, { enabled })`, like `useArrivals`. B works around it by rendering the "82 montrose" shortcut's fetching child only for a known route.
- Status: open

## BayDiagram: highlight several bays, and a spoken platform name
- From: B (D10)
- Where: src/ui/BayDiagram.tsx, `BayDiagramProps`
- Need: (1) `highlight?: string[]` (bay letters; or `{stopId, bay}[]` if letters can repeat across platforms). Route 85 at Northwest TC leaves from bays D and G; the banner names both but only D can be highlighted. (2) A separate spoken platform name per platform (e.g. `a11yLabel`), because the tile label is built from the visible "Platform 2 · Stop #79" and reads "Bay M, Platform 2 · Stop #79, routes 58" instead of C.14's "Bay M, platform 2, routes 58". B will pass every bay in `routeBays` and "platform 2".
- Status: open (review B #3, #32)

## /routes/:id/next: two departures per stop
- From: B (D9)
- Where: server/services/routeNext.ts (`getArrivals(..., { limit: 1 })`), `RouteNext` type
- Need: `limit: 2` (e.g. `next: {departureTime} | null` plus `then: {departureTime} | null`, or `deps: {departureTime}[]`). A scheduled trip due this minute can't say "Now" (C.2), so the column would show a clock time among minutes. Until the second trip is available, D9 shows "–" for such a row (spoken "Leaving now. The next time will show shortly.").
- Status: open (review B #2)

## Transit center detail repeats departures
- From: B (D10)
- Where: server/services/stopDetail.ts `getTransitCenterDetail`
- Need: the same trip can appear twice in one bay (Northwest TC bay G: trip 12065412 at 02:47:21Z twice, so "3 min Live · 3 min Live" and a React duplicate-key error). Probably two upstream sources (arrivals API + GTFS-RT) for one trip. Dedupe by `tripId + departureTime`. D10 now dedupes on the client too.
- Status: open (review B #4)

## directionWord(label, lang) in lib/format.ts
- From: B (D5, D9, D10)
- Where: src/lib/format.ts
- Need: export the `dir.<label>` lookup that `headsignLine` already does inside, so B can delete `screens/explore/route/useDirectionWord.ts` (a duplicate of it).
- Status: open (review B #25)

## Rail headsigns in headsignLine
- From: B (D10)
- Where: src/lib/format.ts `headsignLine`
- Need: rail headsigns read "METRORail - FANNIN SOUTH" / "METRORail -NORTH LINE TC". D9 strips the prefix (`routeGeo.ts displayHeadsign`); headsignLine (used for D10 rows and cards) should do the same.
- Status: open (review B #26)

## Spanish "andén" for bay in common.ts
- From: B (D10)
- Where: src/i18n/strings/common.ts (es `stopLine.bay`, `bay.tileA11y`)
- Need: "andén" means platform, so a bay is "bahía" (B's tc/search strings now say "bahía"; "andén" stays for platform). Change es `stopLine.bay` to "Bahía {bay}" and `bay.tileA11y` to "Bahía {bay}, {platform}, rutas {routes}".
- Status: open (review B #20)

## Per-route schedule links
- From: B (D9)
- Where: scripts/build-gtfs.ts → `routes.json` / `RouteDetail`
- Need: a `scheduleUrl` per route. RideMETRO's per-route pages exist (e.g. `/riding-metro/transit-services/local-bus/route-details/82-westheimer`, which links the PDF), but the slugs are hand-made: the obvious `<number>-<long name>` slug works for 77 of 117 bus routes and 404s for Park & Ride, Curb2Curb, Community Connector, 500, 23 ("23-clay-west-43rd") and 99. D9 now links the service page (local bus / Park & Ride / METRORail, all verified) as "Schedules on RideMETRO.org ↗" instead of the old `/schedules` URL, which redirected to the home page.
- Status: open (review B #6)
