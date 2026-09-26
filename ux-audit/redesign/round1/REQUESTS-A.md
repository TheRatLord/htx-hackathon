# Round 1: requests from screen fixer A (home, stop, walk)

These changes are needed outside `src/screens/explore/{home,stop,walk}` and `src/i18n/strings/{home,stop,walk}.ts`.

## Tests (tests/e2e): strings I changed

- `flows.spec.ts:106` (F1 goal): `"Your route? Tap it:"` is now `"Your route:"`. When a route is already selected (D3) the chip row has no visible label, and the group keeps its aria-label "Routes near you".
- `flows.spec.ts:351` (F11 goal): the D4 title is now `"Near Houston Museum of Natural Science"` (it was "Stops near …"). D4 no longer has the sheet's "‹ Back". "✕ Back to my location" is its only way back, so it no longer offers two back controls.
- `flows.spec.ts:223` (F4 goal): the Walk box now reads "Next bus in 20 min" (or "Next bus at 1:23 PM"), so `/next bus/` needs the `i` flag.
- `screens.spec.ts:55` (14-stop-342-tracking): the button is now "Track bus" (es "Avisarme"). When it is on, the label is "Stop tracking" and the accessible name is "Stop tracking Route 40". Change `/Track Bus Stop/` to `/^Track bus/`.
- I ran these in a scratch copy of the specs with the strings above updated, against API 8792 and web 5182. All 24 flows and every D2, D3, D4, D6, D7 and D8 rubric check pass. As before, F1 and F11 at 360x640 reach their goal below the fold (only 412x800 is required; see "Still open").

## Shared components

1. **ChipRow inline label** (`ui/ChipRow`): judges asked for "Your route:" on the same line as the chips, which saves about 40px on every home sheet. Please add a prop that renders the label as the first item in the scroller, or on the chips' row.
2. **NearbyStopCard at Extra large** (`ui/cards`): the walk pill drops onto its own line under the side line, so the card header takes about 170px at XL 360. For now Home moves the chips after card 1 when the text size is XL and the viewport is under 700px tall, which makes one departure visible in 46. A pill that fits beside a shorter side line, or a smaller pill at XL, would help all cards.
3. **RouteDirectionCard / DepTimes**: "55 min · 2:02 PM" (06, second card) still mixes minutes and a clock time in one row, because the 60-minute rule switches to clock time mid-row. Consider using one format per row: if either time is 60 min or more, show both as clock times.
4. **Late-night home (40)**: "Route 51 · No buses in the next 2 hours" repeats the chip's number. A first-morning time such as "4:20 AM" needs a "First bus" word (NearbyStopCard / DepTimes, shared).
5. **Map callout "Stop: 342"** repeats the sheet title (judges). This is MapView, shared.

## Server and API

6. **Full Schedule day switch (D7, 15)**: judges want Weekday / Saturday / Sunday tabs, as in v2.71. `/api/stops/:id/schedule` only serves today, so this needs a `date=` (or `day=`) query parameter and a matching `useStopSchedule(stopId, routeId, { date })` in `api/hooks.ts`. After that, the screen change is mine.

## Still open in my screens (not done this round)

- F1 at 360x640: the NB card (342) is card 2 of D3 and sits below the 380px half-sheet cap. The cards are ordered by walk distance, and the SB card (567) is closer.
- F11 at 360x640: the D4 title wraps to 2 lines, and "Back to my location" plus "Just now · Refresh" take 2 rows, so the 688 route row falls below the fold.
- Route near you (06): the map fit now includes the bay stops, but the TC square isn't marked with the card's bay.
