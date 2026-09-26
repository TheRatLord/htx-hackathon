# Round 4: shared-layer fixes

Scope: `pwa/src/{ui,map,app,lib,state,api,styles}`, `src/i18n/strings/common.ts`, `server/`, `shared/`.
Verification: `npm run typecheck` and `typecheck:web` are clean, and `npm test` passes (170/170).
`screens.spec.ts` passes 54/54 (shots re-checked on API 8796 / web 5186). `flows.spec.ts` passes
45/49. The 4 failures are only goal *wording* that this round changes on purpose (see "Needs
follow-up" 1).

## What changed (and what screen fixers get for free)

### Cross-screen consistency
- **Back is "‹ Back" on every sheet** (`ui/SheetHeader.tsx`). Before, 05, 06, 16, 21, 22, 23, 24
  and 26 showed a lone chevron. Now Back and the Show list / Show map toggle share a row above the
  title, and the title gets the full width (so "(342)" no longer ends up alone on a line in 16).
  With an overline and Back together, the overline row sits under the Back row. Without Back, the
  header is unchanged. Cost: start-aligned sheets use one extra title line (about 32px). Plan (22-360)
  and itinerary screens should check their fold.
- **Side line is "West side of Fannin St"** everywhere. `sideLine()` no longer adds "On the"; the
  `sideOn.*` strings are removed. In Spanish it reads "Lado oeste de …".
- **Walk pill from a place reads "4 min / walk"** (`ui/WalkButton.tsx`). The three-line "walk from
  the museum" is gone; the accessible name still says "from Houston Museum…". The unused
  `card.walkFromSub` string is removed. **Place screen:** say "walk times from the museum" once, in
  the overline, if you want it visible.
- **Extra large text** (`ui/cards.module.css`, `WalkButton.module.css`): the walk pill shows only
  "🚶 1 min" (the "walk" word stays in the accessible name). The side line spans the card's full
  width under the title and pill, so it no longer wraps ("West side of Fannin / St", 46).
- **Plan Trip FAB** is icon-only at Extra large on screens narrower than 400dp, and keeps its label
  as its accessible name (46: it covered 40% of the map strip).
- **"Also here: [11] ›"**: the chevron now sits right after the last chip.
- **Legend** (`ui/Legend.tsx`): the Live sample word is now white next to the green arcs, which is
  easier to read on the blue. There is a new optional prop, `present?: ("live" | "canceled")[]`.
  → **Stop screen:** pass the kinds on screen, e.g.
  `<Legend present={[...(anyLive ? ["live"] : []), ...(anyCanceled ? ["canceled"] : [])]} />`. It
  then renders nothing when every time is scheduled (13). Leaving the prop out keeps all three.
- **New string `common.walkMin`**: "Walk {min}" / "Caminar {min}". → **Stop screen (47):** use it
  for the compact walk button instead of the bare "2 min".

### Map (`src/map/`, new `placement.ts`)
- **A listed stop is never left under the chrome.** After a scene settles, MapView nudges the map
  once (`panBy`, at most 160px) when a `tagStopIds` stop sits under Plan Trip, Locate or the search
  bar. The nudge also keeps the rider's dot and the other listed stops on the map strip. It fixes 42
  ("Planear viaje" hid 567) and the 02/38/40 overlap. It runs once per scene or sheet snap, never
  after the rider's own pan.
- **Stop-ID chips choose their own side.** The chips of the listed and nearest stops now have
  their own source. Each chip goes below, above, left, right or at a lower corner of its pin: the
  first side that is clear of the sheet, the chrome, the markers, the rider's dot and other chips,
  and preferably of other stop pins and the route or trip lines. The "567" chip no longer covers
  the next stop's pin (02 now shows "259" beside it). 2958 (03) and 688 (07) are now tagged: their
  old chip box needed room both above and below the pin.
- **A saved stop's chip shows a star** ("★ 2958") on every screen. It reads `useSaved()`, so
  screens don't need to change.
- **Scene labels** ("Board 80 · #11424", "Transfer · #4789") are placed the same way. They try above
  first, then the corners, the sides and below. Each label keeps clear of the sheet, chrome and
  markers, and preferably of the trip's lines. A label with no clear side is left out, not clipped:
  the empty white box at 24-360 is gone. "Transbordo" no longer lies on the route line (44).
- **Ride leg labels:** `MapScene.legs[].label` (new, optional) draws a chip halfway along a ride leg.
  → **Trip/plan owner (`src/features/trip/scene.ts`, `itineraryLegs`):** add
  `label: l.route.name` to ride legs when the itinerary has two or more rides. The chips then show
  where the 80 ends and the 73 begins (25).
- Walk legs were already dotted (`scene-walk`). In the Hobby trip the first walk is about 10px long
  and the final walk is 0m (see "Needs follow-up" 3), so the maps on 24 and 25 look solid.
- Code quality: labels are placed from a grid index of stops, not a full scan of all 8,797 stops on
  each move. `rankLabels` checks that the map is still mounted before it touches it.

### App shell
- **MapLibre is lazy-loaded** (`app/AppShell.tsx`: `React.lazy` for MapView). The 1.05 MB maplibre
  chunk (285 kB gzipped) and its 70 kB CSS are no longer preloaded by `index.html`, so Welcome,
  Fares, Recent and More start faster.

### Server
- **No stale "live" data.** `fetchUpstream` falls back to a recorded fixture only for transitous,
  photon and osrm. `metro-alerts`, `metro-tripupdates` and `metro-odata` never fall back (new
  `allowFixtureFallback` option), so an alerts outage now reads "unavailable" instead of showing
  recorded alerts as current. `OFFLINE=1` still serves fixtures.
- **METRO keys go in the `Ocp-Apim-Subscription-Key` header**, not the URL. All three endpoints
  were checked: each returns 200.
- **/vehicles** returns `reason: "no-key" | "offline" | "upstream"`. `useVehicles` stops polling
  only for no-key or offline. On an upstream failure it retries every 60s, where one timeout used to
  end live buses for the whole ride.
- **CORS** is limited to localhost plus `CORS_ORIGINS` (a comma-separated list; a new config
  entry).
- **Per-client rate limiting** on `/plan`, `/search`, `/walk` and `/arrivals`: bursts of 30, then 60
  a minute. Loopback callers with no proxy header (the Vite proxy, e2e runs) and in-process tests
  are not limited.
- **/search** is cached for only 15s when it has warnings ("Address search is unavailable").
- **Straight-line walk estimate** uses `WALK_SPEED_MPS.normal`, not a second 1.3 m/s constant.

## Needs follow-up (outside my files)

1. **QA/integration: update the flow goal wording** in `tests/e2e/flows.spec.ts`, spec C.5a / D2 /
   D4 and the E goals. Change "On the west side of Fannin St" to "West side of Fannin St" (F10,
   line 106), "On the north side of Lamar St" to "North side of …" (F1, line 146), "On the west side
   of M L King Blvd" to "West side of …" (F8, line 319), and in F11 (line 351) "On the east side of
   Main St" to "East side of …" and `/walk from the museum/` to `/4 min/` (or to the place overline
   text, if the place screen adds "walk times from the museum"). Without these edits, F1, F8, F10
   and F11 fail on wording alone.
2. **QA harness: freeze the API clock per capture.** `tests/e2e/fake-now.mjs` starts at `E2E_NOW`
   and keeps running, so times drift 1–2 min between shots (2958: 9 → 8 → 7 → 5 min). Re-apply the
   file's time before each shot (write NOW_FILE in `shoot()` before `launch`), or add a frozen mode.
   `tests/` is not in my scope.
3. **Plan screen (22):** the Hobby trip ends at stop #10567 with a 0m final walk. That is true: the
   landmark's point and stop 10567 are both at the terminal curb (Transitous returns `WALK 0 m`).
   Don't invent a walk. Instead, change `plan.landmarkStop` ("Arrive at bus stop #10567") to
   something like "Hobby Airport · bus stops at the terminal". Also yours: "Fastest" → "Arrives
   first" (or lead each card with the arrival time), one alert banner instead of one per card, text
   only (no chip) in the Board line, and moving Sort onto the summary's Edit row.
4. **Itinerary (24/44):** the step time column squeezes the step text. Moving the time onto the grey
   line ("12:09 PM · Walk 5 min · #11424 · west side") is a screen change (`StepList` is shared, but
   the row content comes from `features/trip/timeline.ts`). Ask me if the `StepList` layout itself
   should change.
5. **Route near you (06):** ranking the TC card above 8249 is a screen change. Rank by the earliest
   bus the rider can catch.
6. Not done: the knip dead exports in `screens/` (`routeGeo.nearestIndex`,
   `groupResults.isCornerQuery`) and `scripts/gtfs/source.ts GTFS_URL`; the LiveTrip camera refit,
   double vibrate and dialog history; StopSheet's duplicate polling; and the Search/TC i18n gaps.
   All of them are in screen files.
