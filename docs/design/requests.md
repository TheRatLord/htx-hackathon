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

## MapView: fit a scene only once the sheet has settled
- From: C (D12, D13)
- Where: src/map/MapView.tsx (scene application)
- Need: at the full snap the bottom padding leaves no room, so `fitBounds` throws "Map cannot fit within canvas" and the map keeps the old view; when the sheet then moves to half, the scene is not fitted again. Clamp the padding to the canvas and re-fit the current scene when the sheet height settles. C works around it with `useSettledSheetHeight()` (src/features/trip/scene.ts) in its scene deps; drop that once this lands.
- Status: open

## Scene labels clipped at the top edge
- From: C (D12, D13)
- Where: src/map/MapView.tsx (fit padding)
- Need: marker labels such as "Board 80 · #11424" sit above their pin and are cut off when the pin is on the top edge of the fitted bounds. Add the label height to the top fit padding.
- Status: open

## StepList: badge and title on one line; leg colour without a badge
- From: C (D12, D13 All steps)
- Where: src/ui/StepList.tsx
- Need: on board rows the title ("Board [80] to MLK & Park Village") wraps under the route badge at 360 px; keep the title inline and let it wrap beside the badge. Alight rows need the leg's colour on the rail without rendering a second badge (an optional `legColor` separate from `route`).
- Status: open

## useWalk: accept a place as the destination
- From: C (D13 final walk)
- Where: src/api/hooks (useWalk)
- Need: `useWalk` only walks to a stop id; the last step walks from the alighting stop to a place (Hobby Airport). Accept a `LatLon` destination. C calls `/walk?from&to` itself in src/features/trip/useFinalWalk.ts until then.
- Status: open

## LiveStrip: a text variant
- From: C (D13 ride step)
- Where: src/ui/LiveStrip.tsx
- Need: the ride step shows "9 stops left · about 18 min" in the blue live strip (D13), which is text rather than departure times. Add a `children`/text variant so the strip's colours and padding come from one place; C uses a local `.rideStrip` style for now.
- Status: open

## useLocation: a simulated moving fix for demos
- From: C (D13)
- Where: src/state/location.ts
- Need: the live trip demo moves the rider along the itinerary. A `setSimulatedFix(fix | null)` in the location store would move the shared "you" dot and every consumer; C passes its own simulated fix into useLiveTrip and draws a separate "You (simulated)" marker.
- Status: open

## Pick mode should replace history; Directions can omit `from`
- From: C (D11, F3)
- Where: src/screens/explore/search (B's pick mode) and B's Directions button
- Need: after a pick, `navigate(encodePick(...), { replace: true })` so Back from the plan does not return to the search. The Directions URL can leave `from` out: D11 fills it from the fix and shows "Finding your location" or the location-off state itself.
- Status: open

## Landmarks: expose their nearest stop ids
- From: C (D11 landmark note)
- Where: src/api (landmark data)
- Need: D11's "Hobby Airport: buses stop at …" note finds the stops through a search lookup's `nearbyStops`; the landmark record itself should carry them so the planner does not need a second request.
- Status: open
