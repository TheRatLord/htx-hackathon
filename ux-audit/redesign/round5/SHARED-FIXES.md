# Round 5: shared-layer fixes

Owner: shared layer (src/ui, src/map, src/app, src/lib, src/state, src/api, src/styles, i18n common, server/, shared/).
Checks: `npm run typecheck`, `npm run typecheck:web` and `npm test` (178 tests, including new `src/map/placement.test.ts` and `clockRow` tests) all pass. `flows.spec.ts` passes 49/49 unchanged, and the full `screens.spec.ts` set was re-shot. Screen fixers: read the "Left for screen fixers" section at the end.

## Map (02, 03, 05, 06, 07, 24, 25, 26, 38, 40, 42, 44, 46)

- **Every tag points at its own pin.** Stop-ID chips (`stops-label-near`) and scene labels (`scene-labels`: board, transfer, bay and route-near markers) now use chips with a pointer toward the pin or ring (`label-chip-down|up|left|right` in `map/layers/images.ts`). Tags go **above** first, then below, left and right, and no longer use the corner slots, which had no pointer. The offsets were retuned, so a chip no longer covers half of its own pin (★2958 on 03).
- **Only the sheet's stops are tagged.** When a scene sets `tagStopIds`, only those stops get chips. Unlisted stops such as 3425 and 3426 are no longer tagged unless the sheet lists them. A listed stop's pin is a hard obstacle, so no other chip can cover it. Both chip layers use allow-overlap, because MapView has already placed them clear of other items and MapLibre's own collision test was dropping listed chips (3340 at 412).
- **Pins next to the chrome.** A pin within 24px of the search bar or a FAB is left out. A listed pin that close is nudged into view instead (`CHROME_GAP_BOX`), which fixes 259 touching Plan Trip on 02, 38, 40 and 42.
- **Scene label placement.** When no side is fully clear, the label takes the side that crosses the fewest line boxes, not the first side. Spanish "Transbordo · #4789" no longer sits on the 80 line (44).
- **Leg route chips ([80], [73]) are placed before the marker labels.** Each chip tries 50%, 35%, 65%, 25% and 75% along its leg, so both chips now show in Spanish (44), as in English (24).
- Scene labels wrap at 20em instead of 10em, so "Northwest TC · Bay M" fits on one line if the screen still sends that text.
- **Map attribution (i).** It is hidden whenever less than 440px of map is visible, which covers every half-height sheet, so it no longer sits over the park on 07, 12, 24 and similar screens. It still shows when the map is the main view (Show map, peeked sheet).
- Walk legs were already drawn dotted. The solid "hook" at Hobby on 24 and 25 is the 73 bus's own loop to stop #10567, because the landmark is the stop itself (see below).

## Components

- **`DepTimes`: one format per row** (06, and every card). The new `clockRow` in `lib/format.ts` applies these rules:
  - If the first bus is under 30 min away, the row shows minutes, and a later bus an hour or more away is left off. For example, "2 min" instead of "2 min · 1:02 PM".
  - If the first bus is 30 min or more away, every time in the row is a clock time ("1:00 PM · 2:00 PM").
  - The card's spoken summary uses the same rule.
- **`TimeValue`**: clock times off the strip use a small "PM" (38, offline). The new `clock` prop forces a clock time.
- **`NearbyStopCard`**: `titleSuffix` (the direction) now goes on the grey side line: "Northbound · East side of Main St". The title is only the stop name and ID (07, 03).
- **`stopTitle`**: a cross street of 20 characters or fewer never wraps. You get "Fannin St @ / McKinney St (246)", never "McKinney / St (246)" (es-home-360).
- **`RouteBadge` sm**: at least 3 digits wide at every text size, so headsigns beside [137] and [51] start at the same x (46).
- **`WalkButton`**: always says "walk" under the minutes, including at Extra large. A bare "1 min" above the bus times read as a bus time (46).
- **`Fab` Plan Trip at Extra large, under 400px wide**: the icon now sits above a small two-line "Plan Trip" label. It is no longer an icon-only button (46).
- **`UpdatedAgo compact`** (sheet title row, Home and Stop): now a single "↻ Just now" / "↻ Ahora" button. Its accessible name is "Refresh. Just now". In Spanish at 360 it no longer takes its own row, and the title row has two controls instead of three (02, es-home-360).
- **"Also here: [11] ›"**: now one full-width row with the chevron at the right edge (02).
- **`AlertBox`**: advisories (Less frequent service, Accessibility, Extra service, general notice) have a navy edge and an ⓘ. Service changes (Detour, Stop moved, No service, Delays, Service change) stay red with ⚠. See `isAdvisory(effect)` in `lib/alerts.ts` (28, 45). The new `info` icon is in `Icon.tsx`.

## Code-review defects

- `api/hooks.ts`: `useStableAnchor(p, radiusM)` is now **exported**. `useWalk` anchors its origin at 40 m, so a new /walk request (and OSRM call) is made only after the rider moves 40 m. It also keeps the last route to the same stop as placeholder data, so the line no longer blinks out on each new fix.
- `api/savedStop.ts`: if the preferred route's own query fails, the route now falls back to its routes.json row, where before it stayed a skeleton for good. The hook also returns `own`, so a screen can offer "Try again".
- `state/walkDistance.ts`: the cache is capped at 500 entries and drops the oldest first.
- `lib/stops.ts`: `useStops` retries a failed stops.json load on the `online` event and every 15 s.
- `server`: TripUpdates and the OData arrivals feed now back off for 45 s after a failure, through `failureBackoff` in `lib/upstream.ts`. /arrivals starts both feeds at the same time. The rate limiter now:
  - honours X-Forwarded-For only with `TRUST_PROXY=1`, taking the right-most hop;
  - keeps one bucket per endpoint, not per URL;
  - also covers /nearby and /stops/*, with a larger budget for polled GETs (burst 90, 240 a minute; /plan, /search and /walk stay at 30 and 60).
- Dead exports removed: `labelSize`, `RecentSearch`, `RecentTrip`, `SavedRoute`, `ButtonVariant`, `DialogAction`, and the re-exports of `DataSource` and `Cardinal` from api/types. `midpoint` is replaced by `pointAlong(coords, f)`.

## Left for screen fixers (not in my files)

- **06 ranking** (`home/routeNear.ts`): rank by the earliest bus the rider can catch. The times are now one format per row, but the TC card still comes first. For "NW TC", shorten `shortTc` so the tag text is short.
- **RouteNearYou.tsx:99**: the scene deps and bounds use the raw `origin` (GPS jitter re-fits the camera). Use `useStableAnchor(origin)` from `api/hooks.ts`, which is now exported, or the /nearby anchor.
- **Walk.tsx:133**: key the scene focus on `stopId` plus "has data", not on `osrm.data` identity. `useWalk` now changes data only once per 40 m move.
- **search/EmptyQuery.tsx**: use `useSavedStopRoutes(stop)` and delete `search/savedRoutes.ts`, so saved rows match Explore and Recent.
- **LiveTrip.tsx endFromDialog**: clear the popstate listener and the 300 ms timer on unmount.
- **Plan (22, 24, 44)**:
  - Make the arrival time the bold number on each card.
  - Draw the transfer walk leg consistently.
  - Add bottom padding equal to the footer height, so "Get off at …" is not sliced.
  - Change step 1's title to "Walk 5 min to #11424".
  - Consider v2.71's chip row for sort options.
  - The final walk to the Hobby terminal is missing because the landmark `hobby-airport` is the bus stop itself (`server/data/landmarks.json`). Changing it would invalidate the recorded plan fixtures (their key includes the destination coordinates), so I left it as is.
- **Plan form (21, 21-360)**: open with a taller sheet so at least two popular places show, and put saved or recent places first.
- **Route 82 (17, 18)**: label the bus position, grey the stops it has passed, and keep one stop-name form in both collapsed and expanded rows.
- **TC (19, 20)**: order the chips by next departure, drop the repeated "Platform 1", add the headsign line, and drop Refresh on scheduled data.
- **Live trip (27)**: show one "Your bus: 11 min · 12:15 PM" instead of the three-time strip.
- **Alert banners elsewhere** (ItineraryCard, NextBus, AlertDetail) still hard-code ⚠ in red. Use `isAdvisory(alert.effect)` for the same red/navy rule as AlertBox.
- **Capture clock drift** (harness, `tests/e2e/fake-now.mjs`): the API clock runs on during the 5-minute capture. Freezing it per shot is a test-harness change.
