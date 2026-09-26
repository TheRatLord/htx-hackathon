# Round 2: shared-layer fixes

Commit `e8b7544` on `pwa-redesign`. The changes are in `pwa/src/ui`, `src/map`, `src/app`, `src/lib`, `src/state`, `src/api`, `src/i18n/strings/common.ts` and `server/`. Screens pick up most of them with no change of their own. The items under **TODO for screen fixers** need a change in a screen file.

Fresh shots of the whole set, taken after these fixes (Set S, same names): `ux-audit/redesign/round2/shared/`. Typechecks (server and web) pass, `npm test` passes (166), and `flows.spec.ts` passes 49/49. The only soft note left is F1 at 360 (see TODO).

## Components (every screen)

- **ChipRow: no ghost chip.** "More ›" is now a separate button next to the scroller, with an 8dp gap, an opaque background and no divider. A chip that the scroller's edge cuts is hidden whole. It comes back when the rider scrolls. Every "Your route" row is affected (02, 02-360, 04, 05, 06, 07, 19, 20, 38, 40, 42).
- **AlertStatusLine:** when alerts are demo alerts and none is listed, it now renders **nothing**. Before, it showed the yellow "Demo alerts only. Live alerts are off." box. Stop sheets (12, 13, 39, 41, 43), route-near and search rows lose the box. There is a new prop `demoNote` to ask for the note (Alerts screens only, see TODO).
- **Offline state (UpdatedAgo):** offline now shows an amber tinted row with a ⚠ icon and bold text, "Offline — times from 12:04 PM", then "Try again" (es: "Sin conexión — horarios de las 12:04 p. m."). The clock time never breaks across lines. Only a **sheet-header** (`compact`) UpdatedAgo suppresses the dark offline banner over the map. The stop sheet's footer line no longer does, so **39 now shows the offline banner at the top of the map**.
- **SheetHeader:** a start-aligned title with Back now uses one row: `‹  Route 40 near you  ⌃`. The ‹ is a 48dp icon button with aria-label "Back". This affects Route near you, Plan, Itinerary, Live trip and Walk, and saves about 56px on each. A centred stop title keeps "‹ Back" on its own row above the title (stop sheet, unchanged).
- **One time rule, per time (DepTimes):** minutes under 60, then the clock time, for each time separately ("2 min · 1:02 PM"). This matches the strip. The old "if one is a clock time, all are" rule produced "12:02 PM · 1:02 PM" for a bus 2 minutes away (06), and it is gone. Offline still uses clock times.
- **First bus, late night (DepTimes):** now one line, "First bus **4:20 AM** · in 1 hr 50 min" (40). The new `firstBus` prop also labels a next bus more than an hour away. Early-morning buses say "First bus", others say "Next bus". New strings: `time.nextBus`, `time.inDuration`.
- **NearbyStopCard late night:** a route with nothing in the next 2 hours shows its next scheduled bus ("First bus 5:10 AM · in 2 hr 40 min") when the card gets the new prop `laterFirst`. Otherwise it still says "No buses in the next 2 hours". The server now sends `laterFirst` on every `/nearby` stop (see TODO: Home must pass it).
- **Walk pill layout (cards.metaRow):** the side-of-street line no longer wraps beside the pill ("On the south side of McKinney / St"). When the two don't fit on one line, the pill moves under the side line, start-aligned. This happens at 360 and at XL (02-360, 05, 06, 46). The wording is unchanged, as spec C.5a and the F-goals require.
- **Stop titles on cards:** NearbyStopCard and SavedStopRow keep the stop number with the last word, so "(2958)" no longer sits alone on a line (03-360). New `stopTitle()` in `lib/format.ts`.
- **SavedStopRow:** applies the unreachable-bus rule (it passes `walkMin` to DepTimes), so with a 3 min walk it no longer leads with "1 min" (03).
- **TransitCenterCard:** one row per route and direction with **two** times ("17 min · 32 min"), like stop cards. The bay goes on the headsign line in regular grey ("SOUTHBOUND to HIRAM CLARKE TC · Bay G"). Buses the rider can't reach at their walk pace are left out.
- **LiveStrip:** "PM" is set small like "min", so **4 times fit at 412** ("17 min 47 min 1:23 PM 1:53 PM"), and 3 fit at 360 or offline. The late-night caption "First bus · in 3 hr 17 min" is white at 88%, not Live green (41).
- **Legend:** the Live sample is now visibly different. It shows "8 min **Live**" plus arcs in live green inside the chip, the way a live time looks on the strip.
- **Toast:** a new toast always starts unpaused. Before, one toast whose Undo had focus could leave every later toast stuck on screen.

## Map

- **Fit bug fixed:** `fitBounds` added the padding left by the previous `easeTo` (Home's sheet height) to its own. With a tall sheet the total exceeded the canvas, MapLibre logged "Map cannot fit", and the camera never moved. Now it asks only for the difference. **Route near you now frames its stops** (05 shows 342, 06 shows the Northwest TC bays and 8249), and so do the itinerary maps.
- **Selected stop on the stop sheet:** the enlarged pin now has a white **"Stop 342"** callout (es "Parada 342") (12, 14, 39, 41, 43). Walk and trip scenes still name the street.
- **Stop-ID chips only where they can be read:** the chips go on the nearest stops whose pin and chip are on screen and clear of the sheet, the search bar with its overlay slot, and the FAB column. `ExploreLayout` marks these areas with `data-map-obstacle`. Chips are no longer cut by the sheet's edge (02-360, 03-360), and they no longer sit under Plan Trip or "Planear viaje" (02, 42). Chips are re-placed after every camera move and after the sheet settles.
- **Scene labels:** a marker label that would fall under the sheet or chrome is dropped, since the sheet lists that step anyway. This fixes "Transfer · #4789" being cut by the sheet at 360 (24-360). A place or destination pin now puts its label above the pin head instead of beside it, where it ran into the FABs.
- **Pin flood below zoom 16** (location off, 36/37): from zoom 15 to 16, only pins that don't overlap are drawn, with about one pin per block and the nearest first. From zoom 16 every pin is drawn as before. Direction notches start at 16.
- **MapView race:** if the first GPS fix arrived before the map's `load` event, the next fix after load was treated as the first and re-centred the camera. That is fixed.

## Server

- `/nearby`: each stop has `laterFirst: { [routeId]: iso }`, giving the next departure within 18 h for serving routes that have nothing in the 2-hour window.
- `/nearby` walk distances (precise=1): OSRM gets a 2 s timeout, and after a failure OSRM is skipped for 60 s (the estimate stands in). Polls no longer hang for 8 s while OSRM is down.
- Alerts: every GTFS-RT active period counts. An alert is active if any period contains now, and `activeFrom/Until` show the current or next period.
- Vehicles: a null `DirectionName` or `DestinationName` no longer turns `/vehicles` into a 500.
- Schedule by day already exists: `/stops/:id/schedule?route=040&date=20260926` (`useStopSchedule(stop, route, { date })`).

## Code quality

- `lib/format.ts`: `formatDuration` moved here from LiveStrip. There is a new `ageMinutes(ms, now)` (the one rounding for "N min ago" and "last seen"; UpdatedAgo uses it), and `stopTitle`. The unused `rowUsesClock` was removed, and so was TimeValue's `clock` prop.
- New `lib/serviceDays.ts` (tested): `serviceDayTabs(serviceDate)` → `{ weekday, saturday, sunday }` service dates for the D7 tabs, plus `dayKindOf`/`serviceDateOf`. There are new common strings `serviceDay.{label,weekday,saturday,sunday}` (en/es).
- `persistentStore` listens for the `storage` event, so a second tab no longer silently overwrites saved stops, recents or the active trip.
- `apiGet(path, params, signal)`: `/nearby`, `/search`, `/plan`, `/walk` and `/arrivals` pass TanStack's abort signal. A cancelled request is not reported as offline.
- Dead code removed: `useMapPadding`, and the `export` on `getNow` and `MAP_STYLE_URL`.

## TODO for screen fixers (screen files, not done here)

1. **Home late night (40):** in `screens/explore/home/NearbyCard.tsx`, pass `laterFirst={item.laterFirst}` to `NearbyStopCard`. That one prop turns "No buses in the next 2 hours" for 51/52 into "First bus 5:10 AM · in …".
2. **Alerts screens:** `Alerts.tsx` (the `routeParam && shown.length === 0` branch) and `AlertDetail.tsx` render `AlertStatusLine` with `alerts={[]}`. With demo data they now show nothing, so pass `demoNote` there.
3. **Stop sheet (13):** drop `<ScheduleCaption />` under the Legend ("Times are scheduled unless marked Live" repeats the legend). At XL/360 (47), make Save a star icon on the name row and put Schedule and Track bus on one row. F1 at 360 is still soft-failing on the route-near screen: card 342 is the second card (y=610, fold 560). Consider the `routeCap` in `home/fold.ts` or ordering by the chip's direction.
4. **Full schedule (15):** add the Weekday / Saturday / Sunday `SegmentedControl` with `serviceDayTabs(schedule.data.serviceDate)`, `useStopSchedule(..., { date })` and the `serviceDay.*` strings.
5. **Trip time drift (22/24 vs 25/26/27):** the list and itinerary show 12:11 and the map view and live trip show 12:12. This is `shiftFixture` recomputing the sample shift from `dataUpdatedAt` on each fresh page load (each e2e shot relaunches with the clock a minute or more later), plus `startableFixture` on Start. Quantize the shift (for example round the base shift up to 5 or 10 minutes) so it is stable across screens. Also drop the rider-facing "Sample trips · times shifted to now", "1 demo alert on this trip" and "Sample trip: tap Next…" text (plan and trip strings).
6. **Route 82 vs Home (17/18 vs 03):** the API sources agree. `/nearby`, `/arrivals` and `/routes/082/next` all give 2958 the next bus at 12:01:26. The difference comes from the shared e2e server clock running on between shots. No app change is needed.
7. **`tcRoutes` duplicate:** `home/chips.ts` and `tc/tcModel.ts` implement it differently. Delete the chips.ts copy and import the tcModel one. Place-mode chip label: "Routes here:" instead of "Your route:" (07).
8. **`ageMinutes`:** use it in `route/StopTimeline.tsx` (floor) and `trip/LiveTrip.tsx:173` (round) so vehicle ages agree.
9. **Search (`Search.tsx`/`ResultRows.tsx`):** narrow instead of `r.lat!`, `pick!` and `result.stop!`. Settings PreviewCard sample text should come from i18n and use one direction.
10. Empty search (11), plan form (swap icon, "Leave now ▾" selector, recents), itinerary step wrapping and footer padding (24/44), location-off order (37: saved first, one-line location prompt; hide ⌃ with no list) are all screen layout.
