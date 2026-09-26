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
- Status: open
