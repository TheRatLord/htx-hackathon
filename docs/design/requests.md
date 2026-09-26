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
