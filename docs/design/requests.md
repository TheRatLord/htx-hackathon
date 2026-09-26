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

## Hidden map's attribution shows on top of tab and page screens
- From: D (D17 Fares, also Recent, More, Alerts)
- Where: src/app/AppShell.tsx / src/map (MapLibre attribution control)
- Need: after visiting Explore, "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" and its (i)
  button stay visible over the bottom of /fares, /recent, /more (the map is `visibility: hidden`,
  but the attribution control still paints above the Frame). Hide it with the map, or give the
  Frame a stacking context above the map layer.
- Status: open

## AlertBox: route badges and dates without the description (D14 list)
- From: D (D14 Service Alerts)
- Where: src/ui/AlertBox.tsx
- Need: D14 items show route badges, effect + header and dates, but not the long detour
  description (METRO's are 10+ lines). Today D14 renders a badges + dates line above the
  `compact` box itself; an AlertBox `routes` slot, or a variant that keeps dates and drops only
  the description, would let the box own that layout.
- Status: open

## Group /arrivals into SavedStopRow routes in src/lib
- From: D (D16 Recent)
- Where: src/lib (new helper), used by src/ui/SavedStopRow callers
- Need: `savedStopRoutes(arrivals: Arrival[]): SavedStopRoute[]` (one entry per route and
  direction). D16 has a local copy in screens/recent/SavedStops.tsx; module A's Explore saved row
  needs the same grouping. Also: when the preferred route has no departure in the window, C.5b
  wants it shown with "No buses in the next 3 hours", which needs its direction and headsign
  (not in an empty /arrivals answer), so the helper could take the stop's serving patterns.
- Status: open

## useAlerts(): expose when the alerts were fetched
- From: D (D14 footer "Source: METRO · Updated 1 min ago")
- Where: src/api/alertsStore.ts
- Need: an `updatedAt` field. D14 reads `queryClient.getQueryState(keys.alerts()).dataUpdatedAt` today.
- Status: open

## formatDateRange with a start time (D15)
- From: D (D15 Alert detail)
- Where: src/lib/format.ts
- Need: D15's spec line is "From Sep 25, 5:00 AM until Oct 3"; `formatDateRange` has no time.
  An `{ withTime: true }` option for the start would match it. D15 shows the date-only form now.
- Status: open

## SegmentedControl: per-option label size (Welcome A / A+ / A++)
- From: D (D1 Welcome)
- Where: src/ui/SegmentedControl.tsx
- Need: D1 draws the text-size glyphs at 16 / 18 / 21sp. Screens can't restyle components, so
  Welcome shows "A", "A+", "A++" at one size with "Standard / Large / Extra large" under them.
- Status: open

## AlertStatusLine retry loop when a screen mounts it only on error
- From: D (D14, D15)
- Where: src/api/alertsStore.ts / src/ui/AlertStatusLine.tsx
- Need: with no cached alerts, a refetch resets the query to `loading` (TanStack v5 clears
  `status` while there is no data), and a newly mounted observer retries an errored query. A
  screen that renders AlertStatusLine only in the error branch therefore loops (error → mount →
  refetch → loading → unmount) about once a second. D14/D15 now keep it mounted for loading and
  error alike; `retryOnMount: false` on the alerts query (the store already has `retry()`) would
  make the component safe to use either way.
- Status: open
