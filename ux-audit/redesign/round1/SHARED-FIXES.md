# Round 1: shared-layer fixes

These changes are in `pwa/src/ui`, `src/map`, `src/app`, `src/lib`, `src/state`, `src/api`, `src/styles`, `src/i18n` (common + index), `server/`, `vite.config.ts` and the tests they touch. Screens get most of them without any change. The **TODO for screen fixers** items at the end need a change in a screen file.

Fresh screenshots of the whole set, taken after these fixes: `ux-audit/redesign/round1/shared/` (same names as round1).

## Components and the sheet (every screen)

- **Sheet chrome (BottomSheet + SheetHeader).** The "Show list ⌃" row is gone. A sheet now has a single chevron toggle (aria-label "Show list" or "Show map", chosen by snap), never both. Screens with a `SheetHeader` put that toggle on the title row. When the screen has `onBack`, "‹ Back" and the chevron share one row and the title sits under it. The grab bar is drawn over the header, which now drags the sheet too. Home gains about 50px, and Itinerary no longer shows "Show map" and "Show list" together. A custom header with no SheetHeader (for example a peek summary) still gets the old handle row, now with one toggle only. `SearchField` claims the chrome too, so Search has no "Show map".
- **Full snap** covers the whole map. No more bus or ID label poking over the corners (04).
- **Sheet body** has 24px of bottom padding, so the last line (the footer under "Updated…", End trip) scrolls clear of the nav.
- **UpdatedAgo:** reads "Updated just now" ("Actualizado ahora"), or "Just now" in compact form, under 60 s, then "Updated 2 min ago". Offline, "Refresh" reads "Try again". While an UpdatedAgo is on screen, the Explore layout drops its dark **offline banner over the map**, so offline is said once, in the sheet.
- **Selected route chip** (RouteBadge `selected`): filled with the route colour (navy for buses), white numerals, and a small white check. It no longer uses the grey fill that read as "disabled" (05, 06, 20).
- **ChipRow "More ›"** is an opaque button with a divider. The scroller leaves 112px of room so the last chip can scroll clear, and "1Más" and "Less wMore" no longer bleed through. New prop `wrap`: chips wrap onto more rows and no "More" button is shown. Use it for the plan **sort chips** (see TODO).
- **SearchField:** "‹ Back" sits outside the pill. The focus ring is a single flush 2px primary ring, not the old double box.
- **Walk pill (WalkButton):** one line, "🚶 1 min walk". On a place list it also reads "4 min walk", and the accessible name still says "from the museum". The pill now ends the side-of-street line (`cards.metaRow`), so the stop name above it gets the full card width. With large text it drops under the side line instead of squeezing it.
- **NearbyStopCard:** "+ 1 more route (11)" now reads "Also here: Route 11 ›".
- **TransitCenterCard:** the meta line is "6 bays" plus the walk pill, with no "Transit center" and no "0.8 mi". Rows show the route chip, the headsign, then "**Bay G** · 9 min". The grey Bay pill is gone from beside the route chip.
- **RouteDirectionCard (D3):** uses the nearby card's layout. The place and walk pill come first, then "Bay M · Platform 2" on TC cards (one line, no "stop #79", no dangling "·"), then the route row. `card.platformLine` is now just "{platform}", which also affects the TC page and drops "(stop #79)" there.
- **SavedStopRow:** same layout as the nearby card with a star. The chevron is gone. New optional props: `side`, `walkDistanceM`, `onWalk` (see TODO).
- **DepTimes (every card):** with `walkMin`, a bus the rider can't reach in time is left out, so the first big number is one they can catch. There are no more 3-line "3 min / Leaves before you get there / 23 min" rows (07, 38, 42). If every listed bus is too soon, the row shows them greyed as before. New helper `shownDeps()` for spoken summaries.
- **Time rule:** a scheduled bus that is still ahead but less than a minute away is "1 min", never its clock time. This fixes "12:01 PM · 8 min" at 12:00 (03-360, 18). Rule, unchanged otherwise: minutes under 60, clock time at 60 or more, and "Now" only for live times.
- **LiveStrip:** shows up to 4 times on one row. A layout pass hides whatever would wrap, so you get four minute values at 412 and fewer at 360 or XL, never a second row. New prop `nextService` (see TODO) shows the next bus as the big time, "5:47 AM" over "First bus · in 3 hr 17 min" or "No more trips today · next bus Sun".
- **Legend:** the sample chips sit on the strip's blue with white digits and a green live icon, so they look like the strip. The row gap is tighter.
- **AlertBox:** a white card with a red left edge, not a pink fill. Route chips sit on their own wrapping row above the text, so the text always gets the full width and 28/45 no longer squeeze it. The layout is "⚠ **Effect:** header", then dates and a small outlined "Demo" tag inline. There is no Demo column.
- **DemoTag** (alerts, StepList, AlertDetail) is now small: 14px, outlined, grey.
- **Button:** gap 6px, side padding 16px. Two icon pills fit more often at 360. "Track Bus Stop" still needs a shorter label at 360 (TODO).
- **Font stack** has CJK and Arabic fallbacks ("中文" on phones). The headless screenshot machine has no CJK font, so 34-settings will still show boxes in our shots.

## Map

- **Stop-ID chips:** only the 3 stops nearest the anchor (the rider, else the focus) get a chip at zoom 16–18. All stops get one from zoom 18. Chips draw above pins.
- **Street names:** pins no longer reserve space for placement (`icon-ignore-placement`), which had pushed every street name off the downtown map. Street names now show (02, 21).
- **Pins** start at zoom 15, not 14. That removes the 40-pin carpet when location is off (36/37). TC tiles still show from 11.
- **Walk and itinerary scenes** (any scene with `legs`) hide every other stop pin, ID chip and TC tile. Only the trip's own markers show (16, 25).
- **Attribution (i):** bottom-left, just above the sheet, and smaller and grey. It no longer sits on stops under the search bar.
- **Fitted bounds** keep 88px on both sides, so a marker label at the edge ("Transfer · #4789") stays on screen (24, 25).
- **Race fix:** a scene that was still waiting on stops.json when a newer scene arrived is dropped, so the map no longer jumps back to an old stop. `fitFocus` also ignores non-finite bounds.
- The "Stop: 342" callout now changes language along with the UI.

## Data and server

- **Stop alerts:** an alert that names stops only matches those stops. The Hobby Airport elevator alert (routes 40/50/73/88/500 at stop 10567) no longer shows at stop 342 or on other Route 40 stops (12, 13, 39, 41, 43). Route-wide alerts (no stops) still match by route. Itineraries follow the same rule. Test: `src/lib/alerts.test.ts`.
- **Late-night schedule** (`/api/stops/:id/schedule`): `nextServiceFirst` is now the next trip after now. That is later today when one remains (Sat 2:30 AM gives Sat 5:47 AM, and `serviceDate` equals the response's serviceDate), else the next day with service. Tests are in `tests/api-additions.test.ts`.
- **Vehicles:** with no key or when offline, `/api/vehicles` answers 200 `{ vehicles: [], available: false }`, not 503. `useVehicles` turns that into the same `realtime_unavailable` error (the D9 "Live bus positions unavailable" caption still shows) and stops polling. The D9 and F5 console errors are gone.
- **Search:** a landmark matched exactly by name or alias hides partial matches, so "hobby" no longer lists Theater District (Hobby Center).
- **Walk:** only real OSRM answers (a route, or a deliberate rejection) are cached. A timeout or 5xx falls back to a straight line without caching, and `/walk` sends `no-store` for that fallback.
- **Stop direction word removed:** `sideLine(..., { withCompass: true })` no longer adds "Westbound stop". It contradicted the route's direction at turning corners (31 Recent, search rows). Recent and search now read "North side of Lamar St".

## Code quality

- `useT()` returns a stable function per language (useCallback). The `lang`-instead-of-`t` workarounds in LiveTrip (lines 135 and 146) can go back to `t`.
- `useNearby` re-anchors only after 75 m of movement. That means no new /nearby request and OSRM trio every 11 m, and no reshuffled list while walking.
- Query cache: the default gcTime is 10 min. Only health, nearby, stop, arrivals, stopSchedule, route, routeNext, transit centres and alerts keep 24 h and are persisted. For nearby, only the newest answer per radius is persisted (no location history on disk). The persister throttle is now 5 s.
- Build: MapLibre and the React/router/query vendor code are separate chunks. Plan, Itinerary, LiveTrip, Walk, FullSchedule, RoutePage, TC, Alerts, AlertDetail, Settings, Routes and About load lazily through the router's `lazy`, so there's no Suspense flash. The main chunk went from 1.68 MB to 193 kB, plus 354 kB vendor and 1.05 MB maplibre.
- `boundsOf()` is now in `src/lib/geo.ts` (returns undefined for no points).
- `location.tsx`: a late `permissions.query()` no longer subscribes after cleanup.
- Deleted `src/app/Placeholder.tsx` and its CSS, plus the unused `compassStop.*`, `card.walk*`, `card.moreRoutes`, `card.transitCenterLine` and `updated.sec` strings.

## Verification

- `npm run typecheck`, `npm run typecheck:web` and `npm test` (159 tests) pass.
- `npm run test:e2e` (API 8796, web 5186): every flow passes at both sizes. The only rubric failure left is D11 "Reduced fares ›" at 114x19 (plan screen, TODO). The D9 console error is fixed. F7's goal text changed from "Platform 2 (stop #79)" to "Platform 2" in `tests/e2e/flows.spec.ts`.

## TODO for screen fixers (things the shared layer can't do alone)

1. **Stop sheet, late night (41):** in `ExpandedRoute.tsx`, pass `nextService={next && { departureTime: next.departureTime, today: next.serviceDate === schedule.data!.serviceDate }}` to `<LiveStrip>`, and stop building `emptyText` from `strip.nextServiceFirst`. FullSchedule's `stop.schedule.next` should use the same "today" check.
2. **Stop sheet order (12, 47):** put the LiveStrip directly under the route header, and put Full Schedule / Track under it. Use shorter labels at 360 ("Schedule", "Track"; es "Horario", "Avisarme"). Consider Save as a star icon on the title row.
3. **Plan sort chips (22/23):** `<ChipRow wrap …>`. Make "Reduced fares ›" 48px tall (L8), or drop it from the card.
4. **Home saved row (03):** pass `side`, `walkDistanceM` and `onWalk` to `SavedStopRow` when there is a fix.
5. **Route near you (05):** the FAB list drops the first-listed FABs when space runs out, so `routeAlerts` pushed Locate out. Put the alert in the sheet, or list `routeAlerts` first. `routeNear.ts` still has its own unguarded `boundsOf`. Use `lib/geo.ts`'s and skip `focus` when it is undefined. Replace the `tc!.bays.find(...)!` assertions.
6. **Chip label** "Your route? Tap it:" is a home string (D2 judges want it shorter or gone). Chip order is set by the screen.
7. **LiveTrip:** swap the `lang` deps back to `t`. The wakeLock double-acquire is in `features/trip/wakeLock.ts`.
8. **Settings (34):** the "Coming soon" language line. The font stack is fixed for phones, but consider dropping the line.
