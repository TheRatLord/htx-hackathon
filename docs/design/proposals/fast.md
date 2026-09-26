# Proposal "FAST": fewest steps first

**Lens.** Every flow in `docs/baseline-steps.md` should take as few actions as possible, and the answer should usually already be on screen at launch. The app should still look like RideMETRO: the same bottom nav, pill search bar, navy-banded route chips, grey arrival cards, blue live-minutes strip and Plan Your Trip form. We change where information appears and how many screens stand between the rider and the answer. We leave the look alone.

**Headline result.** Every flow meets its target. Nine of the 11 beat it.

| Flow | Baseline (expert) | Target | FAST |
|---|---|---|---|
| F10 First launch | 14 | ≤ 3 | **2** |
| F1 Nearest stop, Route 40 NB | 2 (4 first-timer) | ≤ 1 | **1** (0 when 40 is in the first stop group) |
| F2 Saved stop, next 82 | 3 | 0 | **0** |
| F3 Plan UH → Hobby, know where to board | 10 | ≤ 4 | **3** |
| F4 Walk to stop #342 | impossible | ≤ 2 | **1** |
| F5 Route 82 → stop → EB live times | 9 (18) | ≤ 4 | **3** |
| F6 Alert on Route 82? | 6, partial | ≤ 2 | **2** (0 if 82 is at a saved stop) |
| F7 NWTC bay for 58 + next departure | 2 (14) | ≤ 2 | **1** |
| F8 Start live trip | 9, partial | ≤ 5 | **5** first time (4 after) |
| F9 Fares / ticket | 1 (wall) | 1 | **1** |
| F11 Landmark → closest stop → arrivals | 6, partial | ≤ 3 | **3** |

Actions are counted the way the baseline counts them: taps, typed fields, swipes, back presses, system dialogs and overlay dismissals. Tapping the search bar is 1 action and typing the query is 1 more. There are no coach marks, so first-timer counts equal expert counts.

---

## 1. Principles

1. **The answer is the home screen.** At launch the sheet already shows saved stops and the nearest stops, with live times, walk minutes, direction and side of street. Most riders should never need a second screen.
2. **One tap from any stop to its next action.** Every stop row and stop card has **Walk here**, **Save** and the live times inline. There is no "What do you want to do?" dialog anywhere.
3. **Put the decision where the question is asked.** Search results carry the next step: a route result has EASTBOUND / WESTBOUND buttons and its alert status, and a landmark result names its closest stop. An itinerary card carries the boarding stop ID, direction, side, headsign and a **Start** button.
4. **Never make the rider prove where they are.** Nearby follows the GPS dot, not the map centre. When location is off we say so and never pretend. Panning shows a "Search this area" pill and never silently replaces results.
5. **Say the negative.** "No alerts for Route 82", "Scheduled time (no live tracking)", "No trips found. Here is the walk instead." A missing state is never a blank.
6. **Big, plain and familiar.** Keep the RideMETRO palette, Roboto and components, but use at least 16sp for body text, 22sp bold for arrival minutes and 48dp touch targets. Times are always written "4 min" or "5:10 PM".
7. **Ask only when needed.** One welcome screen and location only. Notifications are asked when a trip starts. There are no coach marks: the labels do the teaching.
8. **Honest data.** Every time is either green **Live** (with its age) or black **Scheduled**. Demo or hand-authored data (alerts, some bays) carries a small "Demo data" tag. Login and payment are clearly labelled **"Handled by METRO account (handoff)"**.

---

## 2. Information architecture

### 2.1 Bottom navigation (kept, one relabel)

Same bar as today: 80dp tall plus the gesture inset, background `nav-bg` #E4EBF6, active pill 64x32dp `primary` #2976C7 with a white icon, labels 12sp Medium (active label Bold #191C21, inactive #414752).

| # | Label | Icon (Material Symbols Outlined) | Contains |
|---|---|---|---|
| 1 | **Explore** | `travel_explore`-style map + pin (as today) | Map + home sheet (Where to?, saved stops, near you), search, stop card, walk, route page, transit centre, planner, itineraries, live trip |
| 2 | **Fares** | stacked tickets `confirmation_number` (as today) | Fare table incl. reduced fares, "Show my ticket" handoff stub |
| 3 | **My Stops** (was "Recent") | bus-stop pole (same icon as today) | Saved stops with live times, saved places (Home/Work), recent stops and searches, CLEAR |
| 4 | **More** | `menu` (as today) | Service Alerts (in-app), Settings (language, text size, location), Rider resources, Contact |

Why relabel Recent: it keeps the same slot and icon, and Recent still lives inside it. "My Stops" tells a rider where saving puts things. Recent disappearing from the nav would be the only real loss, and it doesn't disappear. The alerts tab we might have added is not needed, because alerts appear on the route, stop, itinerary and home sheet, and the full list is one tap away in More.

Pushed screens (route page, transit centre, itinerary detail, walk, settings, alerts list) use today's app bar: 56dp tall, blue `arrow_back` #2A82E6, 22sp title #1D1B20, background #F9F9FF. The bottom nav stays visible on Explore sub-screens so Fares is always one tap away. It is hidden only in Walk and Live Trip, where the map needs the room.

### 2.2 Home screen at launch (Explore, sheet at HALF)

This is the whole product in one screen.

```
┌────────────────────────────────────────┐
│ 9:41                        ▾ ▴ ▮      │ status bar
│ ╭────────────────────────────────────╮ │
│ │[METRO] Place, Stop, or Route    (Q)│ │ search pill 48dp, 16dp margins
│ ╰────────────────────────────────────╯ │
│        ·  ·   Main St                 ▣│ [◎] locate FAB 48dp
│   [342▲]        ·                      │ labelled stop pins
│          (●) you     [661▼]            │
│  ·        ·      [4960▶]               │ map ~38% of screen
│╭──────────────────▬───────────────────╮│ handle 32x4 #414752
││ ╭────────────────────────────────╮   ││
││ │ (o)→(!) Where to?               │  ││ Where-to field 56dp #F3F2F8
││ ╰────────────────────────────────╯   ││
││ [!] Route 82: Detour on Westheimer ›  ││ alert strip 48dp (only if saved
││                                        ││   routes affected) #F4DFE4
││ SAVED                                  ││ section header 14sp caps #414752
││ ┌────────────────────────────────────┐││
││ │* Westheimer @ Montrose (2958)      │││ 18sp Bold
││ │  Eastbound · South side            │││ 15sp #414752
││ │  [82] TO DOWNTOWN    4 min   19 min│││ 22sp Bold green = live
││ └────────────────────────────────────┘││
││ NEAR YOU                 Live · 12 s ↻ ││
││ [All][40][44][82][85][Red]  ›          ││ route filter chips (old rail)
││ ┌────────────────────────────────────┐││
││ │Lamar St @ Main St (342)  [Walk 2m] │││ Walk pill 40dp #2976C7
││ │Northbound · East side · 450 ft     │││
││ │[40] TO N SHEPHERD P&R  4 min 19 min│││
││ │[44] TO ACRES HOMES     7 min 27 min│││
││ └────────────────────────────────────┘││
││ ┌────────────────────────────────────┐││
││ │Main St @ Lamar St (661)  [Walk 3m] │││
││ │Southbound · West side · 700 ft     │││
│╰────────────────────────────────────────╯│
│ [Explore]   Fares    My Stops    More  │ bottom nav 80dp #E4EBF6
└────────────────────────────────────────┘
```

**Load order and content (all live on first paint, skeletons for at most 300 ms):**
1. Map: OpenFreeMap vector tiles restyled to the Google-light look (land #F5F3F3, parks #C3F1D5, water #AADAFF, roads white with #E0E0E0 casing, highways #B9C6D8). Centred on the GPS fix at z16. **No blue radius circle.**
2. Stop pins near the user (from `stops.json`). At z≥15 each pin is a 28dp rounded marker in #4994EC with a white direction arrow from `bearing`. At z≥16 the marker gains a white label chip "342". Below z15, pins cluster into a count bubble (#2A82E6, white 14sp). Rail stations use a red #EF0000 marker and transit centres a navy #004080 "TC" marker.
3. Sheet (half = 58% of the viewport). The sections in order:
   - **Where to?** A 56dp field, radius 12dp, #F3F2F8. Inside: the blue origin dot (#2A82E6), an arrow and the red destination pin (the trip-planner FAB icon made into a labelled field), and the placeholder "Where to?" 18sp #414752. Tapping it opens the planner with the To field focused.
   - **Alert strip**, only when an active alert touches a saved stop or one of its routes. 48dp, bg #F4DFE4, 1dp border #F7BBBB, red `error` icon #FF3B2F, text 16sp #1D1B20 "Route 82: Detour on Westheimer", chevron.
   - **SAVED**: up to 3 saved stop cards (§3.12 shows the anatomy). Hidden when nothing is saved. On first use it is replaced by a single 15sp hint line: "Tap * on any stop to keep it here."
   - **NEAR YOU**: header 14sp caps #414752, and on the right "Live · 12 s" in green #007A1A with the refresh icon #4A95E9. Below it the route filter chip row (the old left rail, turned horizontal): chips 48x44dp, white, 7dp navy #004080 top band (red #EF0000 for rail), number 17sp Bold black, 8dp gap, scrolling horizontally; "All" is selected by default (selected = #C6C6C6 fill, as today). Then **stop groups sorted by walk time** (from `/nearby`, `walkMin`). At most 6 stops, then "Show more stops".

**Sheet states.**
- **Peek (160dp):** handle, the Where-to field, and one line "3 stops within 5 min walk". This is used when the rider drags down or while a map pin is selected.
- **Half (default, 58%):** as drawn above.
- **Full (100% minus 48dp):** the same content scrolled. The search pill stays pinned above it.

The sheet never closes completely on Explore, and a drag down stops at peek (fixes the "swiped away" class of J2.6 bugs).

**Map interactions.** Tapping a stop pin opens the Stop card sheet directly for that stop, with no "Choose Direction" step (J1.8). Panning more than 400 m from the fix shows a floating pill "Search this area" (40dp, white, shadow, 15sp #2976C7). Near You changes only if the rider taps it, and the header then reads "NEAR MAP CENTER" with a "Back to my location" link (J1.6).

---

## 3. Screen-by-screen spec

Shared tokens, used by name:

| Token | Hex | Use in FAST |
|---|---|---|
| `brand-navy` | #004080 | route chip band, route badge, bus polyline |
| `brand-blue-deep` | #005DAA | live-minutes strip, dialog titles |
| `primary` | #2976C7 | filled buttons, active nav pill, selected chips |
| `accent-blue` | #2A82E6 | icons, text buttons, back arrows, origin dot |
| `stop-pin` | #4994EC | stop markers |
| `surface` | #FFFFFF | sheets, search bar, FABs |
| `background` | #F9F9FF | full pages |
| `surface-container` | #F3F2F8 | cards, fields |
| `nav-bg` | #E4EBF6 | bottom nav |
| `chip-inactive` | #EBEBEB | inactive chips |
| `on-surface` | #1D1B20 | primary text |
| `on-surface-variant` | #414752 | secondary text that matters (direction, side, walk) |
| `text-secondary` | #6A6A6A | non-essential text on white only |
| `realtime-green` | #00BB1F | live arcs icon (unchanged) |
| **`realtime-green-text`** (new) | **#007A1A** | live minute text. #00BB1F on white is 2.6:1, which fails for older eyes; #007A1A is 5.5:1 on white and 4.9:1 on #F3F2F8 |
| `alert-red` | #FF3B2F | alert icons |
| **`alert-red-text`** (new) | **#C62828** | alert text (5.6:1) |
| `alert-bg` / border | #F4DFE4 / #F7BBBB | alert boxes |
| `rail-red` | #EF0000 | rail chip band and rail leg |
| `dest-pin` | #FF0000 | destination pin (always the destination, never the origin) |
| `divider` | #C1C6D4 | dividers, timeline spine |

**Type scale** (Roboto; the Settings text size multiplies all of these by 1.0 / 1.15 / 1.3):

| Role | Size and weight |
|---|---|
| Page title | 24sp Regular |
| Stop name | 18sp Bold |
| Body | 16sp |
| Direction / side | 15sp Medium #414752 |
| Headsign | 14sp Medium CAPS (was 11sp) |
| Arrival minute | 22sp Bold, "min" 14sp |
| Strip minute | 32sp Medium |
| Chip number | 17sp Bold |
| Buttons | 16sp Medium |
| Nav | 12sp |
| Legal / source tags | 13sp |

Nothing that matters is smaller than 14sp.

**Time format everywhere:**
- "Now" when under 1 min.
- "4 min" up to 59 min.
- "5:10 PM" at 60 min and over.
- A live time is green #007A1A with the arcs icon. A scheduled time is black #1D1B20 with no icon. A canceled time is struck through in #C62828 with the word "Canceled".
- On refresh, times never move by more than 1 min without an animation. We hold the last value until the new one arrives (J1.9).

### 3.1 Home / Explore

Specified in §2.2. States:
- **Loading:** grey 12dp-radius skeleton cards (#EBEBEB) for at most 300 ms, then real data.
- **No stops within 800 m:** "No stops within a 10-minute walk. The closest is Hillcroft @ Bellaire (1204), 18 min walk." with a [Walk] button. We always show at least one.
- **Location denied:** §3.18. **Offline:** §3.19.
- **Route filter chip selected (e.g. [40]):** the list switches to **one row per direction** of that route, each at its nearest stop:

```
│ NEAR YOU · ROUTE 40              [x]   │
│ ┌────────────────────────────────────┐ │
│ │[40] NORTHBOUND TO N SHEPHERD P&R   │ │
│ │Lamar St @ Main St (342)  [Walk 2m] │ │
│ │East side · 450 ft    4 min  19 min │ │
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │[40] SOUTHBOUND TO DOWNTOWN         │ │
│ │Main St @ Lamar St (661)  [Walk 3m] │ │
│ │West side · 700 ft    9 min  24 min │ │
│ └────────────────────────────────────┘ │
│ See all Route 40 stops ›               │ → Route page
```

Tapping a stop group header opens the Stop card. Tapping a route row opens the Stop card with that route's blue strip selected. Tapping [Walk 2m] opens Walk directly.

### 3.2 Search

This is a full-height sheet that slides over the map, like today. The keyboard opens with the field focused.

```
┌────────────────────────────────────────┐
│ ╭────────────────────────────────────╮ │
│ │ <-  82|                        (x) │ │ 48dp field #F2F3FB
│ ╰────────────────────────────────────╯ │
│ ROUTES                                 │
│ ┌────────────────────────────────────┐ │
│ │[82] Westheimer                     │ │ 18sp Bold
│ │ [!] 1 alert: Detour at Kirby  ›    │ │ 15sp #C62828
│ │ ┌──────────────┐ ┌──────────────┐  │ │
│ │ │EASTBOUND    ›│ │WESTBOUND    ›│  │ │ 2 buttons 48dp #F3F2F8
│ │ │to Downtown   │ │to W Oaks Mall│  │ │ 14sp headsign
│ │ └──────────────┘ └──────────────┘  │ │
│ └────────────────────────────────────┘ │
│ STOPS                                  │
│ (pole) Westheimer @ Montrose (2958)    │ 17sp Bold
│        Eastbound · Routes 82 · 0.3 mi  │ 15sp #414752
│ (pole) Westheimer @ Montrose (2981)    │
│        Westbound · Routes 82 · 0.3 mi  │
│ PLACES                                 │
│ (pin)  Montrose Blvd, Houston          │
└────────────────────────────────────────┘
```

- **Empty query:** "Recent" chips (up to 5 recent searches), then "Saved places: Home · Work" and "Search by stop number, route, street or place". The example text is 15sp #6A6A6A.
- **Route result:**
  - Direction buttons use `/routes/:id` direction labels and headsigns. Tapping one opens the Route page already in that direction.
  - The alert line comes from `/alerts?route=`. With no alerts it shows the green check `check_circle` #007A1A and "No alerts for Route 82".
- **Stop result:**
  - The icon is the stop pole, and the subtitle shows `StopSummary.subtitle`, e.g. "Stop #11424 · Southbound · Routes 25, 80", plus the distance.
  - Stops that share a `group` are shown together with a divider, so the two sides of an intersection read as a pair (J2.1, J4.6).
  - Tapping a stop opens the Stop card.
- **Landmark result:**
  - It shows the landmark icon (category glyph, navy), the name, and the line "Closest stop: Fannin @ Hermann Park Dr (2743) · 3 min walk" from `nearbyStops[0]`.
  - Tapping it opens the Landmark sheet (§3.3b).
- **Place result (Photon):** pin icon, name and address. Tapping it opens the planner with this as To, and the itineraries run immediately.
- **Number query "342":** the exact stop-ID match is pinned first with the label "Stop number match".
- **No results:** "No match for 'westheimer and kirby'. Try 'Westheimer @ Kirby' or a stop number." Below that, fuzzy suggestions. Natural "X and Y" is normalised to "X @ Y" (J4.6).
- **Offline:** stops and routes still search from the cached `stops.json` / `routes.json`. Places show "Places need a connection."

### 3.3 Stop card (sheet over the map)

Opens at half height and centres the map on the stop pin. The selected pin grows to 40dp with a callout.

```
│╭──────────────────▬───────────────────╮│
││ Lamar St @ Main St               (x) ││ 20sp Bold, left aligned
││ Stop #342 · Northbound               ││ 16sp Medium #414752
││ East side of Main St · 450 ft, 2 min ││ 15sp #414752
││ ┌────────────┐┌────────┐┌──────────┐ ││
││ │ Walk here  ││ * Save ││ Schedule │ ││ 48dp pills; Walk = #2976C7
││ └────────────┘└────────┘└──────────┘ ││   filled, others #F3F2F8
││ [!] Stop moved 50 ft north for       ││ pink alert box, only if any
││     construction until Oct 3  ›      ││
││ ┌──────────────────────────────────┐ ││
││ │[40] Telephone / Heights          │ ││ selected route row
││ │     NORTHBOUND to N SHEPHERD P&R │ ││ 15sp Bold caps (as today)
││ └──────────────────────────────────┘ ││
││█ 4 min   19 min   34 min   5:10 PM ██││ live strip 64dp #005DAA
││ (arcs) Live · updated 12 s ago       ││ 13sp; or "Scheduled times"
││ ┌──────────────────────────────────┐ ││
││ │[44] ACRES HOMES     7 min  27 min│ ││ other routes 64dp rows
││ └──────────────────────────────────┘ ││
││ No alerts for this stop.             ││ (when none) 14sp #414752
│╰──────────────────────────────────────╯│
```

- **Header:**
  - The name is followed by the stop ID on the next line, and the side of the street comes from `ClientStop.side`.
  - The distance is to the rider (walk estimate from `/nearby`, or haversine × 1.3 before `/walk` returns).
- **Actions** (three pills, each at least 104x48dp, radius 24dp):
  - **Walk here** (primary, `directions_walk`, white on #2976C7) opens Walk (§3.4).
  - **Save** (`star` outline → filled #2976C7, label changes to "Saved") saves locally; the snackbar "Saved to My Stops · Undo" lasts 4 s.
  - **Schedule** (`calendar_month` #2A82E6) opens the hourly grid for the selected route (today's screen, kept).
- **Route rows:**
  - One per route/direction serving the stop (`serving`).
  - The **selected** row expands into today's blue strip. Tapping another row selects it; no new screen opens.
  - The strip shows the next 5 departures at 32sp white, with the arcs icon on live ones.
  - A canceled departure shows its time struck through and a small "Canceled" in #FFD6D6.
- **Transit centre stop:** a navy row "Part of Northwest Transit Center · See all bays ›" sits at the top of the list.
- **Legend:** today's three-chip legend (Scheduled / Live Tracking / Canceled) is replaced by the single line under the strip, which also carries the data age. The legend is still available by tapping (i).
- **Full state (dragged up):** adds a "Buses on the way" mini list from `/vehicles?route=` ("Bus 1234 · 3 stops away") and the stop's `description`.
- **Error:** "Couldn't load times for stop #342. [Try again]". The header stays visible.

#### 3.3b Landmark sheet (from a landmark search result)

```
│ Houston Museum of Natural Science  (x) │ 20sp Bold
│ 5555 Hermann Park Dr                   │
│ [ Directions ]  [ * Save place ]       │
│ STOPS NEAR HERE (walk from entrance)   │
│ ┌────────────────────────────────────┐ │
│ │Fannin St @ Hermann Pk (2743) 3 min │ │ closest expanded
│ │Southbound · West side              │ │
│ │[Red] TO FANNIN SOUTH   2 min  8 min│ │ all routes shown
│ │[ 4 ] TO BEECHNUT      11 min 31 min│ │
│ │[Walk here]                         │ │
│ └────────────────────────────────────┘ │
│  Hermann Park/Rice U Stn (Red) · 6 min›│ collapsed rows
│  Hermann Park Dr @ ... (3120)  · 7 min›│
```

The data comes from `SearchResult.nearbyStops` (curated `stopIds` first, then the nearest computed stops). Walk minutes here are measured **from the landmark**, not from the rider, and the header says so.

### 3.4 Walk directions

Full screen. The bottom nav is hidden.

```
┌────────────────────────────────────────┐
│ <- Walk to Lamar St @ Main St (342)    │ app bar 56dp, 18sp
│┌──────────────────────────────────────┐│
││   map: blue #2A82E6 5dp street path  ││ ~50% height
││   (●) you ─────┐                     ││ fitted to you + stop
││                └──[342▲]             ││
│└──────────────────────────────────────┘│
│ 2 min · 450 ft          Arrive 9:43 AM │ 22sp Bold / 16sp
│ Next [40] NB: 4 min  - you'll make it  │ 16sp #007A1A; or #C62828
│ ────────────────────────────────────── │   "leaves before you arrive"
│ ^  Head north on Main St       300 ft  │ 18sp rows, 64dp
│ <  Turn left onto Lamar St     150 ft  │
│ o  Stop #342 is on the east side,      │
│    Northbound, look for sign 342       │
│ ╭────────────────────────────────────╮ │
│ │           I'm at the stop          │ │ 52dp #2976C7 → Stop card
│ ╰────────────────────────────────────╯ │
└────────────────────────────────────────┘
```

- **Data:** `/walk` (OSRM foot routing). `relaxedDurationMin` is shown as "about 4 min at an easy pace" when the text size setting is Large or bigger. Steps use `distanceText` in feet and miles.
- **"You'll make it"** compares the arrival time with the next live departure of the route the rider came from, or else the soonest one.
- **Live:** `watchPosition` moves the dot, the current step is highlighted (#E4EBF6 row), and the rider is re-routed when more than 40 m off the path.
- **Fallback:** when `source` is `straight-line-estimate`, a 14sp banner shows "Street directions unavailable. Showing a straight line." and the line is drawn dashed.
- **Error / no location:** "We need your location for walking directions. [Turn on location]". The stop pin and its address are still shown.

### 3.5 Route page

A pushed page, opened from a search route result direction button, a route row chevron or "See all Route N stops".

```
┌────────────────────────────────────────┐
│ <-                              (*) (↗)│ app bar; save route, share
│ ┌────┐                                 │
│ │ 82 │ Westheimer                      │ 56dp navy badge, 36sp white
│ └────┘                                 │ name 26sp Bold
│ [ EASTBOUND ▾ to Downtown ][WESTBOUND] │ segmented 48dp; sel #2976C7
│ [OK] No alerts for Route 82            │ 16sp #007A1A; else pink box
│ ╭────────────────────────────────────╮ │
│ │ (Q) Find a stop on Route 82        │ │ 48dp #F2F3FB
│ ╰────────────────────────────────────╯ │
│  |  Westheimer @ Voss (2940)     12 min│ timeline spine #C1C6D4
│  |  [bus] Bus 1134 · live             │ vehicle between stops
│  o  Westheimer @ Kirby (2952)     3 min│
│  |                                     │
│ (●) Westheimer @ Montrose (2958) 5 min │ NEAREST TO YOU tag, row
│  |  Eastbound · South side  [Walk 4m]  │   #E4EBF6, 72dp
│  o  Westheimer @ Taft (2961)      7 min│ 56dp rows, 17sp name
│  ...                                   │
│ Full timetable (PDF & by day) ›        │ #005193 link (kept)
└────────────────────────────────────────┘
```

- **Data:** `/routes/:id`, giving the ordered stops, `shapePoints` and alerts. Buses between stops come from `/vehicles?route=82`, placed by the nearest shape point.
- **Per-stop times** load lazily for rows on screen (`/arrivals?stop=&route=`), at most 12 at a time. A row shows its next time, or "Scheduled 5:10 PM".
- **Auto-scroll:** on open, the list scrolls to the stop nearest the rider (if within 1.5 mi) and marks it "Nearest to you". With no location, it opens at the first stop.
- **Find a stop:** filters as the rider types (by name, cross street or ID). Tapping a row opens the Stop card with this route selected.
- **Map toggle:** a `map` icon in the app bar switches the list to a route map, with the navy polyline, stop dots and live bus icons.
- **Alert box:** pink, showing the header in the chosen language, the dates and "Read more". Tapping it expands in place.

### 3.6 Transit centre view

Opened from a TC stop group, a TC pin, a search result or a Stop card row.

```
┌────────────────────────────────────────┐
│ <- Northwest Transit Center     (*)    │
│ 6 min walk · [Walk here]               │
│┌──────────────────────────────────────┐│ bay diagram 160dp: map at
││   [A] [B] [C] [D]                    ││ z18 with bay letter markers
││   ======== platform ========         ││ 32dp navy circles, white
││   [E] [F] [G]      (●) you           ││ 16sp Bold letter
│└──────────────────────────────────────┘│
│ [All][58][70][72][84][Red]  ›          │ route filter chips
│ BAY C                                  │ 16sp Bold caps #004080
│ [58] OUTBOUND to HAMMERLY    7 min     │ 64dp rows; 22sp times
│      next 27 min · 47 min              │ 15sp
│ [72] SOUTHBOUND to ...      12 min     │
│ BAY D                                  │
│ [70] ...                               │
│ Arrivals ending here are hidden. Show ›│ 14sp link
│ Bay letters: hand-authored (Demo data) │ 13sp #6A6A6A, when relevant
└────────────────────────────────────────┘
```

- **Data:** `/transit-centers/:id`, giving `bays[].departures`, `unassignedDepartures` and `source`.
- **Departures, not arrivals:** trips whose headsign is this TC are hidden by default (fixes J1.5).
- **Map interaction:** tapping a bay letter on the map scrolls the list to that bay. Tapping a departure row opens the Stop card for the bay's stop with that route selected.
- **Route filter:** selecting [58] collapses the list to "Route 58 leaves from **Bay C**" in a 20sp Bold banner above its departures.

### 3.7 Trip planner form

This is today's "Plan Your Trip" sheet, kept almost pixel for pixel. It opens at full height from **Where to?**.

```
│ <- Plan Your Trip                      │ 24sp
│ ┌──────────────────────────────────┐   │
│ │ (o) My current location          │(⇅)│ From/To box #F3F2F8 r12
│ │  |  ──────────────────────────   │   │ swap 40dp white circle
│ │ (!) Hobby|                       │   │ red pin = destination
│ └──────────────────────────────────┘   │
│ SUGGESTIONS                            │
│ (plane) Hobby Airport (HOU) terminal   │ landmark first, 17sp Bold
│         Bus curb · Stop #10567         │
│ (pin)   Hobby Area, Houston            │
│ (home)  Home · 4410 Graustark St       │ saved places
```

- **Picking a To value runs the plan immediately** (`/plan`, time = now) and shows the Itinerary list below the form. There is no separate "Plan My Trip" tap.
- **Leave at / Arrive by row** and the time chips **Now / In 15 min / In 30 min / In 1 hr** are kept. Changing one re-plans.
- **From defaults** to "My current location". If location is off, the From field is focused with the hint "Where are you starting?" (J2.10).
- **Saved places** (Home, Work) and recent destinations appear before typing.
- **Airport and big landmarks** resolve to the curated rider entrance or bus curb from `landmarks.json`, e.g. Hobby = stop #10567 at the terminal (fixes J2.3).

### 3.8 Itinerary list

Shown directly under the form.

```
│ 3 WAYS · Leaving now                   │
│ [Fastest] [Fewer transfers] [Less walk]│ sort chips 40dp (kept)
│ ┌────────────────────────────────────┐ │
│ │ walk>[80]>[73]>walk     58 min     │ │ mode strip (kept) 18sp
│ │ 4:12 PM - 5:10 PM          $1.25   │ │ fare #2A82E6
│ │ BOARD [80] TO DOWNTOWN TC          │ │ 16sp Bold caps
│ │ M L King @ UH Univ Dr (11424)      │ │ 16sp
│ │ Southbound · West side · 5 min walk│ │ 15sp #414752
│ │ Leaves 4:17 PM (arcs) live         │ │ #007A1A
│ │ [!] Tight transfer (2 min) at ...  │ │ only if tight/alert
│ │               [ Details ] [ Start ]│ │ 40dp; Start #2976C7
│ └────────────────────────────────────┘ │
```

- **Card anatomy** (radius 12dp, #F3F2F8, padding 16dp, gap 12dp):
  - The mode strip keeps today's chips and walk icons, with durations moved to 14sp.
  - The duration and time range are followed by the **boarding block**: the first `TransitLeg`'s `headsign`, `board.id`, `board.directionLabel`, `board.side` and `board.bay`.
  - This one block answers F3.
- **Tapping** the card or **Details** opens Itinerary detail. **Start** begins Live trip mode directly.
- **No itineraries:** show `PlanResponse.message`. If the distance is under 1.5 mi, a walk card appears: "Walk instead · 24 min · 1.1 mi [Walk]". There is also "Try from the nearest stop" (J2.4).
- **Offline:** `source: offline-fixture` shows the tag "Saved example trip (offline)".

### 3.9 Itinerary detail

A **pushed page, not a swipe-dismissable sheet** (fixes J2.6). The back arrow returns to the list, and the list keeps its scroll position.

```
┌────────────────────────────────────────┐
│ <- My Itinerary              58 min    │
│┌──────────────────────────────────────┐│ map 35%: fitted to board
││ (o)start ..walk.. [11424] ━80━ ...(!)││ stop + transfer + dest,
│└──────────────────────────────────────┘│ labelled pins (J2.7)
│ Arrive 5:10 PM · 1 transfer · $1.25    │ 18sp
│ ┌────────────────────────────────────┐ │ timeline #F3F2F8 r12
│ │(o) My location              4:12 PM│ │
│ │ :  Walk 5 min · 0.2 mi           ›│ │ → Walk screen
│ │(o) M L King @ UH Univ Dr (11424) ›│ │ → Stop card (live)
│ │ |  Southbound · West side          │ │
│ │ |  Board [80] TO DOWNTOWN TC       │ │ headsign = bus sign
│ │ |  Leaves 4:17 PM live · 9 stops   │ │
│ │ |  [!] Detour on Cullen Blvd    ▾ │ │ expands inline
│ │(o) Get off: Cullen @ Bellfort(8812)│ │
│ │ |  Walk 1 min to Stop 8815 (east) ›│ │ transfer walk
│ │ |  Board [73] TO HOBBY AIRPORT     │ │
│ │ |  Leaves 4:41 PM · wait 6 min     │ │
│ │(!) Hobby Airport, bus curb  5:10 PM│ │ red pin = destination
│ └────────────────────────────────────┘ │
│ ╭────────────────────────────────────╮ │
│ │            Start trip              │ │ sticky 52dp #2976C7
│ ╰────────────────────────────────────╯ │
└────────────────────────────────────────┘
```

- **Every stop and walk row is tappable** (chevron shown), which fixes J2.2.
- **Wording:**
  - "Board [route] TO <headsign>" and "Get off: <stop> (<id>)".
  - The word "Transfer" is used only for "Transfer: walk 1 min to…", never to mean "get off" (J2.5).
  - Leg durations are 15sp, and "Every 6 min" frequency badges are kept for rail.
- **Alerts** use today's pink box with the header text shown (J3.11), expanding to the full description.

### 3.10 Live trip mode

The bottom nav is hidden. The map is the top 45%, and one big step card sits below it.

```
┌────────────────────────────────────────┐
│ ● TRACKING TRIP to Hobby Airport  (x) │ 40dp bar #005DAA white 16sp
│┌──────────────────────────────────────┐│ map follows you; route
││   live bus [80] icon  ━━━  (●) you   ││ legs drawn, bus from
│└──────────────────────────────────────┘│ /vehicles by tripId
│ STEP 2 OF 5                            │ 14sp caps #414752
│ Ride [80] TO DOWNTOWN TC               │ 22sp Bold
│ ┌────────────────────────────────────┐ │
│ │        4 stops left                │ │ 40sp Bold #1D1B20
│ │ Get off at Cullen @ Bellfort (8812)│ │ 18sp
│ │ about 9 min · 4:32 PM              │ │
│ └────────────────────────────────────┘ │
│ Next: walk 1 min to Stop 8815, [73]    │ 16sp #414752
│ leaves 4:41 PM (live)                  │
│ [ All steps ]      [ End trip ]        │ 48dp text buttons
└────────────────────────────────────────┘
```

- **Step types:**
  - Walk to stop, with a mini walk card (distance, "Bus in 6 min").
  - Wait: "[80] arrives in 3 min at Stop #11424, west side".
  - Ride: stops left.
  - "**Get off at the next stop**": the card turns #005DAA with white text, and the phone vibrates.
  - Transfer walk.
  - **Final walk to the destination** (J3.7).
  - "You've arrived".
- **Stops left** combines the vehicle position (`/vehicles`, matched by `tripId`, then `/trips/:id?from=`) with the rider's GPS. Whichever is further along wins, and the trigger fires at 1 stop before or within 300 m. This is not the 5 m / 25 m of today (J3.2).
- **Notifications:** asked the first time Start is pressed (OS dialog). While tracking, a persistent notification "Tracking: 4 stops left on 80" updates, and a "Get off next" notification fires.
- **Background (honest PWA limits):**
  - We use a Screen Wake Lock ("Keep screen on during trips" is on by default) and store the trip in localStorage.
  - On return, the trip resumes immediately with "Tracking resumed". If the rider was away more than 60 s, a banner says "Tracking paused while the app was closed. Updated now."
  - We never pretend to be tracking (J3.1).
- **Off route:** when the rider is more than 150 m from the planned path for 45 s, or boarded the wrong direction (their GPS moves away from the next stop along the shape), a sheet appears: "Looks like you're off the planned route. [Re-plan from here] [Keep going]" (J3.4).
- **Tracking lost:** "Live bus position lost. Showing scheduled times." shown in #414752.

### 3.11 Alerts (More > Service Alerts, and alert deep links)

```
│ <- Service Alerts                      │
│ [My routes] [All] [Bus] [Rail]         │ chips; "My routes" = saved
│ ┌────────────────────────────────────┐ │
│ │ (!) [82] Detour on Westheimer      │ │ 18sp Bold, pink left bar 4dp
│ │ Between Kirby and Shepherd. Stops  │ │ 16sp, 3 lines then "More"
│ │ 2952, 2955 closed. Use 2949.       │ │
│ │ Until Oct 3 · Detour               │ │ 14sp #414752
│ └────────────────────────────────────┘ │
│ Routes with no alerts: 40, 44, 85 ...  │ explicit negative
│ Source: METRO alerts · updated 1 min   │ or "Demo data"
```

- **Data:** `/alerts`, using `header` / `description` in the chosen language (en/es, falling back to en with "Available in English only").
- **Affected stop IDs** are tappable and open the Stop card.
- **Wording:** `cause`/`effect` codes are turned into plain words ("Detour", "Stop moved", "Reduced service"). No raw codes such as RT or SC appear (J3.5).
- **Placement:** alerts also appear inline on the Stop card, the Route page, search route results, itinerary legs and the home alert strip (for saved routes).

### 3.12 My Stops tab (saved + recent)

```
┌────────────────────────────────────────┐
│ My Stops                        Edit   │ 24sp; Edit #2A82E6
│ SAVED                                  │
│ ┌────────────────────────────────────┐ │
│ │* Westheimer @ Montrose (2958)      │ │ 18sp Bold
│ │  Eastbound · South side            │ │
│ │  [82] TO DOWNTOWN    4 min  19 min │ │ live, auto-refresh 30 s
│ │  [Walk 4m]                         │ │
│ └────────────────────────────────────┘ │
│ SAVED PLACES                           │
│ (home) Home   (work) Work   + Add      │ 48dp chips
│ RECENT                         CLEAR   │ kept from today
│ (pole) Lamar St @ Main St (342)      › │
│ [82] Westheimer (route)              › │
└────────────────────────────────────────┘
```

- **Edit:** reorder by drag handle (48dp), rename ("Home stop"), unsave.
- **Pin routes:** a saved stop can have its routes narrowed (e.g. only 82 EB) with "Show only these routes" in Edit.
- **Storage:** localStorage, with no account. The note "Saved on this phone" appears in 13sp.
- **Empty:** a star illustration (navy line art 64dp) and "Tap * on any stop to see its buses here and on the map screen."

### 3.13 Fares (stub + real information)

```
┌────────────────────────────────────────┐
│ Fares                                  │
│ ╭────────────────────────────────────╮ │
│ │         Show my ticket             │ │ 56dp #2976C7
│ ╰────────────────────────────────────╯ │
│ Opens your RideMETRO account (METRO    │ 14sp #414752
│ handles login and payment)             │
│ FARES                                  │
│ Local bus & METRORail        $1.25     │ 18sp rows 56dp
│ Park & Ride            $2.00 - $4.50   │
│ Transfers          free for 3 hours    │
│ REDUCED FARES                          │
│ Seniors 65-69                $0.60     │
│ Seniors 70+                   Free     │
│ Students, riders w/ disability $0.60   │
│ Children under 5 (with adult)  Free    │
│ How to get a reduced fare card    ↗    │ external link
│ Prices to confirm with METRO.          │ 13sp #6A6A6A
└────────────────────────────────────────┘
```

**Show my ticket** opens a full-screen handoff stub. It has a METRO logo, the text "Your ticket and payments live in your RideMETRO account. This demo hands off to METRO here." and a grey dashed box labelled "HANDOFF TO METRO: account & QR". It also has an [Open RideMETRO account ↗] button. **No fake QR code** is shown. The fare values are from METRO's public fare page as we understand it and must be checked before handover, which the footer says.

### 3.14 More / Settings

```
│ [METRO logo]                           │
│ RIDER INFO                             │ #005193 caps (kept)
│ Service Alerts                       › │ in-app now
│ Route Schedules                      › │ → route search
│ Transit Centers                      › │ → list → TC view
│ SETTINGS                               │
│ Language             English  ›        │
│ Text size            Large    ›        │
│ Location             On       ›        │
│ Keep screen on during trips   [on]     │
│ CONTACT                                │
│ Customer Service 713-635-4000        ↗ │
│ METRO website                        ↗ │
│ About · Data sources                 › │ explains live vs demo
```

- **Language:** English, Español, Tiếng Việt, 中文, العربية and Français. The UI strings are en/es for the hackathon; other languages are marked "(partial)". Alerts use `header[lang]`.
- **Text size:** Standard (default), Large or Extra large. The same choice appears on the welcome screen. A live preview shows one arrival card in each size. The whole UI scales, and cards grow rather than truncate (Principle 6).
- **Location:** shows the current state and, if denied, the steps to turn it on in Chrome ("Tap the lock icon > Permissions > Location") (J4.2).

### 3.15 Onboarding (single screen)

```
┌────────────────────────────────────────┐
│ [METRO logo]            English|Español│ language toggle 40dp
│                                        │
│        (navy pin glyph 96dp)           │ #004F97 (kept)
│   Welcome to RideMETRO                 │ 30sp Regular #49454F
│   See the buses at stops near you,     │ 18sp
│   plan trips and get walking           │
│   directions.                          │
│ ╭────────────────────────────────────╮ │
│ │       Show stops near me           │ │ 52dp #2976C7 → OS dialog
│ ╰────────────────────────────────────╯ │
│          Not now, I'll search          │ 48dp text button #2A82E6
│ Text size: [A] [A] [A]                 │ 3 chips 48dp
└────────────────────────────────────────┘
```

There is one screen and no "1 of 3". Notifications and Bluetooth are not asked here. Coach marks: none. The home screen's labels (Where to?, Walk here, Save) are self-explanatory.

### 3.16 Location-denied state (home)

```
│ ┌────────────────────────────────────┐ │
│ │ (location_off) Location is off     │ │ 18sp Bold
│ │ We can't show stops near you.      │ │ 16sp
│ │ [ Turn on location ] [ Search ]    │ │ 48dp each
│ └────────────────────────────────────┘ │
│ SAVED (still shown with live times)    │
│ POPULAR: Downtown TC · Northwest TC ...│ chips
```

- The map shows downtown, with a grey banner pill "Showing Downtown, not your location" (J1.7, J4.2).
- There is no blue "you" dot, and the locate FAB shows a `location_disabled` icon.
- Tapping the FAB shows the same card.
- If a fix is slow (>8 s), the card instead reads "Finding your location…" with a spinner and [Search instead].

### 3.17 Offline and error states

- **Offline banner:** 40dp, #414752 with white 15sp text, pinned under the search bar: "No connection. Times from 4:02 PM may be out of date." All times turn black with "(scheduled)", and the live arcs are hidden.
- **Cached data:**
  - Static stops and routes come from the service worker cache, so search by stop number and route pages (without times) still work.
  - Saved stops show their last times, greyed, with that time.
- **API error:** the inline card shows the `ApiError` message (e.g. "We couldn't find stop #99999. Check the number on the stop sign.") and [Try again]. There are no toasts for errors.
- **Real-time missing** (`realtimeSources` empty): "Live tracking unavailable. Showing scheduled times." shown once per screen in 14sp.
- **Planner failure:** see §3.8. **Walk failure:** see §3.4.

---

## 4. Flow paths (actions from launch)

Launch means a cold start with onboarding already done and location granted, unless stated. Each numbered item is one action.

**F10: First launch → usable map (baseline 14, target ≤ 3, FAST 2)**
1. Tap **Show stops near me** on the welcome screen.
2. Tap **Allow** in the Chrome location dialog.

The home screen now shows the map and the nearest stops with live times. (With "Not now" it takes 1 action and gives the search-first home of §3.16.)

**F1: Nearest Route 40 NB stop + next bus (baseline 2 / 4, target ≤ 1, FAST 1)**
1. Tap the **[40]** chip in NEAR YOU. The list shows "[40] NORTHBOUND TO N SHEPHERD P&R · Lamar St @ Main St (342) · East side · 450 ft · 4 min".

The stop name, ID, distance and next bus are all on screen. At the audit GPS (Main @ Lamar), stop 342 is also the first stop group at launch, so the answer is visible with **0** actions.

**F2: Returning commuter, next 82 at #2958 (baseline 3, target 0, FAST 0)**
0. Launch. The SAVED card "Westheimer @ Montrose (2958) · [82] TO DOWNTOWN 4 min" is at the top of the home sheet.

(Saving once: open the stop card and tap **Save**, 1 action, done once.)

**F3: Plan UH → Hobby and know where to board (baseline 10, target ≤ 4, FAST 3)**
1. Tap **Where to?**
2. Type "hobby".
3. Tap **Hobby Airport (HOU) terminal**. The plan runs, and the first itinerary card shows "BOARD [80] TO DOWNTOWN TC · M L King @ UH Univ Dr (11424) · Southbound · West side · Leaves 4:17 PM".

(A 4th tap on Details gives the full timeline, which is not needed for the goal.)

**F4: Walking directions to stop #342 (baseline impossible, target ≤ 2, FAST 1)**
1. Tap **[Walk 2m]** on the "Lamar St @ Main St (342)" group in NEAR YOU. This opens the street-routed walk with feet-based steps.

(If 342 is not nearby: tap search, type "342", tap result, tap Walk here = 4.)

**F5: Route 82 → its stops → EB live times at Westheimer @ Montrose (baseline 9 / 18, target ≤ 4, FAST 3)**
1. Tap the search bar.
2. Type "82".
3. Tap **EASTBOUND** on the Route 82 result. The Route page opens in the eastbound direction, auto-scrolled to "Westheimer @ Montrose (2958) · Nearest to you · 5 min live". The full ordered stop list is visible around it.

Without location, the rider adds a tap on "Find a stop on Route 82" and types "montrose", which is **5**. The alternative "82 montrose" query returns the stop directly in 3.

**F6: Is there an alert on Route 82? (baseline 6 partial, target ≤ 2, FAST 2)**
1. Tap the search bar.
2. Type "82". The route result states "No alerts for Route 82" or "1 alert: Detour at Kirby".

(A 3rd tap expands the full alert on the Route page. If 82 serves a saved stop, the home alert strip already shows it: 0.)

**F7: NW Transit Center, bay for 58 + next departure (baseline 2 / 14, target ≤ 2, FAST 1)**
1. Tap **Northwest Transit Center** (the TC group in NEAR YOU, shown with a navy TC chip and "6 min walk"). The TC view opens with departures by bay: "BAY C · [58] OUTBOUND … 7 min".

(If 58 is among the 3 soonest departures shown on the TC group itself, it is 0. Tapping [58] in the TC view filters to "Route 58 leaves from Bay C", which is optional.)

**F8: Start live trip tracking (baseline 9 partial, target ≤ 5, FAST 5 first time / 4 after)**
1. Tap **Where to?**
2. Type "hobby".
3. Tap **Hobby Airport (HOU) terminal**.
4. Tap **Start** on the first itinerary card.
5. Tap **Allow** in the notification permission dialog (first trip only).

The Live trip screen shows "● TRACKING TRIP to Hobby Airport · Step 1 of 5: Walk 5 min to Stop #11424".

**F9: Fares / ticket (baseline 1 wall, target 1, FAST 1)**
1. Tap **Fares**. The fare table with reduced fares is visible, and **Show my ticket** is the handoff (a 2nd tap opens the stub).

**F11: Landmark HMNS → closest stop → next arrivals (baseline 6 partial, target ≤ 3, FAST 3)**
1. Tap the search bar.
2. Type "natural science". The result already reads "Closest stop: Fannin @ Hermann Park (2743) · 3 min walk".
3. Tap the result. The landmark sheet lists stops sorted by walk time from the museum, with the closest one expanded to **all routes** and their next arrivals.

---

## 5. Audit findings (CRITICAL / HIGH) → fix

| Finding | Severity | FAST fix |
|---|---|---|
| J1.1 Stops are tiny unlabeled dots | CRITICAL | 28dp #4994EC pins with a direction arrow. A stop-ID label at z≥16, clusters below z15, TC and rail get their own markers. Tapping a pin opens the Stop card (§2.2, §3.3). Screen-reader label: "Stop 342, Lamar St at Main St, northbound". |
| J1.2 Nearby never says which stop, distance or side | CRITICAL | NEAR YOU is grouped by stop and sorted by `walkMin`. Each group shows the name, ID, direction, side, feet and a Walk button (§2.2). |
| J1.3 No walking directions to a stop | CRITICAL | Walk here on every stop row, stop card, route row and itinerary walk leg, using `/walk` OSRM foot routing (§3.4). |
| J1.4 Walk leg is a straight dotted line | HIGH | Itinerary walk legs use `geometry` plus `walkDirectionsUrl`, drawn on streets with distance, and tap through to turn-by-turn (§3.9). |
| J1.5 TC bays stacked; arrivals instead of departures | HIGH | TC view with a bay map and departures grouped by bay, with terminating trips hidden (§3.6). |
| J1.6 Panning silently replaces nearby | HIGH | Nearby follows the GPS dot. Panning shows a "Search this area" pill, and the header says NEAR MAP CENTER when it is used (§2.2). |
| J2.1 Itinerary lacks stop ID, direction, pole | CRITICAL | The boarding block on every itinerary card and step shows the ID, direction, side, bay and headsign (§3.8, §3.9). Same-name stops are grouped in search (§3.2). |
| J2.2 Itinerary steps are dead ends | CRITICAL | Every stop row opens the Stop card with live times, walk rows open Walk, and alerts expand inline (§3.9). |
| J2.3 Airport routes to a 17-min walk away | CRITICAL | Landmarks resolve to the curated rider entrance or bus curb (`landmarks.json`, Hobby = #10567) and rank first in suggestions (§3.7). |
| J2.4 "Cannot find any trips" for routable trips | HIGH | Planner fallback: the friendly `message`, a walk-instead card and "Try from the nearest stop". Landmarks snap to their stops (§3.8). |
| J2.5 "Transfer" misused; no headsign | HIGH | "Board [80] TO <headsign>", "Get off: <stop> (<id>)". "Transfer" only for walking between stops (§3.9). |
| J2.6 Swipe down discards the trip | HIGH | Itinerary detail is a pushed page with a back arrow. Home sheets stop at peek. Live trip needs an explicit End trip (§3.9, §3.10). |
| J2.7 Itinerary map poorly framed | HIGH | The map fits the boarding stop, transfers and destination, with labelled pins. Red = destination only (§3.9). |
| J3.1 Tracking dies in background | CRITICAL | Wake Lock by default, a persisted trip, resume on return with an honest "paused while closed" banner, and a persistent notification (§3.10). |
| J3.2 Stop alerts need 5 m / 25 m | CRITICAL | Triggered by stops left (vehicle position via `tripId`, plus GPS): "Get off at next stop" at 1 stop or 300 m (§3.10). |
| J3.3 No step-by-step guidance | HIGH | Live trip's single step card: walk, wait, ride with stops left, get off, transfer, final walk (§3.10). |
| J3.4 No off-route detection | HIGH | 150 m / 45 s off path, or the wrong direction, prompts "Re-plan from here" (§3.10). |
| J3.5 Stop alerts lack route, direction, side, ID; codes RT/SC | HIGH | Every stop reference uses name + ID + direction + side, and times say Live / Scheduled in words (§3.3, §3.10). |
| J4.1 No favorites | HIGH | A Save star on the Stop card. SAVED on the home sheet and in the My Stops tab, with live times (§2.2, §3.12). |
| J4.2 Location denied fakes a location | HIGH | The Location-off card, a "Showing Downtown, not your location" banner, no fake dot, and fix steps in Settings (§3.16, §3.14). |
| J4.3 Route → stop takes ~10 taps + 8 swipes | HIGH | Search route result with direction buttons → Route page auto-scrolled to the nearest stop, searchable, with live times (§3.5). |
| J4.4 Alerts on an external website | HIGH | In-app alerts inline everywhere plus More > Service Alerts, with "No alerts for Route X" stated (§3.11). |
| J4.5 Tiny pins only inside a circle | HIGH | The circle is removed. Pins show across the whole viewport at z≥15 and clusters below (§2.2). |

We also address some MEDIUM and LOW findings for free:
- J1.7, J2.10 and J3.13: location states.
- J1.8: a pin opens the Stop card directly.
- J1.9, J2.12 and J4.7: one time formatter, held values and a single arrivals source.
- J1.10 and J3.9: red is always the destination.
- J1.12, J2.13, J3.10 and J4.10: no coach marks, and a labelled Where to?
- J1.13: the rail becomes chips in the sheet.
- J2.9 and J4.6: typed search icons, subtitles, groups and "and"→"@".
- J3.11: alert header shown.
- J4.9: grouped by stop.
- J4.11: language setting.

---

## 6. Familiarity: what stays, what changes

### Stays identical (riders will recognise it at a glance)
- Bottom nav in the same order and slots, with the same icons, the #E4EBF6 bar and the #2976C7 active pill. Explore, Fares and More keep their labels.
- The map-first Explore screen with the white pill search bar, the METRO logo and "Place, Stop, or Route", plus white rounded-square FABs on the right (locate in blue).
- The route chip: a white tile with a 7dp navy #004080 band (red for rail) and a black number, used everywhere.
- The arrival card: #F3F2F8, radius 10–12dp, CAPS direction, CAPS headsign, green = live, black = scheduled, the Live arcs icon and a chevron.
- The Stop sheet's **blue #005DAA live-minutes strip** with big white numerals, the bold stop name with its ID, the route row with a bus chip, "NORTHBOUND to X", and the Schedule button with its hourly grid.
- The Plan Your Trip form: blue dot → red pin, the swap circle, the Leave at row, the Now / 15 / 30 / 1 hr chips and the full-width blue pill button.
- Itinerary cards (mode strip, duration, blue fare, time range), the sort chips, and the timeline with a navy bus line, red rail line and dotted walk.
- The More list with blue caps headers, 48dp rows, and chevron vs north-east arrow. The Recent list with CLEAR.
- Roboto, flat M3 surfaces, 16dp margins, 28dp sheet corners, and the polite institutional tone.

### Changes, and why

| Change | Why (steps / finding) |
|---|---|
| The home sheet shows **saved stops + nearest stops grouped by stop, with walk time** instead of "59 Nearby Arrivals" by route number | F1 → 1, F2 → 0, F4 → 1, F7 → 1. J1.2, J4.1, J4.9 |
| Left route rail → **horizontal chip row** in the sheet (same chip visual) | Frees about 15% of the map (J1.13). The chip now filters stops by route and direction (F1) |
| Trip-planner icon FAB → labelled **"Where to?"** field | Discoverable without a coach mark (J2.13). F3/F8 start in 1 tap |
| "What do you want to do?" / "Choose Direction" dialogs → **inline actions** (direction buttons on the route result, a pin opens the Stop card directly) | Each dialog removed saves 1–2 actions (F5 9 → 3) |
| Recent tab → **My Stops** (saved + recent) | Saving needs a visible home. Recent is still inside |
| Plan runs on picking a destination (no "Plan My Trip" tap); **Start** on the itinerary card | F3 10 → 3, F8 9 → 5 |
| Itinerary detail becomes a pushed page with tappable steps | J2.2, J2.6 |
| Alerts in the app, with the negative stated | F6 6 → 2, J4.4 |
| Walk here everywhere + a street-routed walk screen | F4 impossible → 1, J1.3, J1.4 |
| Bigger type (arrivals 22sp, headsign 14sp, instructions 16sp) plus a text-size setting; live green darkened to #007A1A for text | Older riders; #00BB1F text fails contrast |
| One welcome screen, no coach marks, notifications asked at trip start | F10 14 → 2 |
| Blue radius circle removed; labelled, clustered pins | J1.1, J4.5, J1.6 |
| Square ALL-CAPS Material-2 dialogs removed | Consistent M3 styling. They added steps |
| Standard time format "4 min" / "5:10 PM" | J1.9, J2.12 |

### Explicit stubs and data caveats
- **Login, ticket QR, payment, rewards and Track Bus Stop subscriptions:** handoff to METRO (Fares stub, §3.13). "Track Bus Stop" is folded into Save + notifications during a trip; server-side stop alerts are not built.
- **Transit-centre bays** at some centres are hand-authored (`source: hand-authored-demo`) and tagged "Demo data".
- **Alerts** may come from `demo-alerts.json` (`source: demo`), which is tagged.
- **Background tracking** is limited by the PWA platform, and we say so in the UI (§3.10).
- **Fare amounts** need confirmation from METRO before handover.
- **Per-stop live times on the Route page** are fetched lazily for visible rows, which is supported by `/arrivals` and needs no new endpoint.
