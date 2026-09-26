# Round 3: shared-layer fixes

These changes are in one commit on `pwa-redesign`, in `pwa/src/ui`, `src/map`, `src/app`, `src/lib`, `src/state`, `src/api`, `src/i18n` (common and index) and `server/`. Screens get most of them with no change of their own. The items under **TODO for screen fixers** need a change in a screen file.

A fresh set of shots, taken after these fixes, is in `ux-audit/redesign/round3/shared/` (the same names; these files are not committed). Both typechecks pass, `npm test` passes (168 tests), and the full Playwright run passes 103/103 (flows, rubric checks and the screenshot set) on ports 8796/5186.

## Stop cards (every home, route-near and place card)

- **One card shape everywhere (walk pill).** WalkButton is now the compact button from spec C.5a. It shows "🚶 **1 min**" over "walk" (14sp), or "walk from the museum" in place mode. It always sits at the **top right of the card head**, beside the stop name and the side line, on every card, at every width and text size. It never takes its own 95px row. The head is a new grid, `cards.head`, with a `cards.walkSlot` cell. NearbyStopCard, SavedStopRow, RouteDirectionCard and TransitCenterCard all use it. `cards.metaRow` is gone. The string keys `card.walkPill` and `card.walkFromPill` are now `card.walkSub` and `card.walkFromSub`. The accessible names are unchanged ("Walk to stop 342, 2 minutes").
  - At 360 a long stop name wraps beside the button ("Fannin St @ / McKinney St (246)"). The street name and number stay together.
- **Late-night rows (40).** A route whose next bus is after the 2-hour window now shows its **headsign line** ("SOUTHBOUND to DOWNTOWN TC"). The rows are **sorted by first departure** (11 at 4:20, then 52 at 5:12, then 51 at 5:57). The time uses the normal big time style, with one grey line under it: "**4:20 AM**" / "First bus · in 1 hr 50 min". The server's `laterFirst` values changed from an ISO string to `{ departureTime, directionLabel, headsign }`. Home already passes `laterFirst` straight through, so it needs no change.
- **Two times on every card.** `/nearby` now returns **3** departures per route and direction, so that when the card drops a bus the rider can't walk to in time, two times are still left ("23 min · 43 min" on 07, not a lone "23 min"). `/transit-centers/:id` gives every route at a bay up to 3 departures, looking up to 3 hours ahead, so an hourly route reads "55 min · 2:00 PM" (06, and the TC page). The 90-minute window (`windowEnd`) and its wording are unchanged.
- **TC card (04):** the headsign keeps its own line ("NORTHBOUND to GREENSPOINT TC"). The bay is a **Bay A** tag at the right end of the times row, so "TC · Bay A" no longer wraps onto a second line.
- **"Also here: [11] ›" (04):** mini route chips (the new `RouteBadge size="xs"`), with the chevron inline and centred on the text. The spoken label is still "Also here: Route 11". The new string is `card.alsoHereLabel`.

## Components

- **ChipRow "More ›" (19, 20):** it has no fill of its own now, so there is no white box on the lavender TC page.
- **Legend (13):** the Live sample already says "Live", so the extra "Live" label is gone. All three samples fit on one row at 412.
- **UpdatedAgo:** when there is no real fetch time yet (placeholder data, `dataUpdatedAt === 0`), it renders **nothing**. It no longer shows "Not updated for 29,000,000 min" or "times from 6:00 PM". This is the Home.tsx:179 defect, fixed in the component, so Home needs no guard.
- **Offline row in the sheet header (38):** it takes the sheet's full width on one line ("⚠ Offline — times from 12:04 PM · Try again"), and the ⌃ chevron stays on the title row, the same as the map banner on 39.
- **StepList (24, 44):** the step's duration is plain text at the end of its last grey line ("12:15 PM · 26 stops · 16 min"). There is no outlined box, so it no longer looks like a chip or button. Step detail lines are now `--c-text-variant`, so the bold title stands out.
- **AlertBox (28, 45, stop sheet):** the route chips (now `xs`) share the date line ("[5] From Sep 1"). They no longer take a row above the text. The ⚠ sits inline in the headline's first line, so there is no 40px hanging indent. The red edge and bold effect word are unchanged.
- **Dialog:** Android back closes the native dialog, and `onClose` runs once (before, it ran twice).

## Map

- **No stop under the map's own buttons.** Stop pins, notches and ID chips whose pin falls under the search bar, the overlay banner, the FAB column (Plan Trip, "Planear viaje") or the attribution (i) are **not drawn** until the rider pans. Plan Trip no longer covers a stop or leaves a tag with no pin (02, 02-360, 42, 46, 36's "Showing Downtown Houston" pill). The new function is `setCoveredStops` in `map/layers/transit.ts`.
- **Fits clear the FAB column.** `fitFocus` reads the real FAB column (`data-map-fabs` on ExploreLayout) and pads the right or the bottom, whichever leaves the larger map, plus 40px for an ID label. Route near you (05) now draws card 1's stop 567 clear of Plan Trip.
- **New scene field `tagStopIds`:** the ID chips of these stops are shown first, before the stops nearest the rider. See TODO 1.
- **Attribution (i) hidden when less than 300px of map shows** (the XL home at 360, 46).
- **TC name label:** it now moves below, above or beside the TC tile when the rider's dot is in the way. Scenes with legs still hide TCs (see TODO 2).
- **Panning performance:** with no GPS fix, the stop ranking resorts only after the camera moves 800 m, not 50 m, so all 8,797 stops are not re-sent on every pan. Label placement no longer copies the whole stop list.
- **Map contexts split:** `MapSceneContext` (the setter, which never changes) and `MapCenterContext`. Dragging the sheet no longer re-renders every Explore screen. `useMapScene` and `useMapCenter` keep the same signatures.

## Data correctness

- **`useNearby` placeholder:** the previous list stands in only when the new anchor is within 300 m of the old list's origin. Switching to a place, "Search this area" or back to my location shows loading cards, never the old corner's stops under the new title.

## Server

- `/vehicles`: a failing live feed returns `{ vehicles: [], available: false }`, as having no key does, so the client stops polling. Before, it returned a 500 with a stack trace every 15 seconds.
- `/walk`: a full request that joined a failed fast (`/nearby`) load now retries with the full timeout, instead of showing a straight line.
- `TtlCache`: a failed load removes only its own entry, not a newer one.
- `/stops/:id/schedule?date=` must be a real calendar date, from 7 days back to 60 days ahead. The per-date service cache is capped at 30 entries (LRU).
- `/arrivals` `limit` is clamped to 1–50, `/nearby` `radius` to 50–2000 m, and `/search` `q` to 100 characters.

## Code quality

- New `lib/signal.ts` (`createSignal`, tested). Clock, offline, i18n, persistentStore, install, walkDistance, routes and UpdatedAgo use it in place of hand-rolled listener sets.
- Shared constants: `STALE_VEHICLE_S` (lib/format), `BUZZ` (lib/notify), `PLAN_SORTS` (lib/planQuery), `MAX_WALK_MINUTES` (lib/walk). See TODO 6.
- Unused exports dropped: `savedStopRoutes`, `savedActions`, the server's `projector`, `editDistance` and `tokenSimilarity`.

## TODO for screen fixers

1. **Tag the listed stops (05, 03, 07):** pass `tagStopIds` in the scene. Home should pass the cards' stop ids (the saved stop first, 03). Route near you should pass the street cards' stops. Place mode should pass its stops, and its bounds should also include stop 688 (07 still frames only the museum pin).
2. **06: the TC has no map label.** Route near you's scene has legs (so TCs are hidden). Add a marker for each bay card, for example `{ id, point: bayStop, kind: "bay", label: "Northwest TC · Bay M" }`.
3. **Chip order (06):** in `home/chips.ts`, put the selected chip first and sort the rest with `compareRouteNames` (39, 66, 85, 89). The label "Your route:" should read "Routes here:" (02, 42 "Rutas aquí:").
4. **Home (04):** hide transit centers more than a 10-minute walk away, or put them under a "Farther away" subheading. The fold (`home/fold.ts`) should end on a whole route row. The new card head is about 40px shorter at 360, so re-measure.
5. **Itinerary step 1 (24, 24-360, 44)** in `features/trip/timeline.ts`: make the title the bold stop name, with one grey line "Walk 5 min · #11424 · west side". Also delete timeline.ts's own `stopTitle` and use `lib/format` `stopTitle(name, id, lang)`, since LiveTrip's alert-soon notification is English-only.
6. **Use the shared constants:** `STALE_VEHICLE_S` in route/StopTimeline.tsx, `BUZZ` in stop/useTrackStop.ts and trip/LiveTrip.tsx, `PLAN_SORTS` in plan/Plan.tsx, and `MAX_WALK_MINUTES` in tc/TransitCenter.tsx and search/ResultRows.tsx. Drop the local copies.
7. **Plan list (22, 22-360, es):** use one BOARD line per card, show the alert as a short tag, add the final walk leg, and centre the leg labels. **Clamp the sample shift to service hours** (shiftFixture: at 3:39 AM the sample route 80 leaves at 3:45 AM). Use "Aeropuerto Hobby" in the Spanish summary.
8. **Search 10:** use 08's closest-stop sub-row. **27:** change "First time: your 80…" to "Your bus: 11 min (12:15 PM)".
9. **Knip exports in screens and features:** `FirstAction`, `nearestPlatform`, `isCornerQuery`, `stopWithSide`, `nearestIndex`, `NEAR_STOP_M`, `ARRIVED_M`, `NO_WALK_M` and `HOBBY_STOP` don't need `export`.
10. **Not owned by anyone here:** `src/sw/pwaOptions.ts` should drop `woff` from `globPatterns` (woff2 only). The harness (`tests/e2e`) could freeze the API clock per shot, rather than letting it run on, so that 03 and 03-360, 17 and 18, and 06 and 20 show the same minutes. The app reads one source and floors minutes, so the differences come from the capture clock.
