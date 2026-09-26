# Proposal: "Familiar" redesign of RideMETRO

**Approach: familiarity first.** The rider who has used RideMETRO for years should open this PWA and think "it's my app, but it finally works." The frame stays as it is: the Explore | Fares | Recent | More nav, the map with the white pill search bar, the bottom sheet, the navy-banded route chips and the blue live-minutes strip. Every problem is fixed inside that frame with the smallest visible change that solves it.

Sources: `docs/baseline-steps.md`, `docs/baseline-flows.json`, `docs/design/existing-style.md` (all token names and hex values below come from there), `ux-audit/REPORT.md`, `complaints.md`, `improvements.md`, and the API in `pwa/shared/types.ts` and `pwa/server/services/*.ts`.

Units: **dp** for sizes and **sp** for type, where 1dp = 1 CSS px in the PWA. The design is laid out at 360dp and scales to 430dp. Wireframes are about 40 characters wide and are not to scale.

---

## 1. Principles

1. **Same place, same look.** Nothing a rider already knows moves. The nav order and icons, the search bar position and placeholder, the FAB column, the sheet corners (28dp), the route chip and the blue strip all stay. New things appear in the spots riders already look at.
2. **Show the stop, not just the route.** Everywhere a time appears, it comes with the stop name, stop number, direction and side of the street. Riders already know stop codes like "(342)", so we show them everywhere.
3. **Every screen answers "where do I stand and when does it come?"** Walk time, the side of the street and the next bus appear together, with no extra tap.
4. **No dead ends and no pop-up choice dialogs.** Anything that looks tappable is tappable. The "What do you want to do?" dialogs are replaced by buttons directly on the result or the card.
5. **Readable by a 75-year-old in Houston sun.** Body text is at least 16sp, arrival minutes at least 20sp, and touch targets at least 48dp. Anything important meets 4.5:1 contrast. The Text size setting is on the first screen and in More.
6. **Be honest about data.** Live times are green with the arcs icon, as today. Scheduled times are black and labeled "Scheduled". Every live list shows "Updated N sec ago". When the app doesn't know something (no GPS, offline, bay not published), it says so and never fakes a location.
7. **Ask only when needed.** Location is asked for once at launch. Notifications are asked for only when the rider starts a trip or taps a bell. There are no coach marks.
8. **Out of scope is marked clearly.** Login, tickets and payment are stub screens labeled "Handoff to METRO". They are never faked.

---

## 2. Information architecture

### 2.1 Bottom navigation (unchanged)

The bar is the same as today: 80dp plus the gesture inset, background `nav-bg` #E4EBF6, no top border. The active tab has a 64x32dp pill in `primary` #2976C7 with a white icon and a bold 12sp label. Inactive tabs use `on-surface-variant` #414752. The only change is labels at **13sp** instead of 12sp; in Large text they grow to 15sp.

| # | Label | Icon (same as today) | Contains |
|---|---|---|---|
| 1 | **Explore** | map with pin | The map, the search bar, the Nearby sheet (Saved stops at the top, then nearby stops by walk time), stop sheets, walking directions, route page, transit center view, trip planner, itineraries, live trip |
| 2 | **Fares** | two tickets | A stub for "Show my ticket / Buy fare" with a handoff to METRO sign-in, plus a real in-app **fare table** that includes reduced fares |
| 3 | **Recent** | bus-stop sign | **SAVED STOPS** (new, starred, with live times), RECENTLY VIEWED STOPS, RECENTLY VIEWED ROUTES (the big chips, as today), RECENT TRIPS (new: re-run with one tap). CLEAR clears recents only, never saved stops. |
| 4 | **More** | menu | Same list as today, with **Service Alerts moved in-app** (chevron instead of ↗) and a new **SETTINGS** block: Language, Text size, Location, Notifications, Show welcome again |

Pushed screens (Route, Transit Center, Alerts, Settings) keep today's pattern: an app bar with a blue `accent-blue` #2A82E6 back arrow, a 22sp title, and the bottom nav hidden. Explore sub-views (stop, walk, itinerary, live trip) are **sheet states over the map**, as today, but each has a visible **back arrow and close (X)**. Swiping down minimizes the sheet and never discards anything (fixes J2.6).

### 2.2 Home at launch (Explore) in detail

At launch, a returning rider with location on sees this at 360x780dp:

```
┌──────────────────────────────────────┐
│ 9:41                        ▼ ▲ ■    │ status bar
│ ╭──────────────────────────────────╮ │
│ │[METRO] Place, Stop, or Route   🔍│ │ search 48dp
│ ╰──────────────────────────────────╯ │
│                               ┌────┐ │
│      ·  map (light, Google-   │ ⌖  │ │ locate FAB 48
│         like)                 └────┘ │
│   ▲342        ◉ you     ╭──────────╮ │
│         ▼343            │⋯● Plan   │ │ extended FAB
│                         │   Trip   │ │  "Plan Trip"
│                         ╰──────────╯ │
│╭────────────────────────────────────╮│
││              ────                  ││ handle
││ 6 Nearby Stops              ⟳      ││ 22sp
││ Updated 8 sec ago                  ││ 14sp
││ [40][41][82][85][ 6]→              ││ route chips row
││ ★ SAVED                            ││
││ ┌────────────────────────────────┐ ││
││ │Westheimer @ Montrose (2958)    │ ││
││ │EASTBOUND · 0.8 mi              │ ││
││ │[82] DOWNTOWN   ᯤ4 min   19 min │ ││
││ └────────────────────────────────┘ ││
││ NEAREST TO YOU                     ││
││ ┌────────────────────────────────┐ ││
││ │Lamar St @ Main St (342)  1 min │ ││
││ │NORTHBOUND · E side of Main walk│ ││
││ │[40] N SHEPHERD P&R ᯤ4 min 19min│ ││
││ │[41] KIRBY/POLK      7 min 22min│ ││
│└┴────────────────────────────────┴─┘│
│  [Explore]  Fares   Recent   More    │ nav 80dp
└──────────────────────────────────────┘
```

**Map layer**
- Style: OpenFreeMap vector tiles restyled to look like today's Google light map. Land #F5F3F3, parks #C3F1D5, hospital areas #FCE8E6, commercial #F8F0DE, water #AADAFF, highways blue-grey #B8C7D9, and minor POI labels hidden to cut clutter.
- **You-are-here**: `user-location` #4285F4 dot (16dp) with a white 2dp ring and an accuracy halo at 15% opacity. It appears only when there is a real fix.
- **Stop markers** (replace the 16dp dots, J1.1/J4.5): a 28dp rounded-square pin in `accent-blue-light` #4994EC with a white bus glyph and a small white **direction arrow** notch on the edge the bus travels toward (from the stop's `bearing`). At zoom ≥ 16 a white label chip "342" (13sp Medium, #1D1B20, 1dp #C6C6C6 border) sits under the pin. At zoom < 15 pins cluster into a navy #004080 circle with a count. Pins are shown for the whole viewport, not only inside a circle. Accessibility label: "Stop 342, Lamar St at Main St, northbound".
- **Rail stations**: the same pin in `rail-red` #EF0000 with a tram glyph.
- **Transit centers**: one 36dp navy #004080 pin with "TC" and a name label ("Northwest TC") at zoom ≥ 14. At zoom ≥ 17 the individual **bay pins** separate at their real coordinates, each labeled "Bay C" (fixes J1.5).
- **Selected stop**: today's white callout "Stop: **342**" with a pointer (kept), with the pin scaled to 36dp.
- The blue nearby-search circle is **removed**. Nearby is always anchored to **your location**. Panning does not change the list. After a pan of more than 300m, a pill "Search this area" appears under the search bar (36dp, white, shadow, `accent-blue` text), and the list changes only if you tap it (fixes J1.6).
- The left route-chip rail is **moved into the sheet** as a horizontal chip row. The same chips are used, so the map is uncovered (J1.13).

**FABs (right side, 16dp from the edge, 8dp gap)**
- Locate: 48x48dp white rounded square (radius 12dp), `accent-blue-light` #4990DF crosshair, as today. When there is no fix, tapping it shows the toast "Can't find your location yet" (J3.13).
- **Plan Trip**: the same custom route icon (dotted path, blue dot to red pin), now an **extended FAB with the label "Plan Trip"** (48dp tall, 15sp Medium #1D1B20). Same position, now self-explanatory (J2.13).
- Route alerts (red triangle): unchanged, and shown only while a route is selected, with a red count badge.

**Bottom sheet: three states, as today (peek / half / full)**
- **Peek** (148dp): handle, title, "Updated…", and the chip row. The map is fully usable.
- **Half** (default at launch, 55% of height): as drawn above.
- **Full** (to 16dp under the status bar): the search bar hides and a "Map" pill at the bottom returns to half.
- Handle: 32x4dp, #414752, 12dp from the top. Sheet: `surface` #FFFFFF, 28dp top corners.
- Title "6 Nearby Stops", 22sp Regular #1D1B20. Today it counts arrivals ("59 Nearby Arrivals"); now it counts stops, because the list is grouped by stop. `refresh` icon 24dp #4A95E9 in a 48dp target.
- "Updated 8 sec ago", 14sp #6A6A6A. It replaces today's "updated every 30 sec" in the same spot, turns `alert-red` after 90s, and becomes "Offline" when there is no network.
- **Route chip row**: the nearby routes, horizontal scroll, sorted by the walk time of their nearest stop. Chip 48x44dp: white body, 7dp `brand-navy` #004080 top band (`rail-red` for rail), radius 4dp, 1dp #AAA9AD border, number 17sp Medium #000. A tap filters (see "Route selected" below). The selected chip turns `selected-chip-gray` #C6C6C6, as today.
- **★ SAVED** section (only if the rider has saved stops): 15sp Medium caps header in `on-surface-variant` #414752 with a 16dp star in #2A82E6. It shows up to 3 saved stop cards, then "All saved stops ›" (goes to Recent).
- **NEAREST TO YOU** section: up to 8 **Nearby stop cards**, sorted by walk minutes (`/api/nearby`, `walkMin`). A transit center counts as one card.

**Nearby stop card** (the new core component, built from today's arrival card)
```
┌────────────────────────────────────┐
│Lamar St @ Main St (342)    1 min  ›│ 18sp Bold / 16sp
│NORTHBOUND · East side of Main walk │ 14sp caps + 14sp
│────────────────────────────────────│
│[40] TO N SHEPHERD P&R              │ chip 40x36
│     ᯤ 4 min   19 min   34 min      │ 20sp Medium
│[41] TO KIRBY / POLK                │
│     7 min   22 min   Scheduled     │
│ ( 🚶 Walk 1 min )     + 2 routes › │ pill 40dp
└────────────────────────────────────┘
```
- Container: `surface-container` #F3F2F8, radius 10dp, padding 12dp, 10dp gap between cards, no shadow (as today).
- Line 1: stop name plus "(ID)" at 18sp Bold #1D1B20, and the walk time at the top right: "1 min" 18sp Medium over "walk" 13sp #6A6A6A. If walking is more than 20 min, show distance ("1.2 mi") instead.
- Line 2: direction in caps ("NORTHBOUND", 14sp Medium #1D1B20), then " · ", then `side` ("East side of Main St", 14sp #414752). If `side` is missing, show only the direction. Two stops with the same name across the street now read "NORTHBOUND" and "SOUTHBOUND" (J2.1).
- Route rows: one per route and direction, with at most 3 shown and "+ N routes ›" for the rest. Each row has the chip (40x36dp, larger than today's 32dp), then "TO HEADSIGN" in 14sp Medium caps #414752, with the next 3 departures under it at **20sp Medium**. Live times are `realtime-green-text` **#0A7D22** with the arcs icon at #00BB1F. Scheduled times are #1D1B20. Canceled times are #FD4D43 with a strike-through and the word "Canceled".
- Time format everywhere: "Due" (<1 min), "4 min", up to "59 min", then clock time "6:05 PM". Never "1:08m" or "1:13h" (J1.9).
- A tap on the card body opens the **Stop sheet**. A tap on a route row opens the Stop sheet with that route expanded. The "Walk 1 min" pill (40dp, white, 1dp #C6C6C6, `directions_walk` in #2A82E6) opens **Walk directions**.
- Transit center variant: title "Northwest Transit Center", line 2 "TRANSIT CENTER · 12 bays", each route row prefixed by a bay tag "Bay C" (13sp Bold on #E4EBF6), and a footer button "Departures by bay ›".

**Route selected** (a chip is tapped): a navy polyline #004080 (6dp) for that route is drawn on the map with only its stops shown, and the alert FAB appears. The sheet title becomes "Route 40 near you" with a "×" to clear. There is one card per direction, each showing the **nearest stop in that direction** with its walk time and next 3 departures. This is what F1 asks for.

---

## 3. Screen-by-screen spec

Shared tokens (from `existing-style.md`): navy #004080, deep blue strip #005DAA, primary #2976C7, accent #2A82E6, surface #FFFFFF, background #F9F9FF, card #F3F2F8, on-surface #1D1B20, variant #414752, secondary #6A6A6A, realtime icon #00BB1F, **realtime text #0A7D22** (new: the same green, darkened to reach 4.5:1 on #F3F2F8), alert red #FF3B2F, alert bg #F4DFE4 with border #F7BBBB, rail #EF0000, divider #C1C6D4. Font: Roboto. Margins 16dp.

**Type scale (Standard text size).** Minimums are raised from today's.

| Role | Today | New |
|---|---|---|
| Page/sheet title | 22–24sp | 22sp (unchanged) |
| Stop title | 17sp Bold | 18sp Bold |
| Body / list | 15–17sp | **16sp** |
| Arrival minutes in cards | 11sp | **20sp Medium** |
| Blue strip digits | 30sp | 30sp (unchanged) |
| Headsign / direction caps | 11–15sp | **14sp** Medium |
| Itinerary instruction | 9–10sp | **16sp** |
| Leg duration badge | 8sp | **13sp** |
| Captions (Updated…, legend) | 11–12sp | 14sp |

Large text multiplies everything by 1.15, and Extra large by 1.3. Layouts wrap and never truncate stop names or IDs.

### 3.1 Onboarding (one screen)

This replaces 3 explainers, an intro card and 7 coach marks (F10, J1.12).

```
┌──────────────────────────────────────┐
│ [METRO logo]                         │ 28dp tall logo
│                                      │
│              ( 📍 )                  │ 72dp navy #004F97
│                                      │
│  Welcome to RideMETRO                │ 28sp #1D1B20
│                                      │
│  See the next bus at the stops       │ 16sp #414752
│  closest to you. We use your         │
│  location only while the app is open.│
│                                      │
│  Language   [English] [Español]      │ chips 40dp
│  Text size  [ A ] [ A+ ] [ A++ ]     │ chips 48x40
│                                      │
│ ╭──────────────────────────────────╮ │
│ │     Show stops near me           │ │ 48dp #2976C7
│ ╰──────────────────────────────────╯ │
│         Not now, I'll search         │ text btn 48dp
└──────────────────────────────────────┘
```
- Background `background` #F9F9FF, with the logo top-left as today.
- The language chip is preselected from `navigator.language`. The selected chip is #2976C7 with white text; the others are `chip-inactive` #EBEBEB with #1D1B20 text. Changing either chip updates the screen immediately, so the rider sees the effect.
- **Show stops near me** opens the OS location dialog, then goes to Explore. **Not now** goes to Explore in the "location off" state (3.16).
- There is no notification or Bluetooth ask. Notifications are asked for in context (3.10). Beacon features are dropped because a PWA can't use them.
- The screen appears once and can be shown again from More › Show welcome again.

### 3.2 Explore home (sheet states)

See 2.2. Additional states:

| State | What shows |
|---|---|
| Loading (first fix) | Sheet title "Finding stops near you…" with 3 skeleton cards (#F3F2F8 blocks, shimmer). Map at the last known location, or Downtown with the label "Showing Downtown Houston". |
| No stops within 500m | "No stops within a 10-minute walk" 16sp, then the nearest 3 stops at any distance (radius 2000), then a [Plan Trip] button. |
| Panned away | "Search this area" pill. The list still shows your stops. |
| Route selected | See 2.2. |
| Saved stop with no live data | Times in black with a small "Scheduled" label, and the header note "Live times unavailable for Route 82". |

### 3.3 Search (full-height sheet, same as today)

```
┌──────────────────────────────────────┐
│ ╭──────────────────────────────────╮ │
│ │ ←  hobby|                      ✕ │ │ 48dp #F2F3FB
│ ╰──────────────────────────────────╯ │
│ PLACES                               │ 14sp caps #414752
│ 📍 William P. Hobby Airport          │ 17sp Bold
│    Airport · 7800 Airport Blvd       │ 14sp #6A6A6A
│    Nearest stop: Hobby Airport (1 min)│
│    ( Directions )  ( Stops near )    │ 40dp pills
│ ──────────────────────────────────── │
│ STOPS                                │
│ 🚏 Hobby Airport (Stop #12345)       │
│    NORTHBOUND · Routes 40, 88 · 7 mi │
│ ROUTES                               │
│ [88] 88 Hobby / Sagemont             │
│    ( Northbound ) ( Southbound )     │
│    ✓ No alerts for Route 88          │ 14sp #0A7D22
└──────────────────────────────────────┘
```
- Opened by tapping the map search bar. The field autofocuses and the keyboard opens.
- **Empty state:** ★ SAVED (stop rows), then RECENT searches (up to 5), then "Try: a stop number (342), a route (82), a street corner (Westheimer and Kirby), or a place."
- Results are grouped by type with a caps header and a distinct icon for each type (J2.9). Place/landmark = black `place` pin. Stop = bus-stop pole. Route = route chip. Rail station = tram. Transit center = navy "TC" badge.
- **Inline actions replace the "What do you want to do?" dialog.**
  - Place/landmark row: tapping the body = **Stops near** (3.2 with origin = that place). **Directions** plans from your location to there (3.8). The nearest stop line comes from `nearbyStops` in the search response.
  - Stop row: tapping the body opens the Stop sheet. A trailing 🚶 icon button (48dp) opens Walk directions.
  - Route row: **direction pills** open the Route page already in that direction. Tapping the body opens it in the direction nearest you. The alert line shows either "⚠ 1 alert: Detour at Kirby" (alert red #FF3B2F, 14sp) or "✓ No alerts for Route 82".
- Queries like "Westheimer and Kirby", "Westheimer & Kirby" and "Westheimer @ Kirby" are treated the same (J4.6).
- No results: "No matches for 'xyz'. Check the spelling, or try a stop number from the sign at the stop."
- Airport queries rank the terminal stop or place first (the J2.3 mitigation is in 3.8).

### 3.4 Stop sheet (the "one good screen", kept and extended)

```
┌──────────────────────────────────────┐
│ ←             ────                 ✕ │ 48dp icons
│     Lamar St @ Main St (342)         │ 18sp Bold ctr
│  NORTHBOUND · East side of Main St   │ 14sp ctr
│        1 min walk · 300 ft           │ 14sp #6A6A6A
│ (☆ Save)  (🚶 Walk here) (📅 Schedule)│ 3 pills 44dp
│ ─────────────────────────────────── │
│ [🚌] Telephone / Heights          🔔 │
│ [40] NORTHBOUND to N SHEPHERD P&R    │ 16sp Bold
│██████████████████████████████████████│
│█ 4 min ᯤ  19 min ᯤ   34 min  6:05 PM█│ strip 58dp
│██████████████████████████████████████│ #005DAA
│ [41] TO KIRBY / POLK   7 min  22 min›│ collapsed row
│ [82] TO DOWNTOWN      12 min  27 min›│
│ ✓ No alerts for this stop            │ or pink box
│ 8min Scheduled  ᯤLive  8min Canceled │ legend 14sp
│ Updated 8 sec ago                    │
└──────────────────────────────────────┘
```
- Source: `/api/stops/:id` (stop, serving, alerts) and `/api/arrivals?stop=`.
- Header: a back arrow (to where you came from) and close X, both 48dp targets in #2A82E6. The centered bold "Name (ID)" is the same as today.
- The meta lines are new and give direction, side, walk time and distance. The walk time is omitted when location is off.
- **Action pills** (the same style as today's Full Schedule / Track Bus Stop: #F3F2F8, pill, blue icon, 16sp label, 44dp tall, 8dp gap):
  - **☆ Save** becomes ★ Saved (#2A82E6 filled star) with the toast "Saved. It will show at the top of Explore." (J4.1)
  - **🚶 Walk here** opens 3.5 (J1.3)
  - **📅 Schedule** is today's Full Schedule for the expanded route, as the hourly grid. Kept, and now titled with route, stop and direction (J3.6).
- Routes: the route you came from (or the soonest) is **expanded** into today's row (chip with bus icon, route long name, bold "NORTHBOUND to HEADSIGN") plus the **blue strip** (#005DAA, 30sp white digits, "min" 16sp, live arcs). Other routes are collapsed rows with times at 20sp in #1D1B20 or #0A7D22. Tapping one expands it and collapses the previous one. The row chevron › opens the **Route page** at this stop.
- 🔔 on the route row is today's "Track Bus Stop", now per route: "Notify me when the 40 is 5 min away." The first tap triggers the notification permission. The bell is filled green #1AC235 while active. It works while the app is open or in the recent background; this limit is stated in the confirm toast.
- Alerts: if `alerts` is non-empty, pink boxes (#F4DFE4, border #F7BBBB, radius 8dp) show "⚠ Detour: Main St closed at…" (16sp #1D1B20, "⚠" #FF3B2F) with a chevron, opening Alert detail (3.12). Otherwise "✓ No alerts for this stop" in 14sp #0A7D22.
- Legend: today's Scheduled / Live Tracking / Canceled, enlarged to 14sp.
- States: loading (strip shows "– – min"); no service ("No more trips today. First bus 5:12 AM."); live missing ("Live times unavailable. Showing scheduled times." in 14sp #6A6A6A above the strip, with the digits white but no arcs).
- Map behind: the stop is centered, the pin is enlarged, and the callout "Stop: 342" shows.

### 3.5 Walk directions (new; the sheet over the map)

```
┌──────────────────────────────────────┐
│  map: blue dotted street path        │ 5dp #2A82E6
│  ◉ you ········┐                     │ dotted 2/6
│                └····▲342             │
│╭────────────────────────────────────╮│
││ ←           ────                 ✕ ││
││ Walk to Lamar St @ Main St (342)   ││ 18sp Bold
││ 4 min · 0.2 mi · East side of Main ││ 16sp
││ Your 40 comes in ᯤ 9 min. You have ││ 16sp #0A7D22
││ time.                              ││
││ ────────────────────────────────── ││
││ ↑  Head north on Main St   500 ft  ││ 16sp, 56dp rows
││ ↱  Turn right onto Lamar St 200 ft ││
││ 🚏  Arrive at stop 342, east side  ││
││ ╭────────────────────────────────╮ ││
││ │  Open in Google Maps  ↗        │ ││ secondary
││ ╰────────────────────────────────╯ ││
│╰────────────────────────────────────╯│
└──────────────────────────────────────┘
```
- Source: `/api/walk` (OSRM). Steps come in US units ("500 ft", "0.3 mi").
- Header: "Walk to <stop name (ID)>". Summary: `durationMin` · `distanceText` · side. A second line compares with the next bus: "You have time" (#0A7D22) if walk ≤ next departure − 1 min, otherwise "Hurry: the 40 leaves in 3 min. Next one is 19 min." (#FF3B2F, with the ⚠ icon).
- If `relaxedDurationMin` differs by 2 min or more, show "(about 6 min at an easy pace)" in 14sp #6A6A6A, for older riders.
- Step rows are 56dp with a 24dp maneuver icon in #2A82E6, a 16sp instruction and the distance right-aligned in 14sp #6A6A6A. Tapping a row zooms the map to that step.
- The map fits you and the stop above the sheet (padding = sheet height). The origin is the blue location dot, the destination is the enlarged stop pin, and the path is a blue dotted line on streets.
- Fallback: `source: "straight-line-estimate"` shows a grey box "Street-by-street directions are unavailable. Distance is an estimate." (the `warning` text), with "Open in Google Maps ↗" promoted to primary.
- Location off: "Turn on location to get walking directions" with [Turn on] and [Open in Google Maps].

### 3.6 Route page (replaces "Route Schedules" plus the raw timetable path)

```
┌──────────────────────────────────────┐
│ ←  ┌────┐ Westheimer             ☆   │ badge 56dp navy
│    │ 82 │ Bus route                  │ 22sp Bold
│    └────┘                            │
│ ⚠ 1 alert: Detour at Kirby Dr     ›  │ pink box
│ ╭─────────────────┬────────────────╮ │
│ │  EASTBOUND  ✓   │   WESTBOUND    │ │ segmented 48dp
│ ╰─────────────────┴────────────────╯ │
│ to DOWNTOWN TC · 62 stops            │ 14sp #6A6A6A
│ ╭ 🔍 Find a stop on this route    ╮  │ 44dp #F2F3FB
│ ○ Westheimer @ Wilcrest (1901)       │ 48dp rows
│ │                                    │ spine #C1C6D4
│ ● Westheimer @ Montrose (2958)  ⌖you │ near-you row
│ │ ██ ᯤ 4 min   19 min   34 min ██   │ blue strip 48dp
│ │ ( Stop details › )  ( 🚶 Walk )    │
│ ○ Westheimer @ Taft (2961)           │
│ ○ ...                                │
│ 📄 PDF schedule ↗   Full timetable › │ footer links
└──────────────────────────────────────┘
```
- Source: `/api/routes/:id`, with direction stops in order. Live times come from `/api/arrivals?stop=&route=` fetched **when a row is expanded** (and prefetched for the near-you row). `/api/vehicles?route=` puts small bus icons (#004080 on white, 20dp) on the spine between stops where buses currently are.
- Header: today's navy square badge (56dp, 28sp Medium white) and the bold route name. The ☆ saves the route to Recent › Saved.
- The alert line uses the same pink box, or "✓ No alerts for Route 82" (J4.4, F6).
- Direction: a segmented control of two 48dp segments with the selected one in #2976C7 and white text. Labels come from `RouteDirection.label`, and the headsign is shown below.
- The stop list is the **timetable spine kept visually** (grey spine, ring nodes). Rows are 48dp and 16sp, with "(ID)" in #6A6A6A. The list **scrolls to and expands the stop nearest you**, marked "⌖ you" (14sp #2A82E6). Tapping any row expands it inline with the blue strip, "Stop details ›" and "Walk". Only one row is expanded at a time.
- The find field filters rows live (by name or ID).
- Today's Full timetable (hourly grid) and PDF link stay in the footer, so nothing is removed.
- The map is not shown on this page. A "Show on map" icon in the app bar draws the navy route line on Explore.

### 3.7 Transit Center view (new; reached from a TC card, a TC pin or search)

```
┌──────────────────────────────────────┐
│ ←  Northwest Transit Center     ☆    │ 22sp
│    6 min walk · 12 bays              │ 14sp
│ [All] [58] [ 26] [ 70] [ 85]→        │ chip filter row
│ ┌──────── bay map (static) ────────┐ │ 140dp mini map
│ │  A  B  C  D  E  F    (you ◉)     │ │ bay pins labeled
│ └──────────────────────────────────┘ │
│ BAY C                          🚶 ›  │ 15sp Bold navy
│ [58] OUTBOUND to HILLCROFT           │
│      ᯤ 4 min  19 min  34 min         │ 20sp
│ [70] TO MEMORIAL CITY  11 min 41 min │
│ BAY D                          🚶 ›  │
│ [85] TO ANTOINE ...                  │
│ OTHER ROUTES (bay not published)     │ 14sp #6A6A6A
│ [26] ...                             │
│ Updated 8 sec ago                    │
└──────────────────────────────────────┘
```
- Source: `/api/transit-centers/:id` (bays with departures, `unassignedDepartures`).
- It shows **departures only**, not arrivals ending at the TC (J1.5). Bays are ordered by letter. Each bay header gets a walk icon that walks you to that bay pin.
- The chip filter row limits the list to one route. In F7, the rider comes pre-filtered from the home chip.
- Bay map: a MapLibre mini-map (non-interactive, 140dp) with letter pins at the real bay coordinates. Tapping it opens it full screen.
- Honesty: if `source` is "hand-authored-demo", the footer says "Bay assignments are from METRO's printed map and may change." Routes without a bay go under OTHER ROUTES.

### 3.8 Trip planner form (Plan Your Trip, kept)

```
┌──────────────────────────────────────┐
│ ←  Plan Your Trip                 ✕  │ 22sp
│ ┌──────────────────────────────────┐ │ #F3F2F8 r12
│ │ ●  My current location           │ │ 18sp Medium
│ │ ↓  ─────────────────────────(⇅)  │ │ swap 40dp
│ │ 📍 Where to?|                     │ │ red pin #FF0000
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ 🕒 Leave at            Now  ▾    │ │ 53dp
│ └──────────────────────────────────┘ │
│ [ Now ][In 15 min][In 30 min][In 1 hr]│ chips 40dp
│ ★ SAVED & RECENT                     │
│ 🏠 Home … / 📍 Hobby Airport (recent)│ 56dp rows
│ ╭──────────────────────────────────╮ │
│ │         Plan My Trip             │ │ 48dp #2976C7
│ ╰──────────────────────────────────╯ │
└──────────────────────────────────────┘
```
- Same layout, colors and chips as today. The changes:
  - **"Where to?" autofocuses** when opened from the Plan Trip FAB.
  - Picking a suggestion **plans immediately** (the Plan My Trip button stays for edits to time or origin).
  - The origin dot is **blue at the origin on the map too**, and the red pin is always the destination (J1.10/J3.9).
- Suggestions come from the same search (3.3). Place rows use the pin icon and stop rows the pole icon, each with a subtitle.
- **Airport and big-venue snapping** (J2.3): when the destination is a place and a METRO stop in the curated landmarks is within 400m, the planner targets that stop and shows "Going to the terminal stop: Hobby Airport (Stop #…)".
- Location unavailable: the origin reads "Location is off. Choose a starting point" in #FF3B2F, and focus moves to it (J2.10). The button is disabled with that reason written under it.

### 3.9 Itinerary list (Select Itinerary, kept)

```
┌──────────────────────────────────────┐
│ ←  Select Itinerary               ✕  │
│ ● My location  →  📍 Hobby Airport   │ 16sp, tappable
│ Leave now · Fri 5:03 PM              │ 14sp
│ [Fewer transfers] [Fastest] [Least walking] │
│ ┌──────────────────────────────────┐ │
│ │🚶›[80]›[40]›🚶        54 min     │ │ chips 40x36
│ │ 5m  18m  22m  2m     $1.25       │ │ 13sp / fare blue
│ │ 5:10 PM – 6:04 PM   ⚠ 1 alert    │ │ 14sp
│ │ Board 80 at M L King @ UH Dr     │ │ 16sp Bold
│ │ (#11425) · NORTHBOUND · W side   │ │ 14sp
│ │ Next 80: ᯤ 6 min                 │ │ 16sp #0A7D22
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ ... option 2                     │ │
└──────────────────────────────────────┘
```
- Same card as today (#F3F2F8, radius 10dp, mode strip, right-aligned duration, blue fare #2A82E6, time range). The **new bottom block "Board … (#ID) · DIRECTION · side"** tells the rider exactly where to board without opening the card (F3, J2.1). Cards are now about 132dp tall instead of 70dp.
- Tight transfers (`hasTightTransfer`) get a "⚠ Tight transfer (3 min)" tag in #FF3B2F.
- `summary` is used for screen readers.
- Empty or failure: the `message` from `/api/plan` is shown inline (no modal), with actions [Leave later] [Start from a nearby stop] [Edit trip] (J2.4).
- Offline fixture: a banner reads "Sample trips (offline demo), recorded <time>".

### 3.10 Itinerary detail (My Itinerary, kept, with every step tappable)

```
┌──────────────────────────────────────┐
│ map framed on whole trip, labeled    │ board/transfer
│ pins "Board 80 · #11425", dest 📍    │ pins labeled
│╭────────────────────────────────────╮│
││ ←  My Itinerary       54 min    ✕  ││ 22sp
││ Arriving at 6:04 PM · $1.25        ││
││ ┌────────────────────────────────┐ ││ timeline #F3F2F8
││ │● Walk 5 min · 0.2 mi         › │ ││ dotted
││ │┆  to M L King @ UH Dr (#11425) │ ││
││ │┆  NORTHBOUND · West side       │ ││
││ │█ [80] Board to DOWNTOWN TC   › │ ││ navy line
││ │█  "80 DOWNTOWN" on the bus sign│ ││ 14sp
││ │█  5:10 PM · ᯤ in 6 min · 7 stops││
││ │█  Get off at Griggs @ … (#…)  › │ ││
││ │█  ⚠ Detour at … (tap to read) › │ ││ pink box
││ │● Transfer: wait 4 min, same    │ ││
││ │   stop                         │ ││
││ │█ [40] Board to HOBBY AIRPORT … │ ││
││ │📍 Hobby Airport  6:04 PM        │ ││
││ └────────────────────────────────┘ ││
││ ╭────────────────────────────────╮ ││
││ │         ▶ Start trip           │ ││ 48dp #2976C7
││ ╰────────────────────────────────╯ ││
│╰────────────────────────────────────╯│
└──────────────────────────────────────┘
```
- Source: the chosen `Itinerary` (legs, `board`/`alight` `PlanStop` with id, `directionLabel`, `side`, `bay`, `headsign`, `numStops`, `transfer`).
- Same timeline as today: blue origin dot, navy (#004080) or `route.color` bus line, red rail line, dotted walk, red destination pin. Instructions are now 16sp and duration badges 13sp.
- **Wording** (J2.5/J3.8): "Board **80** to **DOWNTOWN TC**" (headsign in caps, as on the bus sign), then "Get off at <stop> (#ID)". The confusing "Transfer to <alight stop>" wording is gone. Transfers are their own row: "Transfer: wait 4 min, same stop" or "Transfer: walk 2 min to Bay C".
- **Tappable** (J2.2): the board or alight stop row opens that Stop sheet (live times, walk). A walk row opens Walk directions. A pink alert box opens Alert detail. There is no dead-end styling.
- The map frames the full trip above the sheet with padding. Board and transfer points are labeled pins ("Board 80 · #11425"). Each leg is colored by route, with a white casing so two bus legs are distinguishable (J2.7).
- Close X or back returns to the list. **Swipe-down minimizes** to a 96dp peek ("My Itinerary · 54 min · ▶ Start"), and the trip is kept until the rider picks another or ends it (J2.6).
- **▶ Start trip** (today's "Track Itinerary", renamed and with the same position and style) goes to Live trip.

### 3.11 Live trip mode (new "Go" state, in the same sheet frame)

```
┌──────────────────────────────────────┐
│ ● Trip in progress · ends 6:04 PM  ✕ │ 40dp bar #005DAA
│  map follows you; next stop pin      │ white text
│  enlarged; live 80 bus icon          │
│╭────────────────────────────────────╮│
││ STEP 2 OF 4                        ││ 14sp caps #414752
││ Ride [80] to DOWNTOWN TC           ││ 20sp Bold
││ Get off at Griggs @ MLK (#…)       ││ 18sp
││ ┌────────────────────────────────┐ ││
││ │    3 stops left  · ~6 min      │ ││ 30sp white on
││ └────────────────────────────────┘ ││ #005DAA (strip)
││ Next: Griggs @ Coyle               ││ 16sp
││ ━━━━━━━━━━━━━━━●━━━━━ (progress)   ││ 6dp navy
││ 🔔 We'll alert you 2 stops before  ││ 14sp #0A7D22
││ ( All steps )     ( End trip )     ││ 48dp pills
│╰────────────────────────────────────╯│
└──────────────────────────────────────┘
```
- The step card follows the leg: **Walk** ("Walk 3 min to stop #11425, west side", with the next bus countdown), **Wait** ("Your 80 comes in ᯤ 6 min. Stand at stop #11425"), **Ride** (above), **Transfer**, and **Final walk** to the destination (J3.7).
- Progress on a ride = the intermediate stop nearest to the GPS position (`intermediateStops` plus the stop coordinates from `/api/trips/:id`). The vehicle comes from `/api/vehicles?route=` matched on `tripId`.
- **Alerts fire by stops remaining, not metres** (J3.2): "Get ready: your stop is next" at 1 stop left, and "Get off now: Griggs @ MLK" when within 150m of the alight stop and moving. Each alert gives route, direction, stop name and ID (J3.5). There are no RT/SC codes.
- **Off-route** (J3.4): if the rider is more than 200m from the leg geometry for 60s, a banner shows "You seem off the route. [Re-plan from here]", which plans from the **current** GPS fix.
- Notifications: the permission is asked here, with a sentence first. If declined, it says "Alerts will show in the app only." Screen Wake Lock keeps the screen on; this is on by default and toggled from "All steps ›". An honest line under the bar says: "Keep RideMETRO open for alerts. Phones may pause web apps in the background." When the app becomes visible again, tracking resumes and says "Back on track: step 2 of 4" (the fix for J3.1 as far as a PWA allows).
- The top bar "Trip in progress" persists on every Explore sub-screen while a trip is active. Tapping it returns here, as today's green bell FAB did (the bell is kept as the FAB icon while tracking).

### 3.12 Alerts

**Service Alerts list** (More › Service Alerts, now in-app; also reached from any ⚠ box)
```
┌──────────────────────────────────────┐
│ ←  Service Alerts                    │ 22sp
│ [My routes] [All routes]             │ chips 40dp
│ ┌──────────────────────────────────┐ │ #F4DFE4 border
│ │⚠ [82] Detour: Westheimer at Kirby│ │ #F7BBBB r8
│ │  Until Oct 3 · Construction      │ │ 14sp #414752
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │⚠ [Red] Weekend single-tracking   │ │
│ └──────────────────────────────────┘ │
│ ✓ No alerts for your saved routes:   │ 14sp #0A7D22
│   40, 41                             │
│ Source: METRO · Updated 1 min ago    │
└──────────────────────────────────────┘
```
- Source: `/api/alerts` (filter by `routeId`/`stopId`). "My routes" = routes at saved stops, saved routes and nearby routes. Text is in the chosen language when `header[lang]` exists, otherwise English with the label "Available in English only".
- **Alert detail**: the header in 20sp Bold, the active dates ("From Sep 25, 5:00 AM until Oct 3"), the effect in plain words (DETOUR → "Detour", NO_SERVICE → "No service", REDUCED_SERVICE → "Less frequent service"), the full description in 16sp, then **Affected stops** (tappable rows with IDs) and **Affected routes** (chips).
- If `source` is "demo", the footer says "Demo alerts (live METRO feed unavailable)".

### 3.13 Saved stops (in the Recent tab)

```
┌──────────────────────────────────────┐
│ Recent                        CLEAR  │ 22sp, CLEAR blue
│ ★ SAVED STOPS                   Edit │ 15sp caps
│ ┌──────────────────────────────────┐ │
│ │Westheimer @ Montrose (2958)      │ │ nearby-card
│ │EASTBOUND · 0.8 mi                │ │ component
│ │[82] TO DOWNTOWN ᯤ 4 min  19 min  │ │
│ └──────────────────────────────────┘ │
│ RECENTLY VIEWED ROUTES               │
│ [82] [40] [58]                       │ big chips 56dp
│ RECENTLY VIEWED STOPS                │
│ 🚏 Lamar St @ Main St (342)       ›  │ 56dp rows
│ RECENT TRIPS                         │
│ ● → 📍 Hobby Airport          ▶ Plan │ one-tap re-plan
└──────────────────────────────────────┘
```
- Saved data is kept in `localStorage` (wrapped in try/catch). **CLEAR** clears the three recent sections after a confirmation ("Clear recent history? Saved stops stay."). Edit lets the rider reorder or remove saved stops (drag handles, or ↑/↓ buttons for accessibility).
- Empty saved state: "Tap ☆ Save on any stop to see its next buses here and on Explore."

### 3.14 Fares (stub plus real info)

```
┌──────────────────────────────────────┐
│ Fares                                │ 22sp
│ ┌──────────────────────────────────┐ │ #F3F2F8
│ │ 🎫 My ticket                      │ │ 18sp Bold
│ │ Sign in with your RideMETRO      │ │ 16sp
│ │ account to show your ticket.     │ │
│ │ ╭──────────────────────────────╮ │ │
│ │ │ Sign in to show ticket  ↗    │ │ │ 48dp #2976C7
│ │ ╰──────────────────────────────╯ │ │
│ │ Handoff to METRO (not in this    │ │ 14sp #6A6A6A
│ │ prototype)                       │ │
│ └──────────────────────────────────┘ │
│ FARES                                │ caps blue #005193
│ Local bus & METRORail      $1.25     │ 48dp rows
│ Day pass                   $3.00     │
│ Park & Ride (by zone)  $2.00–$4.50   │
│ REDUCED FARES                        │
│ Seniors 65–69, students,             │
│   riders with disabilities   $0.60   │
│ Seniors 70+                  Free    │
│ Transfers: free for 3 hours          │
│ How to get reduced fare ↗            │
│ Where to buy (retailers) ↗           │
└──────────────────────────────────────┘
```
- The tab is reached in 1 tap (F9). The fare table comes from a static `fares.json`, and the values **must be confirmed by METRO before launch** (marked in the file).
- The sign-in button opens a modal: "Sign-in and payment are handled by METRO's system. In the real app this opens METRO's secure sign-in." [OK]. No credential fields are ever shown.

### 3.15 More and Settings

```
┌──────────────────────────────────────┐
│            [METRO logo]              │
│ RIDER RESOURCES                      │ 15sp caps #005193
│ Route Schedules                   ›  │ 48dp → 17sp
│ Service Alerts                    ›  │ (now in-app)
│ Fare Card Retailers               ↗  │
│ Learn How to Ride                 ›  │
│ RideMETRO.org                     ↗  │
│ ──────────────────────────────────── │ #C1C6D4
│ SETTINGS                             │
│ Language                 English  ›  │
│ Text size                Large    ›  │
│ Location                 On       ›  │
│ Notifications            Off      ›  │
│ Show welcome again                ›  │
│ ──────────────────────────────────── │
│ CONTACT US                           │
│ Customer Service  713-635-4000    ↗  │
│ ABOUT · Data sources · Version       │
└──────────────────────────────────────┘
```
- The list is the same as today (48dp rows, blue caps headers, › for in-app, ↗ for external). Rows are 56dp in Large text and above.
- **Route Schedules** opens a searchable list of routes: a chip plus the name, which opens the Route page.
- **Language**: a radio list (English, Español) that applies to the UI, date and time formats and alert text where the translation exists (J4.11). Vietnamese and Chinese are listed as "Coming soon", since METRO serves these communities.
- **Text size**: a radio list (Standard / Large / Extra large) with a live preview card showing a stop card at that size.
- **Location**: shows the status. If denied, it gives steps: "Chrome › ⋮ › Settings › Site settings › Location › RideMETRO › Allow", with a [Try again] button that re-calls geolocation.
- Notifications: status plus a test button.

### 3.16 Location denied or unavailable

```
┌──────────────────────────────────────┐
│ ╭[METRO] Place, Stop, or Route  🔍╮  │
│  map at Downtown Houston, NO blue dot│
│  label chip "Showing Downtown"       │ white chip
│╭────────────────────────────────────╮│
││ 📍 Location is off                  ││ 20sp Bold
││ We can't show stops near you.      ││ 16sp
││ ╭────────────────────────────────╮ ││
││ │   Turn on location             │ ││ 48dp #2976C7
││ ╰────────────────────────────────╯ ││
││ ( Search a place or stop )         ││ 48dp outline
││ ★ SAVED STOPS (still live)         ││
││ ...                                ││
│╰────────────────────────────────────╯│
└──────────────────────────────────────┘
```
- The app never pretends to be at Museum District (J1.7/J4.2). Saved stops and search work fully. Walk times are hidden.
- "Turn on location" re-requests permission. If the browser blocks it, the Settings steps from 3.15 are shown.
- **No fix yet (but allowed):** "Finding your location…" with a spinner. After 15s it shows "Still looking. Try moving near a window, or search instead."

### 3.17 Offline and error states

| Situation | UI |
|---|---|
| Offline | A 36dp grey banner under the search bar (#414752 background, white 14sp): "Offline · times from 5:42 PM may be out of date". Times turn black (not green) and show "Scheduled". The service worker caches the app shell, stops/routes JSON and the last responses. |
| Live source down (`source: "schedule"`) | Inline in the card: "Live times unavailable. Showing scheduled times." Never an empty card (complaint 2.1). |
| Vehicle not seen for more than 2 min | The arcs icon goes grey and the text reads "Tracking lost, scheduled time shown". |
| API error | An inline card: "Something went wrong loading stop 342." [Try again]. Never a modal with only OK. |
| Plan returns nothing | See 3.9. |
| Walk fallback | See 3.5. |
| Stale data (>90s) | "Updated 2 min ago" turns #FF3B2F and auto-refreshes. |

---

## 4. Flows F1–F11: new step paths

Actions are counted as in the baseline (taps, typed fields, swipes, back presses, system dialogs). Launch = cold start of an onboarded app unless stated otherwise.

| Flow | New path | New | Baseline | Target |
|---|---|---|---|---|
| **F10** First launch → usable map | 1. Tap **Show stops near me** · 2. Tap **Allow** on the OS location dialog → Explore with nearby stops, no overlays | **2** | 14 | ≤3 ✅ |
| **F1** Nearest stop for 40 NB + next bus | 1. Tap chip **[40]** in the sheet's route row → "Route 40 near you" shows **Lamar St @ Main St (342) · NORTHBOUND · East side of Main · 1 min walk · ᯤ 4 min** (0 actions if the 40 is already in the first card, as at 342 downtown) | **1** (0–1) | 2 (4) | ≤1 ✅ |
| **F2** Next 82 at saved stop 2958 | 0. Launch → ★ SAVED card "Westheimer @ Montrose (2958) · [82] TO DOWNTOWN ᯤ 4 min" is at the top of the sheet | **0** | 3 | 0 ✅ |
| **F3** UH → Hobby, know where to board | 1. Tap search bar · 2. Type "hobby" · 3. Tap **Directions** on "Hobby Airport" → itinerary list; card 1 shows "Board 80 at M L King @ UH Dr (#11425) · NORTHBOUND · West side" and the headsign. (Opening detail for the full walk, step 4, is optional.) | **3** | 10 | ≤4 ✅ |
| **F4** Walking directions to stop 342 | 1. Tap **🚶 Walk 1 min** on the 342 card in Nearby → street-routed path plus steps in ft. (Not in the list: search → type "342" → 🚶 on the result = 3.) | **1** | impossible | ≤2 ✅ |
| **F5** Route 82 → EB arrivals at Westheimer @ Montrose | 1. Tap search bar · 2. Type "82" · 3. Tap **Eastbound** on the route result → Route page EB, scrolled to the near-you stop, already expanded with live times (the scenario's GPS is at Montrose) · 4. (If not near you) type "Montrose" in Find a stop, or tap the row → strip with live times | **3–4** | 9 (18) | ≤4 ✅ |
| **F6** Alert on Route 82? | 1. Tap search bar · 2. Type "82" → the route result says "⚠ 1 alert: Detour at …" or "✓ No alerts for Route 82". (3. Tap it for the full text.) | **2** | 6, partial | ≤2 ✅ |
| **F7** NW TC: bay for 58, next departure | 1. Tap chip **[58]** in the sheet → "Route 58 near you": **Northwest TC · Bay C · OUTBOUND to … · ᯤ 4 min · 6 min walk**. (Alternative: tap the TC card's "Departures by bay", then chip 58 = 2.) | **1** | 2 (14) | ≤2 ✅ |
| **F8** Start live trip (UH → Hobby) | 1. Tap search bar · 2. Type "hobby" · 3. **Directions** · 4. Tap itinerary card 1 · 5. **▶ Start trip** → "Trip in progress", step card "Walk 5 min to stop #11425". The notification prompt is inline and optional; tracking already runs. | **5** | 9, partial | ≤5 ✅ |
| **F9** Ticket / fare screen | 1. Tap **Fares** → the "Sign in to show ticket" stub (handoff to METRO) plus the fare table with reduced fares | **1** | 1 (wall) | 1 ✅ |
| **F11** HMNS → closest stop → arrivals | 1. Tap search bar · 2. Type "museum of natural science" · 3. Tap the landmark row → map centers on HMNS; sheet "Stops near Houston Museum of Natural Science", sorted by walk time, with all routes and next times | **3** | 6, partial | ≤3 ✅ |

Alternative paths that stay familiar: the Plan Trip FAB path for F3 (FAB → type → pick → [auto-plans] = 3) and the F8 equivalent (5). Every flow reaches the goal with the information the baseline marked as missing now on screen: stop ID, direction, side, walk time, headsign, bay, and alert or no-alert status.

---

## 5. Audit findings (CRITICAL / HIGH) → fixes

| Finding | Severity | Fix in this design |
|---|---|---|
| J1.1 Stops are tiny unlabeled dots | CRIT | 28dp blue pins with a direction notch, "342" labels at zoom ≥ 16, clustering, readable accessibility labels (2.2) |
| J1.2 Nearby list has no stop, distance or side | CRIT | Nearby list grouped by stop: name (ID), direction, side, walk min, sorted by walk time (2.2) |
| J1.3 No walking directions | CRIT | "Walk here" on every stop card and sheet, OSRM street path, steps in ft/mi (3.5) |
| J1.4 Walk leg is a straight line | HIGH | Walk legs use `/api/walk` geometry and are tappable to show steps (3.10, 3.5) |
| J1.5 TC bays stacked; arrivals not departures | HIGH | Bay pins at real coordinates; Transit Center view with departures by bay (3.7) |
| J1.6 Panning replaces nearby results | HIGH | Nearby anchored to the user; explicit "Search this area" pill (2.2) |
| J2.1 Boarding stop lacks ID, direction, side | CRIT | "Board 80 at … (#11425) · NORTHBOUND · West side" on the list card and in detail (3.9, 3.10) |
| J2.2 Itinerary steps are dead ends | CRIT | Every stop, walk and alert row opens its screen (3.10) |
| J2.3 Airport place adds a 17-min wrong walk | CRIT | Place-to-terminal-stop snapping with a disclosure line (3.8) |
| J2.4 "Cannot find any trips" for routable trips | HIGH | Stop-snapped endpoints; inline message with Leave later / Nearby stop / Edit actions (3.9) |
| J2.5 "Transfer" misuse, no headsign | HIGH | "Board 80 to DOWNTOWN TC", sign text, separate Transfer rows (3.10) |
| J2.6 Swipe down discards the trip | HIGH | Swipe minimizes to a peek; explicit ← and ✕ (2.1, 3.10) |
| J2.7 Itinerary map poorly framed | HIGH | Fit to the whole trip above the sheet, labeled board/transfer pins, per-route leg colors, blue origin / red destination (3.10) |
| J3.1 Tracking dies in the background | CRIT | Wake Lock, resume on visibility with "Back on track", honest "keep open" note, persistent in-app trip bar (3.11) |
| J3.2 Stop alerts need 5 or 25m | CRIT | Alerts by stops remaining ("next stop") plus a 150m radius (3.11) |
| J3.3 No step-by-step guidance | HIGH | Live step card: Walk / Wait / Ride / Transfer / Final walk, with a stops-left strip (3.11) |
| J3.4 No off-route detection; frozen origin | HIGH | 200m/60s off-route banner; re-plan from the current fix (3.11) |
| J3.5 Stop alerts lack route, direction, ID; RT/SC codes | HIGH | Every alert names the route, direction, stop and ID; no codes; live/scheduled in words (3.11) |
| J4.1 No favorites | HIGH | ☆ Save on the stop sheet and route page; SAVED at the top of Explore and Recent (3.4, 3.13) |
| J4.2 Location denied fakes a location | HIGH | "Location is off" card, no fake dot, re-request plus Settings steps (3.16) |
| J4.3 Route → stop takes 10 taps plus a timetable | HIGH | Direction pills in search; Route page with an ordered, searchable stop list scrolled to you, with live times inline (3.6) |
| J4.4 Alerts on an external site | HIGH | In-app alerts list and detail; alerts on stop, route, search result and itinerary; explicit "No alerts" (3.12) |
| J4.5 Tiny overlapping pins only in a circle | HIGH | See J1.1. The circle is removed and pins show for the whole viewport. |

Medium and low findings are covered along the way: J1.7 (3.16), J1.8 (a pin opens the stop sheet directly, no "Choose Direction"), J1.9/J2.12 (time format), J1.10/J3.9 (pin colors), J1.12/J2.13/J3.10/J4.10 (no coach marks, labeled Plan Trip), J1.13 (rail moved into the sheet), J2.9/J4.6 (typed search results, "and"/"@"), J2.10 (3.8), J3.6 (schedule header), J3.7 (final walk), J3.11 (alert summaries), J3.13 (locate toast), J4.7 (one arrivals source per screen plus "Updated"), J4.8 (labels), J4.9 (cards name the stop), J4.11 (language).

---

## 6. What stays identical, and what changes and why

### Stays identical (the recognition cues)
- **Bottom nav**: Explore | Fares | Recent | More, with the same icons, order, #E4EBF6 bar and #2976C7 active pill.
- **Explore is map-first**: the white pill search bar with the METRO logo and "Place, Stop, or Route", and white rounded-square FABs on the right (locate in blue, planner with the dotted-path icon, red route-alert triangle, green bell while tracking).
- **Route chip**: a white tile with a 7dp navy top band (red for rail) and a black number, used everywhere.
- **Stop sheet**: the centered bold "Name (ID)", a route row with the long name and bold "NORTHBOUND to HEADSIGN", the **#005DAA blue strip with 30sp white minutes** and live arcs, and the Scheduled / Live / Canceled legend.
- **Arrival semantics**: green with arcs = live, black = scheduled, red strike-through = canceled.
- **Plan Your Trip form**: blue dot, down arrow, red pin, swap circle, "Leave at", the Now / 15 / 30 / 1 hr chips, the full-width Plan My Trip button, and the titles "Select Itinerary" / "My Itinerary".
- **Itinerary cards and timeline**: mode strip, right-aligned duration, blue fare, time range, sort chips, colored leg lines, dotted walks and the pink Alert box.
- **More list**: blue caps headers, 48dp rows, › for in-app and ↗ for external. **Recent** keeps its title, CLEAR and big route chips.
- Roboto, flat M3 surfaces, 16dp margins, 28dp sheet corners, #F3F2F8 cards, and the polite institutional tone.

### Changes, and the one-line justification a long-time rider would accept

| Change | Why (in rider words) |
|---|---|
| The Nearby list is grouped **by stop**, sorted by walk time | "It now tells me which stop, how far, and which side, instead of 59 route cards." |
| The route chips move from the left of the map into the sheet | "Same chips, and they no longer cover the map." |
| Bigger, labeled stop pins; no blue circle | "I can see which pin is my stop, and the list doesn't jump when I move the map." |
| "Plan Trip" label on the planner button | "I always wondered what that button was." |
| ☆ Save, and SAVED at the top of Explore and Recent | "My stop is right there when I open the app." |
| Walk here | "It finally shows me how to walk to the stop." |
| Search results have buttons instead of the "What do you want to do?" pop-up | "One tap less, and I can see what each button does." |
| Route page with an ordered stop list and live times | "I don't have to scroll a 4 AM timetable to find my stop." |
| Transit center departures by bay | "It tells me which bay to go to." |
| The itinerary says where to board (stop #, direction, side, bus sign) and every step opens | "I know which side of the street to stand on." |
| Start trip gives a live step card and "next stop" warnings | "It tells me when to get off before we're at the stop." |
| Service Alerts in the app, and "No alerts" stated | "I don't get thrown into a website, and I know when all is fine." |
| Larger type (16sp body, 20sp times), a Text size setting, and darker green text | "I can read it without my glasses." |
| One welcome screen, no coach marks, notifications asked only when needed | "It just opens." |
| Honest location, offline and live-lost states | "It doesn't pretend I'm in Museum District, or that a bus is live when it isn't." |
| Fares shows prices and reduced fares, with sign-in handed to METRO | "I can check the senior fare without signing in." |

### Deliberately not changed or added
- There is no new tab, no Home or Now tab, and no new color. The nav and palette are sacred.
- The Full timetable and PDF schedule are kept for riders who rely on them (the NYC lesson: never remove relied-on features).
- There are no ads, no social features and no crowding data, because the backend has no data to support them.
