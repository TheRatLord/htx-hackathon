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

## StepList: badge and title on one line; leg colour without a badge; alert rows
- From: C (D12, D13 All steps)
- Where: src/ui/StepList.tsx, `TimelineStep` in src/ui/types.ts
- Need: on board rows the title wraps under the route badge at 360 px; keep the title inline and let it wrap beside the badge. The spec's wording is "BOARD [80] to MLK & PARK VILLAGE" (as on D11's card), so the badge sits after the verb: add an optional `titleLead` ("BOARD") rendered before the badge, and C will pass `titleLead` + title "to MLK & PARK VILLAGE" (today C's title is "Board to MLK & PARK VILLAGE" after the badge). Alight rows need the leg's colour on the rail without rendering a second badge (an optional `legColor` separate from `route`). C.13 also wants alerts as timeline rows: render a step with `alert` as an AlertBox-style row (warning icon, alert colours) that opens D15; C shows them as AlertBoxes under the list until then.
- Status: open

## Map: tell board and transfer pins from the rider (review C item 7)
- From: C (D11, D12, D13)
- Where: src/map (MapView / layers images)
- Need: `board` and `transfer` markers are drawn as the same blue dot as `origin` and the user dot, so "Board 80 · #11424" reads like "you are here". Draw `board`/`transfer`/`alight` as the navy stop pin with a white ring (like the highlighted pin, smaller), keep `origin` a dot. The top fit padding must also clear the search bar and a label above a pin at the top edge (F0b's `safeTop + 108` does; mod-C still has the F0a `top: 80`, so D11/D12 labels sit under the search bar there).
- Status: open

## Trip bar: a completed state on the Arrived step (review C item 18)
- From: C (D13)
- Where: src/app/layouts/ExploreLayout.tsx (trip bar), ExploreChrome options
- Need: on D13's Arrived step the layout still shows "● Trip in progress · arrive 11:00 PM" above "TRIP COMPLETE". Let D13 say so, e.g. `useExploreChrome({ tripBar: "complete" })` rendering "✓ Trip complete · arrived 11:00 PM" (or hiding the bar). C will pass it on the Arrived step.
- Status: open

## LiveStrip: wrap instead of scrolling (review C item 5)
- From: C (D13 Wait step)
- Where: src/ui/LiveStrip.module.css
- Need: 4 departures with a clock time ("11:22 PM") overflow the strip at 360 and 412 (the 4th is cut), and in headless Chromium the overflowing `overflow-x: auto` strip paints a grey rectangle over the map canvas at a fixed screen position (bisected on D13 Wait: it goes away with 2 departures or no strip; the map scene is not involved). D6 can hit it too. Wrap the items (or cap them at what fits). C now passes at most 3 departures, clock times only when first, so D13 no longer overflows.
- Status: open

## "Other time ▾" as a small sheet (review C item 25)
- From: C (D11)
- Where: src/ui (a small modal sheet, or a BottomSheet variant)
- Need: the spec opens "Other time ▾" in a small sheet (datetime input + Leave at / Arrive by). There is no such component, so C shows an inline panel under the chips and scrolls it into view (it no longer forces the sheet to full).
- Status: open

## Sheet: peek from half without dragging (review C item 26)
- From: C (D11 peek entry)
- Where: src/ui/BottomSheet.tsx
- Need: D11's peek ("( ▶ Start )" on the map) is reached by "Show map ▼ twice" in the spec, but at half the button reads "Show list ▲", so peek needs a swipe (WCAG 2.5.7 asks for a non-drag way). E.g. a "Show map ▼" at half that goes to peek when `allowPeek`.
- Status: open

## Pick mode: "My location" can omit `fromName` (review C item 23)
- From: C (D11)
- Where: src/lib/planQuery.ts `encodePick` (my-location)
- Need: D11 now writes the rider's location as `from=<lat,lon>` with no `fromName` and shows it as "My current location" in the current language, so switching to Spanish no longer leaves the English name. `encodePick` still writes `t("common.myLocation")`; C recognises that name in both languages, but dropping it would keep URLs language-free. Recent trips from the rider's location are now stored without `from` (they replay from wherever the rider is), which D16's `placeName` already shows as "My current location".
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
