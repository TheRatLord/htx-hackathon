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
- Status: done (34fb41e)

## Favicon and home-screen icon links
- From: F0b
- Where: `pwa/index.html`
- Need: `<link rel="icon" href="/brand/icon.svg" type="image/svg+xml" />` and
  `<link rel="apple-touch-icon" href="/brand/apple-touch-icon.png" />` in `<head>` (both files are
  in `public/brand/`).
- Status: done (34fb41e)

## OSRM routes the F4 GPS through the downtown tunnels (1.1 km for a 35 m walk)
- From: F0b (fixture recording)
- Where: `pwa/server/services/walk.ts`
- Need: at 29.7563,-95.3639 OSRM snaps the start onto a tunnel entrance, so the recorded walks
  are 945 m to stop 342 (136 m away) and 1,124 m to stop 246 (35 m away). D8 would say 13 min,
  and `/nearby?precise=1` would sort the nearest stop last. Suggest: when OSRM's distance is more
  than 3× the straight line plus 150 m, return the straight-line estimate (with its "Street
  directions unavailable" warning) instead. Meanwhile `record-fixtures.ts` drops any recorded
  walk over that limit, so the offline run uses the estimate (246 · 1 min, 342 · 2 min).
- Status: done (cecb86b): the server rejects a routed walk longer than 3x the straight line + 150 m (`implausibleWalk` in shared/walk.ts) and falls back to the straight line

## Vehicle age in the map scene
- From: F0b
- Where: `pwa/src/map/scene.ts` (`MapScene.vehicles`)
- Need: D22 draws a bus older than 120 s grey with "Last seen 3 min ago". The scene's vehicles
  carry no age, so the map can't grey them. An optional `ageSeconds?: number` per vehicle (C/A
  pass `Vehicle.ageSeconds`) would let MapView switch to a grey icon; screens can already put
  "Last seen 3 min ago" in `label`. Not changed here because it alters an exported type.
- Status: done (21ce4f6): `vehicles[].ageSeconds`, grey past 120 s

## F11: the real street walk from the museum puts 688 second
- From: F0b (fixture recording)
- Where: `docs/design/spec.md` E/F11 and D4
- Need: F11's end state ("Main St @ Remington Ln (688) · 🚶 4 min", first) holds with the
  straight-line estimate (688: 288 m, 4 min; 2504: 313 m). OSRM's street walks from the museum
  (29.7220,-95.3897) say 688 is 345 m (5 min) and 2504 is 331 m (4 min), so with recorded walks
  2504 sorts first. The recordings are not committed, so the demo matches the spec; the spec
  owner should decide whether F11 names 688 at 4 min (estimate) or 2504 (street route).
- Status: declined: a spec copy decision (688 vs 2504) for the lead, not a shared-code change

## Map attribution sits top-left, not bottom-left (C.16)
- From: F0b (review defect 6)
- Where: `docs/design/spec.md` C.16 ("Attribution is compact bottom-left")
- Need: bottom-left, the (i) button covered stop pins and ID chips in the map strip (at 360x640
  it sat on chip 342, the F4 target). It now sits top-left, 8dp under the search bar, inside
  the camera's top padding, where focused pins are never drawn. While an offline or trip banner
  fills the overlay slot it covers the (i); the credit returns when the banner goes. Please
  update C.16 to match.
- Status: declined: kept top-left so it clears the sheet at every snap; the spec text needs updating

## A shorter "walk from" sub-label for D4
- From: F0b (review defect 20)
- Where: `pwa/src/i18n/strings/common.ts` (`card.walkFrom`), D4's `walkFrom.label`
- Need: "walk from the museum" is two lines in the WalkButton at any width; F0b caps its width
  so the stop name beside it keeps two lines at 360dp. A one-line sub-label needs shorter copy,
  e.g. `walkFrom.label` = "from museum" and `card.walkFrom` = "{from}" (the a11y label already
  says "Walk from Houston Museum of Natural Science …"). Spec D4 names the current wording, so
  this is a copy decision for the spec owner.
- Status: declined: copy decision, left to the spec

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
- Status: done (cecb86b), same fix as the F4 entry

## sortRouteChips should compare walk minutes, not metres
- From: A (D2 item 4, F1)
- Where: src/lib/sortRoutes.ts
- Need: the spec's order at the F1 GPS (6, 11, 40, 41, 51, …, [40] 3rd) only comes out when
  distances are compared at minute granularity; by metres, 11/51/52/137 (118 m) beat 6 (158 m) and
  40 (177 m) and [40] is 7th. Suggest `sortRouteChips(stops, tcs, bucket?: (m: number) => number)`.
  Until then `screens/explore/home/chips.ts` has its own comparator (walk minutes, then rail, then
  `compareRouteNames`); replace it with one call once the helper takes a bucket.
- Status: done (5665a6e)

## RouteDirectionCard shows nothing when a direction has no departure
- From: A (D3, late night / F7 at night)
- Where: src/ui/RouteDirectionCard.tsx
- Need: with `deps` empty the card has no time line at all. It should read "No buses in the next
  2 hours" (`card.noBuses2h`), like NearbyStopCard's no-service row, once the times have loaded
  (a `loaded` or `noServiceText` prop). Until then `home/DirectionCard.tsx` joins that line under
  the card. For the TC variant the window is the TC detail's 90 min (`windowEnd`), so its wording
  should say so rather than "2 hours".
- Status: done (5665a6e): `noServiceText`

## `enabled` and `refetchInterval` options on useStop, useRoute, useTransitCenter
- From: A (D2 TC card, saved row, D3 cards, D6)
- Where: src/api/hooks.ts
- Need: these hooks fetch unconditionally, so optional fetches are done by rendering a child
  component only when needed (`WithTransitCenter` in home/Home.tsx, `WithIdleRoute` in
  home/SavedRow.tsx, `CardWithDetail` in home/DirectionCard.tsx). An `enabled` flag would allow plain hooks.
  `useStop` also polls every 30 s, but D6 needs `/stops/:id` once (spec D6 Data): its times come
  from the 20- and 4-arrival polls. `useStop(id, { refetchInterval: false })` would stop the third poll.
- Status: done (5665a6e)

## A shared client stop lookup (/data/stops.json)
- From: A (D6 loading title, D3 side of street)
- Where: src/lib (MapView.tsx has a private `stopsById` loader)
- Need: `useClientStop(id)` so D6's loading state can show "Name (ID)" from the cached file (spec
  D6 States) and D3 can read `side` without a `/api/stops/:id` call per card. Today D6 falls back
  to the saved/recent name or "Stop #342", and D3 calls `useStop` for stops not in `/nearby`.
- Status: done (5665a6e): src/lib/stops.ts

## Map marker kind "place" (black pin)
- From: A (D4 place, D8 `fromName` origin)
- Where: src/map/scene.ts, MapView.tsx
- Need: spec D4 wants a black `place` pin labelled with the place; `markers[].kind` has no such
  kind, so D4/D8 use "destination" (red) for now.
- Status: done (21ce4f6)

## Button `external` names RideMETRO.org for every link
- From: A (D8 "Open in Google Maps ↗")
- Where: src/ui/Button.tsx
- Need: `external` always appends "(opens RideMETRO.org)". D8 works around it with `onPress`
  → `window.open`. Suggest an `externalLabel` prop (or a neutral "(opens in a new tab)").
- Status: done (21ce4f6): `externalLabel`

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
- Status: done (21ce4f6)

## Fold targets without markup selectors
- From: A (D2 M2/M3, D3, D6, D8: `home/useHalfUpTo.ts`)
- Where: src/app/layouts/ExploreChrome.tsx, src/ui/NearbyStopCard.tsx
- Need: the half-sheet hook finds the sheet with `closest("section[role=region]")` and card #1's
  first route row with `querySelector("li")`. Expose the sheet element (e.g. `useSheetBodyRef()`)
  and a `firstRowRef` prop on NearbyStopCard so the hook takes explicit refs.
- Status: done (21ce4f6): `useSheetElement()` and `NearbyStopCard.firstRowRef`

## BottomSheet: a half height below --sheet-half-min, and the FAB column at large text
- From: A (D3 at 360x640)
- Where: src/ui/BottomSheet.tsx, src/app/layouts/ExploreLayout.tsx
- Need: `minHalf` can only raise the half height (floor 340 dp), so three FABs (Locate, Plan Trip,
  "1 alert") don't fit under the search bar at 360x640, and at 412x800 they cost D3 its second
  card. D3 drops Locate whenever the alerts FAB shows (`routeFabs` in home/Home.tsx). At extra-large text the search bar grows to 2 lines and the top FAB still slides
  under it; the layout could hide the lowest-priority FAB when the column doesn't fit.
- Status: done (21ce4f6): ExploreLayout drops the lowest-priority FABs that don't fit; A's `routeFabs` removed

## DepTimes: the tooSoon word pushes "· 34 min" onto a line that starts with "·"
- From: A (D2/D3 cards, far-360, live-f1-412)
- Where: src/ui/DepTimes.tsx, TimeValue
- Need: "9:50 PM Leaves before you get there" wraps so the next line starts "· 34 min Live". Put the
  tooSoon word on its own line and keep the "·" attached to the next time (`white-space: nowrap`).
- Status: done (F0b): every time carries its own leading dot and the line is clipped, so no line starts with "·"

## Map: the highlighted stop looks like the rider's dot
- From: A (D6, D8, D3)
- Where: src/map/MapView.tsx (highlight and marker paint)
- Need: `highlightStopId` and `board` markers draw the same blue circle as the user dot, next to
  it. Draw a navy stop pin with the white "Stop: 342" callout (C.16). D4/D8 place markers use
  `board` until the "place" kind above exists.
- Status: done (F0b): the highlight is the large stop pin with the "Stop: 342" callout

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
- Status: done (5665a6e, 21ce4f6), except `Button.label` as a ReactNode (declined: labels stay plain strings for their accessible names)

## src/lib/text.ts (spec G.2 lists it; missing)
- From: B (D5, D9, D20)
- Where: src/lib/text.ts
- Need: re-export `tokenize` / `normalize` from `server/lib/text.ts`, so screens don't import server code directly.
- Status: no longer blocking B: `stopMatch.ts` now has its own small normaliser and imports no server code. (`src/lib/format.ts` and `src/lib/geo.ts` still import `server/lib/geo.ts`.)

## Shared stop-name lookup (or platform names in TC detail)
- From: B (D10)
- Where: src/lib (e.g. `stopName(id)` over `/data/stops.json`, shared with MapView's loader) or `getTransitCenterDetail` (add `platforms: {stopId, name}[]`)
- Need: the bay diagram labels platforms "Platform 2 · Stop #79" from the stop name, which the TC detail doesn't carry. B loads `/data/stops.json` (1.6 MB) itself in `screens/explore/tc/usePlatformNames.ts` (a second loader next to MapView's) until then. Preferred: `platforms: {stopId, name}[]` in `getTransitCenterDetail`, so a cold TC visit doesn't download every stop. B then deletes `usePlatformNames.ts`.
- Status: done (cecb86b): TC detail returns `platforms`

## Static routes list
- From: B (D20)
- Where: src/lib/routes.ts
- Need: export the loaded `ClientRoute[]` (e.g. `useAllRoutes()` with an error state), so D20 doesn't fetch `/data/routes.json` again through its own query. D20 now checks `res.ok`, shows ErrorState, and takes its badges from `routeRef()`.
- Status: done (5665a6e): `useAllRoutes()`

## SearchField focus ring
- From: B (D5)
- Where: src/ui/SearchField.module.css
- Need: the input draws a rectangular 3px focus ring inside the pill (visible in every D5 screenshot, since the input is autofocused). Put the ring on the pill with `.field:focus-within` and give the input `outline-offset: -3px` or a pill radius, without `outline: none`.
- Status: done (a0cb35a)

## Map attribution shows on pushed pages
- From: B (D9, D10)
- Where: src/app/AppShell.tsx / src/map/MapView.tsx
- Need: the MapLibre attribution ("OpenFreeMap © OpenMapTiles …") stays visible above the bottom nav on PageLayout screens after coming from Explore (seen on /explore/route/82). Hide it with the map. Cause: `.hidden` uses `visibility: hidden`, and MapLibre's compact attribution sets `visibility: visible` on itself; its `z-index: 2` then paints over `<main>`.
- Status: done (34fb41e); B's z-index wrappers removed

## useRoute enabled flag
- From: B (D5)
- Where: src/api/hooks.ts
- Need: `useRoute(id, { enabled })`, like `useArrivals`. B works around it by rendering the "82 montrose" shortcut's fetching child only for a known route.
- Status: done (5665a6e)

## BayDiagram: highlight several bays, and a spoken platform name
- From: B (D10)
- Where: src/ui/BayDiagram.tsx, `BayDiagramProps`
- Need: (1) `highlight?: string[]` (bay letters; or `{stopId, bay}[]` if letters can repeat across platforms). Route 85 at Northwest TC leaves from bays D and G; the banner names both but only D can be highlighted. (2) A separate spoken platform name per platform (e.g. `a11yLabel`), because the tile label is built from the visible "Platform 2 · Stop #79" and reads "Bay M, Platform 2 · Stop #79, routes 58" instead of C.14's "Bay M, platform 2, routes 58". B will pass every bay in `routeBays` and "platform 2".
- Status: done (21ce4f6)

## /routes/:id/next: two departures per stop
- From: B (D9)
- Where: server/services/routeNext.ts (`getArrivals(..., { limit: 1 })`), `RouteNext` type
- Need: `limit: 2` (e.g. `next: {departureTime} | null` plus `then: {departureTime} | null`, or `deps: {departureTime}[]`). A scheduled trip due this minute can't say "Now" (C.2), so the column would show a clock time among minutes. Until the second trip is available, D9 shows "–" for such a row (spoken "Leaving now. The next time will show shortly.").
- Status: done (cecb86b)

## Transit center detail repeats departures
- From: B (D10)
- Where: server/services/stopDetail.ts `getTransitCenterDetail`
- Need: the same trip can appear twice in one bay (Northwest TC bay G: trip 12065412 at 02:47:21Z twice, so "3 min Live · 3 min Live" and a React duplicate-key error). Probably two upstream sources (arrivals API + GTFS-RT) for one trip. Dedupe by `tripId + departureTime`. D10 now dedupes on the client too.
- Status: done (cecb86b): deduped on the server

## directionWord(label, lang) in lib/format.ts
- From: B (D5, D9, D10)
- Where: src/lib/format.ts
- Need: export the `dir.<label>` lookup that `headsignLine` already does inside, so B can delete `screens/explore/route/useDirectionWord.ts` (a duplicate of it).
- Status: done (5665a6e)

## Rail headsigns in headsignLine
- From: B (D10)
- Where: src/lib/format.ts `headsignLine`
- Need: rail headsigns read "METRORail - FANNIN SOUTH" / "METRORail -NORTH LINE TC". D9 strips the prefix (`routeGeo.ts displayHeadsign`); headsignLine (used for D10 rows and cards) should do the same.
- Status: done (5665a6e): `displayHeadsign`

## Spanish "andén" for bay in common.ts
- From: B (D10)
- Where: src/i18n/strings/common.ts (es `stopLine.bay`, `bay.tileA11y`)
- Need: "andén" means platform, so a bay is "bahía" (B's tc/search strings now say "bahía"; "andén" stays for platform). Change es `stopLine.bay` to "Bahía {bay}" and `bay.tileA11y` to "Bahía {bay}, {platform}, rutas {routes}".
- Status: done (5665a6e)

## Per-route schedule links
- From: B (D9)
- Where: scripts/build-gtfs.ts → `routes.json` / `RouteDetail`
- Need: a `scheduleUrl` per route. RideMETRO's per-route pages exist (e.g. `/riding-metro/transit-services/local-bus/route-details/82-westheimer`, which links the PDF), but the slugs are hand-made: the obvious `<number>-<long name>` slug works for 77 of 117 bus routes and 404s for Park & Ride, Curb2Curb, Community Connector, 500, 23 ("23-clay-west-43rd") and 99. D9 now links the service page (local bus / Park & Ride / METRORail, all verified) as "Schedules on RideMETRO.org ↗" instead of the old `/schedules` URL, which redirected to the home page.
- Status: declined: the GTFS has no per-route schedule URL; the link goes to the schedules page

## MapView: fit a scene only once the sheet has settled
- From: C (D12, D13)
- Where: src/map/MapView.tsx (scene application)
- Need: at the full snap the bottom padding leaves no room, so `fitBounds` throws "Map cannot fit within canvas" and the map keeps the old view; when the sheet then moves to half, the scene is not fitted again. Clamp the padding to the canvas and re-fit the current scene when the sheet height settles. C works around it with `useSettledSheetHeight()` (src/features/trip/scene.ts) in its scene deps; drop that once this lands.
- Status: done (21ce4f6): padding clamped, bounds refitted when the sheet settles; C's `useSettledSheetHeight` removed

## Scene labels clipped at the top edge
- From: C (D12, D13)
- Where: src/map/MapView.tsx (fit padding)
- Need: marker labels such as "Board 80 · #11424" sit above their pin and are cut off when the pin is on the top edge of the fitted bounds. Add the label height to the top fit padding.
- Status: done (F0b): the top fit padding is `safeTop + 108`

## StepList: badge and title on one line; leg colour without a badge; alert rows
- From: C (D12, D13 All steps)
- Where: src/ui/StepList.tsx, `TimelineStep` in src/ui/types.ts
- Need: on board rows the title wraps under the route badge at 360 px; keep the title inline and let it wrap beside the badge. The spec's wording is "BOARD [80] to MLK & PARK VILLAGE" (as on D11's card), so the badge sits after the verb: add an optional `titleLead` ("BOARD") rendered before the badge, and C will pass `titleLead` + title "to MLK & PARK VILLAGE" (today C's title is "Board to MLK & PARK VILLAGE" after the badge). Alight rows need the leg's colour on the rail without rendering a second badge (an optional `legColor` separate from `route`). C.13 also wants alerts as timeline rows: render a step with `alert` as an AlertBox-style row (warning icon, alert colours) that opens D15; C shows them as AlertBoxes under the list until then.
- Status: done (21ce4f6)

## Map: tell board and transfer pins from the rider (review C item 7)
- From: C (D11, D12, D13)
- Where: src/map (MapView / layers images)
- Need: `board` and `transfer` markers are drawn as the same blue dot as `origin` and the user dot, so "Board 80 · #11424" reads like "you are here". Draw `board`/`transfer`/`alight` as the navy stop pin with a white ring (like the highlighted pin, smaller), keep `origin` a dot. The top fit padding must also clear the search bar and a label above a pin at the top edge (F0b's `safeTop + 108` does; mod-C still has the F0a `top: 80`, so D11/D12 labels sit under the search bar there).
- Status: done (F0b): board/transfer/alight draw the white navy-ringed stop dot; padding as above

## Trip bar: a completed state on the Arrived step (review C item 18)
- From: C (D13)
- Where: src/app/layouts/ExploreLayout.tsx (trip bar), ExploreChrome options
- Need: on D13's Arrived step the layout still shows "● Trip in progress · arrive 11:00 PM" above "TRIP COMPLETE". Let D13 say so, e.g. `useExploreChrome({ tripBar: "complete" })` rendering "✓ Trip complete · arrived 11:00 PM" (or hiding the bar). C will pass it on the Arrived step.
- Status: done (34fb41e)

## LiveStrip: wrap instead of scrolling (review C item 5)
- From: C (D13 Wait step)
- Where: src/ui/LiveStrip.module.css
- Need: 4 departures with a clock time ("11:22 PM") overflow the strip at 360 and 412 (the 4th is cut), and in headless Chromium the overflowing `overflow-x: auto` strip paints a grey rectangle over the map canvas at a fixed screen position (bisected on D13 Wait: it goes away with 2 departures or no strip; the map scene is not involved). D6 can hit it too. Wrap the items (or cap them at what fits). C now passes at most 3 departures, clock times only when first, so D13 no longer overflows.
- Status: done (21fc99d): the strip wraps and is capped so it stays on one line

## "Other time ▾" as a small sheet (review C item 25)
- From: C (D11)
- Where: src/ui (a small modal sheet, or a BottomSheet variant)
- Need: the spec opens "Other time ▾" in a small sheet (datetime input + Leave at / Arrive by). There is no such component, so C shows an inline panel under the chips and scrolls it into view (it no longer forces the sheet to full).
- Status: declined for now: needs a design; C's inline picker stays

## Sheet: peek from half without dragging (review C item 26)
- From: C (D11 peek entry)
- Where: src/ui/BottomSheet.tsx
- Need: D11's peek ("( ▶ Start )" on the map) is reached by "Show map ▼ twice" in the spec, but at half the button reads "Show list ▲", so peek needs a swipe (WCAG 2.5.7 asks for a non-drag way). E.g. a "Show map ▼" at half that goes to peek when `allowPeek`.
- Status: done (21ce4f6): "Show map" button

## Pick mode: "My location" can omit `fromName` (review C item 23)
- From: C (D11)
- Where: src/lib/planQuery.ts `encodePick` (my-location)
- Need: D11 now writes the rider's location as `from=<lat,lon>` with no `fromName` and shows it as "My current location" in the current language, so switching to Spanish no longer leaves the English name. `encodePick` still writes `t("common.myLocation")`; C recognises that name in both languages, but dropping it would keep URLs language-free. Recent trips from the rider's location are now stored without `from` (they replay from wherever the rider is), which D16's `placeName` already shows as "My current location".
- Status: done (5665a6e)

## useWalk: accept a place as the destination
- From: C (D13 final walk)
- Where: src/api/hooks (useWalk)
- Need: `useWalk` only walks to a stop id; the last step walks from the alighting stop to a place (Hobby Airport). Accept a `LatLon` destination. C calls `/walk?from&to` itself in src/features/trip/useFinalWalk.ts until then.
- Status: done (5665a6e); C's `useFinalWalk` removed

## LiveStrip: a text variant
- From: C (D13 ride step)
- Where: src/ui/LiveStrip.tsx
- Need: the ride step shows "9 stops left · about 18 min" in the blue live strip (D13), which is text rather than departure times. Add a `children`/text variant so the strip's colours and padding come from one place; C uses a local `.rideStrip` style for now.
- Status: done (21ce4f6): `FactStrip`

## useLocation: a simulated moving fix for demos
- From: C (D13)
- Where: src/state/location.ts
- Need: the live trip demo moves the rider along the itinerary. A `setSimulatedFix(fix | null)` in the location store would move the shared "you" dot and every consumer; C passes its own simulated fix into useLiveTrip and draws a separate "You (simulated)" marker.
- Status: declined: C.16 shows the user dot only for a real fix; the demo keeps its own "You (simulated)" marker

## Pick mode should replace history; Directions can omit `from`
- From: C (D11, F3)
- Where: src/screens/explore/search (B's pick mode) and B's Directions button
- Need: after a pick, `navigate(encodePick(...), { replace: true })` so Back from the plan does not return to the search. The Directions URL can leave `from` out: D11 fills it from the fix and shows "Finding your location" or the location-off state itself.
- Status: done in module B

## Landmarks: expose their nearest stop ids
- From: C (D11 landmark note)
- Where: src/api (landmark data)
- Need: D11's "Hobby Airport: buses stop at …" note finds the stops through a search lookup's `nearbyStops`; the landmark record itself should carry them so the planner does not need a second request.
- Status: declined: the search lookup already returns `nearbyStops` in the same request

## Hidden map's attribution shows on top of tab and page screens
- From: D (D17 Fares, also Recent, More, Alerts)
- Where: src/app/AppShell.tsx / src/map (MapLibre attribution control)
- Need: after visiting Explore, "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" and its (i)
  button stay visible over the bottom of /fares, /recent, /more (the map is `visibility: hidden`,
  but the attribution control still paints above the Frame). Hide it with the map, or give the
  Frame a stacking context above the map layer.
- Blocks F9: reached from Explore, the attribution covers "Seniors 70 and older · Free" at 412x800
  and "Transfers" at 360x640 (re-checked on mod-D after the review fixes). F9 can't be scored as
  delivered until this lands.
- Status: done (34fb41e)

## AlertBox: route badges and dates without the description (D14 list)
- From: D (D14 Service Alerts)
- Where: src/ui/AlertBox.tsx
- Need: D14 items show route badges, effect + header and dates, but not the long detour
  description (METRO's are 10+ lines). Today D14 renders a badges + dates line above the
  `compact` box itself; an AlertBox `routes` slot, or a variant that keeps dates and drops only
  the description, would let the box own that layout.
- Review (D fix round): the two-block item was flagged against the spec ("⚠ [82] Stop moved …" in
  one box). Proposed API: `routes?: RouteRef[]` (badges before the effect word, "+N" past 6) and
  `compact="list"` (drops only the description, keeps the dates). D14 will then render one
  `<AlertBox routes={alertRouteRefs(a)} compact="list" …/>` and drop its `.meta` row.
- Status: done (21ce4f6, 21fc99d)

## Group /arrivals into SavedStopRow routes in src/lib
- From: D (D16 Recent)
- Where: src/lib (new helper), used by src/ui/SavedStopRow callers
- Need: `savedStopRoutes(arrivals: Arrival[]): SavedStopRoute[]` (one entry per route and
  direction). D16 has a local copy in screens/recent/SavedStops.tsx; module A's Explore saved row
  needs the same grouping. Also: when the preferred route has no departure in the window, C.5b
  wants it shown with "No buses in the next 3 hours", which needs its direction and headsign
  (not in an empty /arrivals answer), so the helper could take the stop's serving patterns.
- Update: D16 now groups one entry per route (canonical id, first direction) and keeps a
  preferred route with no departure (its own `?route=` call, then routes.json for the direction
  and headsign). The helper should do the same so Explore's saved row matches.
- Status: done (5665a6e): src/api/savedStop.ts

## useAlerts(): expose when the alerts were fetched
- From: D (D14 footer "Source: METRO · Updated 1 min ago")
- Where: src/api/alertsStore.ts
- Need: an `updatedAt` field. D14 reads `queryClient.getQueryState(keys.alerts()).dataUpdatedAt` today
  (Alerts.tsx); switch to the store field once it exists.
- Status: done (5665a6e): `updatedAt`

## formatDateRange with a start time (D15)
- From: D (D15 Alert detail)
- Where: src/lib/format.ts
- Need: D15's spec line is "From Sep 25, 5:00 AM until Oct 3"; `formatDateRange` has no time.
  An `{ withTime: true }` option for the start would match it. D15 shows the date-only form now.
- Status: done (5665a6e): `withTime`

## SegmentedControl: per-option label size (Welcome A / A+ / A++)
- From: D (D1 Welcome)
- Where: src/ui/SegmentedControl.tsx
- Need: D1 draws the text-size glyphs at 16 / 18 / 21sp. Screens can't restyle components, so
  Welcome shows "A", "A+", "A++" at one size with "Standard / Large / Extra large" under them.
- Proposed API: `SegmentedOption.labelSize?: "body" | "large" | "xlarge"` (16 / 18 / 21sp), or
  `label: ReactNode`.
- Status: done (21ce4f6): `labelSize`

## AlertStatusLine retry loop when a screen mounts it only on error
- From: D (D14, D15)
- Where: src/api/alertsStore.ts / src/ui/AlertStatusLine.tsx
- Need: with no cached alerts, a refetch resets the query to `loading` (TanStack v5 clears
  `status` while there is no data), and a newly mounted observer retries an errored query. A
  screen that renders AlertStatusLine only in the error branch therefore loops (error → mount →
  refetch → loading → unmount) about once a second. D14/D15 now keep it mounted for loading and
  error alike; `retryOnMount: false` on the alerts query (the store already has `retry()`) would
  make the component safe to use either way.
- Status: done (5665a6e): `retryOnMount: false`

## DemoTag component (D15, and AlertBox's own tag)
- From: D (D15 Alert detail)
- Where: src/ui (new `DemoTag`, used by AlertBox)
- Need: D15 wants the "Demo" tag beside the effect word. Screens can't restyle, so D15 shows the
  warn caption "Demo alerts only" instead. A shared `DemoTag` (AlertBox's `.demo` style) would let
  D15 show the same tag as the list.
- Status: done (21ce4f6)

## Share the static stops/routes loaders (src/lib)
- From: D (D14 My routes, D15 affected stops, D16 preferred route)
- Where: src/lib (with src/map/MapView.tsx `stopsById` and src/lib/routes.ts `loadRoutes`)
- Need: `useStops()` (stop id → ClientStop from /data/stops.json) and the route directions per
  stop from /data/routes.json. D keeps a local copy in screens/alerts/staticData.ts; MapView and
  routes.ts each fetch the same files privately. One loader per file would parse each once.
- Status: done (5665a6e)

## routeRefOrFallback in src/lib/routes.ts
- From: D (D14, D15, D16)
- Where: src/lib/routes.ts
- Need: a RouteRef for a route known only by id and name (saved/recent routes, GTFS-RT alert
  routes with no text colour) before or without routes.json. D has `routeRefOr()` in
  screens/alerts/routeRefs.ts; Explore and the planner may want the same.
- Status: done (5665a6e)

## ListRow: `lang` and a greyed disabled radio (D19 Coming soon languages)
- From: D (D19 Settings)
- Where: src/ui/ListRow.tsx, ListRow.module.css
- Need: the spec's disabled "Coming soon" radio rows need `lang`/`dir` on the label and a greyed
  circle and sub-label when disabled (today the circle matches an enabled one and the sub is
  darker than the label). Until then D19 lists them in one "Coming soon: …" note.
- Status: declined: D19's note line keeps Text size above the fold

## Tab pages on the page background (TabLayout)
- From: D (D16 Recent, D17 Fares, D22 not found)
- Where: src/app/layouts/TabLayout.tsx
- Need: TabLayout's Frame is `surface` (white), so its `padding-bottom` shows a white strip under
  pages that now use `--c-background` like today's app. `background="background"` fixes it.
- Status: done (34fb41e)

## Button: `danger-outline` (End on the live trip's bar)
- From: live trip (D13), tucked sheet
- Where: src/ui/Button.module.css, src/ui/types.ts
- Need: End on the tucked trip bar stands alone at the right of the arrival time, as Google Maps
  has it. `danger-text` read as a link there; a surface pill with the alert text colour and
  `--c-alert-border` reads as a button and stays clearly destructive. It asks before ending.
- Status: done
