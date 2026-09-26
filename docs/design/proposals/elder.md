# Proposal "Elder": RideMETRO redesign built accessibility-first

**Lens:** the reference rider is 70 years old, has low vision and shaky hands, reads English, Spanish or Vietnamese, and has used RideMETRO v2.71 before. When a screen works for her, it also works for a commuter in a hurry, a tourist, or a rider holding a phone in one hand while carrying a grocery bag in the other.

**Constraint:** people who use the current app should still recognise this one. We keep the same four tabs, the same blue pill search bar, the navy-banded route chips, the blue live-minutes strip, the same Plan Your Trip form and the same colours. What changes is the size of things, the wording, and how many screens it takes to finish a task.

Sources: `docs/baseline-steps.md`, `docs/baseline-flows.json`, `docs/design/existing-style.md` and `ref/*.png`, `ux-audit/REPORT.md`, `complaints.md`, `improvements.md`, and the `pwa/server/services/*` API.

---

## 1. Principles

1. **Big by default, not as an option.** Body text is at least 18sp and never below 16sp anywhere. Arrival minutes are 28sp. Every touch target is at least 48x48dp, and primary buttons are 56dp tall. A Large text mode multiplies all sizes by 1.25, and the layout wraps text instead of cutting it off.
2. **One job per screen, one filled blue button.** Each screen has at most one filled `primary` #2976C7 button, and it is the obvious next step. Every other action is a tonal #F3F2F8 button or a text link.
3. **Say it in words, not codes.** Screens say "Live" or "Scheduled", "Northbound, east side of the street", "Get on Route 85 toward Monroe P&R" and "4:24 PM, in 19 min". There are no RT/SC codes, no "1:0min", no ALL-CAPS abbreviations like CNCLOCKWISE, and no icons without a text label.
4. **Nothing hidden.** No coach marks, no long-press, no swipe-only actions, and no unlabelled icon buttons. Anything you can drag also has a visible button that does the same thing ("Show list", "Show map", "Close").
5. **Forgiving.** Back always goes one step back and never throws work away. A planned trip, a search or a stop you were looking at is kept until you clear it. Removing a saved stop offers Undo for 10 s. A second Back press is required before leaving the app.
6. **Honest data.** Every time is marked Live (green dot and the word "Live") or Scheduled. We show when the data was last updated, and when data is missing we say so ("Tracking lost, showing scheduled time"). If we can't find you, the map never pretends it has.
7. **Answer from the first screen.** At launch the home sheet already shows your saved stops, the nearest stops with walk minutes, direction and side of the street, and the next buses. The first screen answers "when is my bus?" without a single tap.
8. **Familiar skin, new bones.** We keep the tokens, components and navigation order from `existing-style.md`, and change the structure only where the audit found a dead end.

### Accessibility system (applies to every screen)

| Item | Standard | Large text (Settings) |
|---|---|---|
| Body / list text | 18sp Regular, line height 26 | 22sp / 32 |
| Secondary text (never below) | 16sp | 20sp |
| Screen / sheet title | 24sp Medium | 30sp |
| Stop name in cards | 20sp Bold | 25sp |
| Next-arrival minutes | 28sp Bold | 34sp |
| Later arrivals | 18sp Medium | 22sp |
| Route chip number | 20sp Bold (chip 48x48dp) | 24sp (chip 56x56dp) |
| Button label | 18sp Medium, sentence case | 22sp |
| Nav label | 16sp Medium (bar 88dp) | 16sp (label size is fixed so the bar doesn't wrap) |
| Min touch target | 48x48dp, 8dp apart | 56x56dp |
| Primary button | 56dp tall, full width minus 32dp, pill | 64dp |

- **Contrast.** All text meets WCAG AA 4.5:1 and titles aim for 7:1. Two existing tokens fail as text on white, so we add darker text-only versions and keep the originals for icons and dots:
  - `live-text` **#007A1A** (from `realtime-green` #00BB1F, which is only 2.6:1). Used for "Live" and live minute values. #00BB1F stays for the live dot and signal-arc icon.
  - `alert-text` **#B3261E** (from `alert-red` #FF3B2F, which is 3.4:1). Used for alert text. #FF3B2F stays for the "!" icon.
  - Secondary text uses `on-surface-variant` **#414752** (9.4:1) instead of `text-secondary` #6A6A6A whenever the information matters (headsign, stop ID, direction). #6A6A6A is used only for timestamps like "Updated 4:12 PM".
  - `accent-blue` #2A82E6 is for icons only. Blue link text uses `brand-blue-deep` **#005DAA** (7.0:1).
- **Focus and pressed states.** Keyboard and switch-access focus shows a 3dp #005DAA ring offset by 2dp. The pressed state is an 8% #1D1B20 overlay, and buttons don't change shape when pressed.
- **Motion.** Sheet and screen transitions are 200ms fades or slides, and are off when the OS asks for reduced motion. Arrival numbers don't animate: they change only when the value changes by at least 1 minute, which stops the flicker (J1.9).
- **Screen readers.** Every stop pin, card and time has a spoken label, for example "Lamar St at Main St, stop 342, northbound, east side, routes 40 and 41, 4 minute walk" or "Route 40 to N Shepherd P&R, live, 4 minutes, 4:24 PM". Canceled trips are read as "Canceled".
- **Language.** English, Español and Tiếng Việt, chosen on the welcome screen and in More. The whole interface is translated. Alert text uses the METRO feed's `header`/`description` translations (the feed and demo already carry `es`), and when a translation is missing the screen says "Alert shown in English". Stop and street names are never translated, so they match the signs. All ES/VI copy needs native-speaker review before launch.
- **Walking pace.** Settings offers "Normal" or "Slower" walking pace. Slower uses 0.9 m/s, which the API already returns as `relaxedDurationMin` on `/walk`; nearby walk minutes are recomputed as `walkDistanceM / 0.9`. "Can I make this bus?" greying uses the rider's own pace.
- **Wheelchair.** A ♿ badge appears when `stop.wheelchair === true`. An optional setting, "I use a wheelchair or can't use stairs", sorts accessible stops first.

---

## 2. Information architecture

### Bottom navigation (same bar, same order, same icons)

Bar: `nav-bg` #E4EBF6, 88dp tall plus the gesture inset. Each tab is 90dp wide at 360dp. The active tab has a 64x32dp `primary` #2976C7 pill with a white icon and a 16sp Bold #191C21 label. Inactive tabs use a #414752 outlined icon and a 16sp Medium label.

| # | Label (EN / ES / VI) | Icon (as today) | Contains |
|---|---|---|---|
| 1 | **Explore** / Explorar / Khám phá | map with pin | Map plus the home sheet: "Where to?", My stops (live), Stops near you, route and landmark results. The trip planner, itinerary and live trip all open over this tab. |
| 2 | **Fares** / Tarifas / Giá vé | two tickets | Fare table including reduced fares, "Show my ticket" (stub, handoff to METRO), and where to buy or reload. |
| 3 | **My Stops** / Mis paradas / Trạm của tôi (was "Recent") | bus-stop sign | Saved stops with live times, then the Recent stops and routes list as it is today. |
| 4 | **More** / Más / Thêm | three lines | Service alerts (first row, with a count), Language, Text size, Walking pace, route schedules, Learn how to ride, Contact, Settings, and the METRO external links. |

The only label change is Recent → My Stops, in the same slot with the same icon. Recent still appears as the second section of that tab, so nothing a current rider relies on goes away. Alerts get a count badge on the More icon when an alert affects a saved stop or route: a 20dp #B3261E circle with a white 14sp number. A red dot on its own would carry no meaning, so we always show the number.

Pushed screens (Route, Transit Center, Walk, Itinerary detail, Alerts, Settings) hide the bottom nav and show a 64dp app bar with a **"‹ Back"** button (a #005DAA arrow plus the word "Back" in 18sp, 48dp tall, 96dp wide) and a 24sp title. Android Back does the same thing.

### Home screen at launch (Explore, sheet at half height)

The screen is 360x800dp: map at the top, sheet over the lower 58%, and the nav bar at the bottom.

```
┌──────────────────────────────────────┐
│ ┌────────────────────────────────┐   │ 16dp margins
│ │[METRO] Place, Stop, or Route  🔍│   │ search pill 56dp
│ └────────────────────────────────┘   │
│                               ┌────┐ │
│      · ·    [#342·4 min]      │ ◎  │ │ locate FAB 56dp
│        ▲ 342                  └────┘ │ + "Me" label
│   ● you        ▲ 1234                │
│             [#1234·2 min]            │ map 38% height
│╭────────────────────────────────────╮│
││            ▬▬▬  Show list ▲         ││ handle+button 48dp
││ ┌────────────────────────────────┐ ││
││ │ 📍 Where to?                    │ ││ 64dp "Where to?"
││ └────────────────────────────────┘ ││
││ MY STOPS                     Edit  ││ 16sp caps header
││ ┌────────────────────────────────┐ ││
││ │★ Westheimer @ Montrose  #2958  │ ││ saved-stop card
││ │ [82] to Downtown   ● 4 min Live│ ││
││ │                    then 19 min │ ││
││ └────────────────────────────────┘ ││
││ STOPS NEAR YOU   Updated 4:12 PM ⟳ ││
││ [All][40][41][85][6] ›            ││ route filter 48dp
││ ┌────────────────────────────────┐ ││
││ │ Louisiana @ Prairie  🚶2 min › │ ││ stop group card
││ │ Stop #1234 · Northbound · W side│ ││
││ │ [85] to Monroe P&R  ● 3 min Live│ ││
│╰────────────────────────────────────╯│
│ [Explore]   Fares   My Stops   More  │ nav 88dp
└──────────────────────────────────────┘
```

**Elements, top to bottom:**

1. **Search pill.** White #FFFFFF, 56dp tall (was 44dp), full pill radius, 2dp shadow, 16dp from the sides and 12dp below the status bar. It holds the METRO logo (28dp tall), the placeholder "Place, Stop, or Route" (18sp, `text-tertiary` #70777C, which passes 4.6:1 on white), and a 24dp #1D1B20 magnifier. Tapping anywhere on it opens Search (S2).
2. **Locate FAB.** White rounded square, 56x56dp, 12dp radius, 3dp shadow, with a 28dp `accent-blue-light` #4990DF `my_location` icon and a "Me" label (14sp #414752) under it inside a 72dp-tall tile. There is no trip-planner FAB: "Where to?" replaces it (fixes J2.13). The route-alert FAB is gone because alerts are shown inline.
3. **Map.** OpenFreeMap vector style tuned to look like today's Google map (§3, S1). It opens at street zoom 16 centred on GPS, and it never falls back silently to the Museum District.
4. **Sheet.** White, 28dp top radius. The 32x4dp #414752 drag handle is kept, and next to it is a **visible "Show list ▲" / "Show map ▼" button**: a 48dp text button with a #005DAA label. There are three states: *Peek* (160dp: handle plus "Where to?"), *Half* (58%, the default) and *Full* (the map is hidden and the sheet gets the Back button).
5. **"Where to?"** A 64dp button styled like a field: `surface-container` #F3F2F8, 16dp radius, a 24dp red #FF0000 destination pin, and "Where to?" in 20sp Medium #1D1B20. This is the screen's one primary action. Tapping it opens destination search inside the planner (S7).
6. **My stops.** Up to 3 saved stops with live times, then "See all my stops ›" when there are more. If nothing is saved, a single 16sp #414752 line reads "Tap ☆ Save on any stop to keep it here."
7. **Stops near you.** Stop group cards (component C2 below), sorted by walk time and capped at 6. After them comes a "Show more stops" tonal button (56dp). Downtown this is 6 cards instead of 59.
8. **Route filter row.** It replaces the left route-chip rail (J1.13). The chips are 48dp tall and at least 56dp wide, white with the navy #004080 7dp top band, number in 20sp Bold. The selected chip gets a #2976C7 2dp border and a #E4EBF6 fill. "All" comes first. If the row is wider than the screen it scrolls horizontally, and the last visible chip is followed by a "›" button that scrolls it, so the rider doesn't need to swipe.
9. **Status line.** "Updated 4:12 PM" (16sp #6A6A6A) and a 48dp refresh button (`refresh`, #4A95E9). Data refreshes automatically every 30 s.

**Order logic:** 1) an active trip banner if a trip is in progress or was left unfinished; 2) an alert banner if an alert hits a saved stop or route; 3) Where to?; 4) My stops; 5) Stops near you.

---

## 3. Screen-by-screen specification

### Shared components

**C1 Route chip.** White tile, 4dp radius, with the 7dp navy #004080 top band (red #EF0000 for rail, in which case the label reads "Red", "Green" or "Purple" with the line colour as the band). Number in 20sp Bold #000. In cards the chip is 48x48dp (was 32dp) with a 1dp #AAA9AD border; on its own it is not a separate tap target, and the whole row is the target.

**C2 Stop group card** (home, landmark, search). `surface-container` #F3F2F8, 12dp radius, 16dp padding, 12dp gap between cards.

```
┌──────────────────────────────────────┐
│ Lamar St @ Main St        🚶 4 min › │ 20sp Bold / 18sp
│ Stop #342 · Northbound · East side   │ 16sp #414752
│ ──────────────────────────────────── │ 1dp #C1C6D4
│ ┌──┐ to N Shepherd P&R    ● 4 min    │ route row 64dp
│ │40│                        Live     │
│ └──┘ then 19 min, 51 min             │ 16sp #414752
│ ──────────────────────────────────── │
│ ┌──┐ to Downtown             12 min  │ scheduled: #1D1B20
│ │41│                      Scheduled  │ 16sp #414752
│ └──┘ then 42 min                     │
└──────────────────────────────────────┘
```
- **Header row (56dp, tappable).** Opens the Stop sheet (S3). The walk chip "🚶 4 min ›" on the right is its own 48dp target and opens Walk directions (S4). Walk minutes use the rider's pace setting.
- **Identity line.** "Stop #342 · Northbound · East side" comes from `stop.id`, `directionLabel` and `side`. If `side` is missing, the line shows the ID and direction only. A ♿ is appended when the stop is accessible.
- **Route rows** (at most 3 per stop, then "+2 more routes ›"). Each row: C1 chip, then the headsign "to N Shepherd P&R" in 18sp Medium #1D1B20 (sentence case from `headsign`), then the next minutes on the right in 28sp Bold, with "Live" (`live-text` #007A1A, with an 8dp #00BB1F dot) or "Scheduled" (#414752) under it in 16sp. A second line reads "then 19 min, 51 min". Tapping a row opens S3 with that route expanded.
- **Can't-make-it.** When `minutesAway < walkMin`, that time is shown in 18sp #414752 with the text "Leaves before you get there", and the next reachable bus becomes the big number.
- **States.** Canceled: the time is struck through and "Canceled" appears in `alert-text`. No departures in the next 2 hours: "No buses in the next 2 hours" plus a "See full schedule" link. Alert on the stop: a 32dp pink strip (`alert-bg` #F4DFE4, 1dp #F7BBBB border) inside the card showing "! Stop moved 150 ft east ›". Loading: grey #E3E3E4 skeleton bars, never "0 min".

**C3 Time format.** "Now" (under 1 min), "4 min", "59 min", then clock time "5:40 PM" beyond 60 minutes. Absolute times are always "4:24 PM", never "04:24pm". Durations are "1 hr 12 min".

**C4 Map markers** (one marker language across all screens, fixes J1.10/J2.7/J3.9):

| Thing | Marker |
|---|---|
| Me | #4285F4 16dp dot, 3dp white ring, accuracy halo #4285F4 at 15% |
| Bus stop (zoom ≥ 15) | 36dp `accent-blue-light` #4994EC rounded pin with a white bus glyph and a white triangular **direction notch** rotated to `bearing`; 48dp hit area |
| Nearest 3 stops | The above plus a white label pill "#342 · 4 min" (16sp Bold #1D1B20, 1dp #C6C6C6 border) |
| Selected stop | Pin grows to 48dp and turns navy #004080, with a callout "Stop 342" as today |
| Cluster (zoom < 15) | 40dp navy #004080 circle with the count in white 16sp Bold. Tapping zooms in 2 levels. |
| Transit center | 44dp navy rounded square with a white "TC" plus a name label, e.g. "Northwest TC" |
| TC bay (zoom ≥ 17) | 36dp white circle, 2dp navy ring, bay letter 18sp Bold |
| Destination | Red #FF0000 pin, 40dp. Used only for the destination. |
| Boarding / getting-off stop | Stop pin plus label "Get on here · #1234" / "Get off here" |
| Live bus | 28dp rounded square in the route colour with the white route number and an arrow toward the direction of travel. A grey "?" and "Last seen 3 min ago" when `ageSeconds > 120`. |
| Walk path | 5dp dotted #2A82E6 line along streets (from OSRM). If straight-line only, the line is dashed grey with the warning shown. |
| Bus / rail path | 6dp line in the route colour (#004080 bus, #EF0000 Red Line) |

Map style (MapLibre plus OpenFreeMap): land #F5F3F3, parks #C3F1D5, water #AADAFF, highways a #B7C6DD fill with a #9FB1CC casing, local roads white, and road labels 14sp #5F6368 with a white halo. POI icons are muted and major labels are bumped up one size. METRO stop pins are always drawn above POIs.

---

### S0. Onboarding (first launch only, one screen)

```
┌──────────────────────────────────────┐
│ [METRO logo]                         │ logo 32dp tall
│                                      │
│              ( 📍 )                  │ 96dp navy #004F97 icon
│    Welcome to RideMETRO              │ 30sp Regular #1D1B20
│  See buses near you and plan trips.  │ 18sp #414752
│                                      │
│  Language                            │ 16sp #414752
│  ┌──────────────────────────────┐    │
│  │ (●) English                  │    │ radio rows 56dp
│  │ ( ) Español                  │    │ #F3F2F8 group, r12
│  │ ( ) Tiếng Việt               │    │
│  └──────────────────────────────┘    │
│  Text size    [ Aa Standard | AA Large ]│ 56dp segmented
│                                      │
│  ┌──────────────────────────────┐    │
│  │   Show buses near me          │    │ 56dp #2976C7 pill
│  └──────────────────────────────┘    │
│      Not now, I'll search            │ 48dp text btn #005DAA
│  We use your location only while     │ 16sp #414752
│  the app is open.                    │
└──────────────────────────────────────┘
```
- Background `background` #F9F9FF. The language defaults to the phone's language, so most riders tap only the button.
- Choosing a text size updates this screen immediately, so the rider sees the effect before continuing.
- "Show buses near me" opens the OS location dialog. Granting it goes to Home in the "Finding you" state. Denying it goes to Home in the location-denied state (S16).
- "Not now" goes straight to Home with Search focused, not the keyboard. The sheet shows "Search for a stop, route or place" as its main action.
- No notification, Bluetooth or coach-mark steps. Notifications are offered inside the live trip (S10), and Bluetooth is dropped.
- F10 = 2 actions (button plus OS dialog).

### S1. Explore home: map and sheet states

The layout is as in §2. States:

| State | What the rider sees |
|---|---|
| **Finding you** (first 0–10 s) | Map at downtown, zoom 12, with a centred pill "Finding your location…" (18sp, white, spinner). The sheet shows My stops and "Looking for stops near you…" skeletons. There is no Nearby list for a fake location. When the first fix arrives, the camera flies to the rider and the list fills in (fixes J1.7). |
| **Located** | Default, as in the wireframe. |
| **Poor accuracy** (> 150 m) | An amber note under "STOPS NEAR YOU": "Your location is approximate (about 300 m)." |
| **Panned away** | A white 48dp pill "Show stops in this area" appears at the top-centre of the map. The list stays pinned to GPS until it's tapped. After it's tapped, the header reads "STOPS NEAR MONTROSE (map area)" and a "Back to my location" button (48dp tonal) appears (fixes J1.6). |
| **Route filter on** | e.g. "40" selected: the list shows only stops served by 40, **grouped by direction**: "Northbound to N Shepherd P&R: nearest stop Lamar @ Main #342, 🚶 6 min, 4 min Live", then "Southbound…". The map draws the route 40 line and dims other pins to 40%. |
| **Sheet full** | The map is hidden and the app bar reads "‹ Back   Explore". Back returns to Half. |
| **Sheet peek** | Handle, "Show list ▲" and "Where to?". |
| **Trip in progress** | A banner at the top of the sheet: navy #004080 64dp, white 18sp "Trip to Hobby Airport · Next: get on 40 at 4:24 PM", with a "Open ›" button (48dp). |
| **Unfinished plan** | A tonal banner: "You planned a trip to Hobby Airport. Open it / Clear". |
| **Alert on saved** | A pink banner (`alert-bg` #F4DFE4): "! Route 82: Kirby stop moved. Read ›". |
| No stops within 800 m | "No bus or rail stops within 0.5 mi." plus buttons "Search a place" and "Show a wider area". |

**Map pin tap** opens the Stop sheet (S3) directly, with no "Choose Direction" step (fixes J1.8).

### S2. Search

```
┌──────────────────────────────────────┐
│ ‹ Back  ┌──────────────────────┐ ✕   │ field 56dp #F2F3FB
│         │ 82▌                  │     │ 18sp, clear 48dp
│         └──────────────────────┘     │
│ ROUTES                               │ 16sp caps #414752
│ ┌──┐ Route 82 Westheimer          ›  │ 72dp row
│ │82│ ! 1 alert: Kirby stop moved     │ 16sp alert-text
│ └──┘                                 │
│    → Eastbound to Downtown        ›  │ 56dp sub-rows
│    → Westbound to Mission Bend TC ›  │
│ STOPS                                │
│ 🚏 Monroe Park & Ride · Bay A     ›  │
│    Stop #82 · Routes 40, 41 · 5.2 mi │
│ PLACES                               │
│ 📍 8200 Westheimer Rd             ›  │
└──────────────────────────────────────┘
```
- It's a full screen: the map is hidden and the nav is hidden. The field has a 16dp radius and #F2F3FB fill. The keyboard opens because the rider tapped the search bar on purpose.
- **Empty state.** Shows "Recent searches" (up to 5, as 56dp rows) and "My stops" instead of a blank screen.
- **Result types** use distinct icons and a text type label, so they can't be confused (J2.9):
  - **Route** (C1 chip): "Route 82 Westheimer", plus an alert line in `alert-text` or "No alerts" in `live-text` #007A1A. Under it are one sub-row per direction ("→ Eastbound to Downtown").
  - **Stop**: 🚏 pole icon, name, then "Stop #2958 · Eastbound · Routes 82". Same-intersection stops are shown together (API `group`) as "Westheimer @ Kirby: 4 stops" with the direction and corner for each.
  - **Landmark**: 🏛 icon, name, "3 stops within 5 min walk".
  - **Place**: 📍 pin plus the address.
- **Smart queries** (client-side, from `routes.json` and `stops.json`):
  - "82 montrose" gives "Route 82 at Westheimer Rd @ Montrose Blvd": one row per direction, each with the stop # and live minutes.
  - "westheimer and kirby", "westheimer & kirby" and "westheimer at kirby" all normalise to cross-street search (J4.6).
  - Stop IDs match exactly first.
- Every tap on a result goes straight to its destination: route → Route page (S5), stop → Stop sheet (S3), landmark → Landmark sheet (S3b), place → Place sheet with "Stops near here" and "Directions". There is never a "What do you want to do?" dialog.
- **No results.** "No matches for 'xyz'." plus tips (18sp): "Try a stop number from the sign, a route number, or a street name like 'Main and Prairie'." and a "Browse all routes ›" button.
- **Offline.** Stops and routes still search from cached JSON, and a note reads "Places need internet."

### S3. Stop sheet (the "one good screen", made reachable)

```
┌──────────────────────────────────────┐
│              ▬▬▬                     │
│ ‹ Back                    ☆ Save     │ 48dp each
│   Lamar St @ Main St (342)           │ 22sp Bold center
│   Northbound · East side of Main St  │ 18sp #414752
│   ♿ Accessible stop                 │
│ ┌──────────────────────────────────┐ │
│ │ 🚶 Walk here · 4 min, 0.2 mi     │ │ 56dp #2976C7 pill
│ └──────────────────────────────────┘ │
│ ! Detour on Route 41. Read more ›    │ pink box 56dp
│ ┌──┐ Telephone / Heights            │ 18sp #1D1B20
│ │40│ Northbound to N Shepherd P&R   │ 18sp Bold
│ └──┘                                 │
│┌────────────────────────────────────┐│ #005DAA strip 72dp
││ 4 min   19 min   51 min   5:40 PM ›││ 32sp white Medium
││ ● Live  ● Live   Sched.            ││ 16sp white
│└────────────────────────────────────┘│
│ ┌──┐ 41 Kirby: to Downtown   12 min ›│ 64dp collapsed row
│ ┌───────────────┐ ┌───────────────┐  │
│ │📅 Full schedule│ │🗺 Route map   │  │ 56dp tonal
│ └───────────────┘ └───────────────┘  │
│ Updated 4:12 PM · refreshes 30 s   ⟳ │ 16sp #6A6A6A
└──────────────────────────────────────┘
```
- **Opens from:** a map pin, a card header, a route row, a search result, an itinerary step (J2.2), a live-trip step, or My Stops.
- **Header.** "‹ Back" on the left and "☆ Save" on the right (48dp, `accent-blue` icon plus 18sp #005DAA label). Once saved it reads "★ Saved" with a filled #2A82E6 star, and a snackbar "Saved to My Stops. Undo" stays for 10 s (fixes J4.1).
- **Title.** Centred bold "Name (ID)", as today. Under it is the direction and side from `directionLabel` and `side`. A TC stop shows "Northwest Transit Center · Bay M" and a "See all bays ›" link to S6.
- **Primary action: "Walk here"** with minutes and distance (fixes J1.3). Opens S4.
- **Alerts** from `stopDetail.alerts`: a pink `alert-bg` #F4DFE4 box with a 1dp #F7BBBB border, the "!" in #FF3B2F and the header text in 18sp `alert-text` #B3261E. Tapping it opens Alert detail. No alert shows nothing on this screen; the explicit "no alerts" text lives on the route page.
- **Routes** (every route serving the stop, from `serving`). The first route, or the one tapped, is **expanded**:
  - The route name line is 18sp #1D1B20, and "Northbound to N Shepherd P&R" is 18sp Bold in sentence case (not ALL CAPS).
  - The **blue live-minutes strip** is kept exactly as today: `brand-blue-deep` #005DAA, full-bleed, 72dp (was 58dp). It shows 4 times: minutes in 32sp white with "Live" / "Sched." in 16sp under each. Canceled times are struck through with "Canceled" in white on a #B3261E 4dp tag. The strip no longer scrolls sideways; later times are behind "›", which opens the Full schedule.
  - The other routes are **collapsed** 64dp rows showing chip, headsign and next minutes. Tapping one expands it and collapses the previous one, so only one strip is shown at a time.
- The legend row (Scheduled / Live Tracking / Canceled) is removed because every time is now labelled in words. This is the one familiar element we drop.
- **Full schedule** opens a list of today's times by hour, the same grid as today at 20sp, auto-scrolled to now. **Route map** opens S5 at this stop.
- "Track Bus Stop" is renamed **"Notify me"** and moved to the expanded route row as a 48dp bell button with the text label "Notify me". It asks when to be notified ("When the bus is 5 min away" is the default) and asks for notification permission at that point, never before.
- **Error.** "Couldn't load bus times." + "Try again" (56dp). Scheduled times are shown if they are cached.

**S3b. Landmark / place sheet** (for F11). Title "Houston Museum of Natural Science" (22sp Bold), then "Hermann Park · 5555 Hermann Park Dr" (16sp #414752). The primary button is "Directions from my location" (56dp, #2976C7), which opens the planner with the destination filled and already planned. Below it is "BUS AND RAIL STOPS NEAR HERE": C2 cards (`nearbyStops` for landmarks, `/nearby` at the place for places), sorted by walk time **from the landmark** ("🚶 3 min from the museum"), showing every route with its next times.

### S4. Walk directions

```
┌──────────────────────────────────────┐
│ ‹ Back   Walk to stop 342            │ app bar 64dp
│ ┌──────────────────────────────────┐ │
│ │     map: dotted street route     │ │ 45% height
│ │  ● you ...... ▲ 342 (callout)    │ │ fits both ends
│ └──────────────────────────────────┘ │
│  4 min · 0.2 mi (about 1,050 ft)     │ 24sp Bold
│  Arrive at stop by 4:16 PM           │ 18sp #414752
│  Bus 40 leaves 4:24 PM: you have     │ 18sp live-text
│  8 min to spare ✓                    │
│ ─────────────────────────────────── │
│ 1 ↑ Head north on Main St   500 ft  │ 64dp step rows
│ 2 ↰ Turn left on Lamar St   450 ft  │ 18sp / 16sp
│ 3 ▲ Stop 342 is on your right,       │
│     east side of Main St            │
│ ┌──────────────────────────────────┐ │
│ │   Open in Google Maps ↗           │ │ 56dp tonal
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```
- Data comes from `/walk` (OSRM foot). US units come from `distanceText`. Duration uses the pace setting (`durationMin` or `relaxedDurationMin`).
- The final step is always built from `side` and `directionLabel`: "Stop 342 is on the east side of Main St. Buses here go northbound."
- A **Bus check line** appears when the rider came from a route row: "Bus 40 leaves 4:24 PM", followed by either "you have 8 min to spare" (`live-text`) or "you may miss it; next one 4:43 PM" (`alert-text`).
- Tapping a step zooms the map to that turn (the audit named this as the pattern to build on).
- **Fallback** (`source: straight-line-estimate`): a grey dashed line and an amber box that reads "Street-by-street directions aren't available right now. The stop is about 0.2 mi north-east." "Open in Google Maps" becomes the primary button in that case.
- One primary action at most. The screen is read-only unless the rider wants the Google Maps handoff.

### S5. Route page

```
┌──────────────────────────────────────┐
│ ‹ Back                  ☆ Save route │
│ ┌────┐                               │
│ │ 82 │ Westheimer                    │ badge 56dp navy
│ └────┘                               │ 28sp Bold
│ ✓ No alerts on Route 82 right now    │ live-text 18sp
│ ┌─────────────────┬────────────────┐ │ 56dp segmented
│ │▶Eastbound       │ Westbound      │ │ sel #2976C7
│ │ to Downtown     │ to Mission Bnd │ │
│ └─────────────────┴────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ 🔍 Find a stop on Route 82       │ │ 56dp field
│ └──────────────────────────────────┘ │
│ [Show on map]                        │ 48dp tonal
│ ○ Richmond @ Westheimer #2901  12 min│ 64dp rows
│ │                                    │ spine #C1C6D4
│ ● Westheimer @ Kirby  #2955 🚌 2 min │ bus icon=live bus
│ │ ! Stop moved 150 ft east           │
│ ◉ Westheimer @ Montrose #2958 ●4 min │ nearest=highlight
│ │  Nearest to you · 🚶 6 min         │
└──────────────────────────────────────┘
```
- **Header.** The navy #004080 square badge with the number in 36sp white Medium, next to the 28sp Bold route name, as on today's Route screen.
- **Alert line** (always present, fixes F6/J4.4). Either "✓ No alerts on Route 82 right now" in `live-text`, or a pink box with each alert header (18sp) plus "Read more ›". The line is truthful to the feed: when alerts are in demo mode it adds "(demo alerts)".
- **Direction switch.** Two 56dp segments, each labelled with the direction and headsign. It defaults to the direction whose nearest stop is closest to the rider.
- **Find a stop.** Filters the list as you type ("montrose"), and matches cross-street words.
- **Ordered stop list** (`routes/:id` `stops`). Each 64dp row shows a spine node, the stop name in 18sp, "#2958" in 16sp #414752, and on the right the next arrival at that stop for this direction (from `/arrivals`, loaded lazily for visible rows). A live bus between two stops shows as a bus icon on the spine (`/vehicles?route=82`). The stop nearest the rider has a navy ring, "Nearest to you · 🚶 6 min", and is auto-scrolled into view. Tapping a row opens S3 for that stop with Route 82 expanded (F5).
- **Show on map** draws the line in navy with the stops and live buses, and keeps the list reachable with "Show list".
- **Timetable (PDF) ↗** is kept as a text link at the bottom for riders who used it.
- **States.** Route not found: "Route 823 doesn't exist. Try the number on the front of the bus." No service today: "No Route 82 service on Sundays" with the next service day.

### S6. Transit center view

```
┌──────────────────────────────────────┐
│ ‹ Back   Northwest Transit Center    │
│ ┌──────────────────────────────────┐ │
│ │  bay map: C D E G H I K L M N... │ │ 35% height map
│ │  letters in 36dp circles         │ │ your bay = navy
│ └──────────────────────────────────┘ │
│ 🔍 Find your route       [All bays ▾]│ 56dp field
│ NEXT DEPARTURES                      │
│ ┌──────────────────────────────────┐ │
│ │ Bay M  ┌──┐ Westbound to Addicks │ │ 72dp row
│ │  (M)   │58│ ● 6 min Live · 4:18PM│ │ bay 36dp circle
│ │        └──┘ then 36 min          │ │
│ ├──────────────────────────────────┤ │
│ │ Bay D  ┌──┐ to Monroe P&R 11 min │ │
│ │  (D)   │85│ Scheduled · 4:23 PM  │ │
│ └──────────────────────────────────┘ │
│ Buses ending here are not listed.    │ 16sp #414752
└──────────────────────────────────────┘
```
- Data comes from `getTransitCenterDetail`: `bays[].departures`, sorted by departure time, not by bay. Riders ask "which bus is next and where", so time order answers that directly.
- **Bay map.** MapLibre at zoom 18 with a C4 bay marker for every bay at its real `lat/lon`, so bays are no longer stacked (J1.5). Tapping a row highlights its bay in navy #004080 with the label "Bay M: your bus".
- **Row.** A bay badge (48dp white circle with a 2dp navy ring and a 20sp Bold letter), then the route chip, headsign, time and "Live" or "Scheduled". Tapping a row opens S3 for that bay's stop.
- Departures only: `unassignedDepartures` go under "Bay not known", and routes that end at the TC are excluded.
- **Find your route** filters to one route, for example "58" leaves only the Bay M rows.
- If `source` is `hand-authored-demo`, a footer reads "Bay letters are from a demo list".
- It opens from the TC pin, the TC card on Home (whose header reads "Northwest Transit Center · 16 bays · See departures ›"), and search.

### S7. Trip planner form

```
┌──────────────────────────────────────┐
│ ‹ Back   Plan Your Trip              │ 24sp
│ ┌──────────────────────────────────┐ │ #F3F2F8 r12
│ │ ●  My current location           │ │ 64dp rows 18sp
│ │ ↓  ─────────────────────── (⇅)   │ │ swap 48dp circle
│ │ 📍 Where to?▌                    │ │ focused
│ └──────────────────────────────────┘ │
│ RESULTS                              │
│ 🏛 Hobby Airport (bus curb)       › │ 64dp rows
│    Landmark · Terminal bus stop      │
│ 📍 William P. Hobby Airport (HOU) › │
│    Place · 7800 Airport Blvd         │
│ ─────────────────────────────────── │
│ (when a destination is set:)         │
│ Leave  [Now] [In 15] [In 30] [1 hr]  │ 48dp chips
│        [Pick a time…]                │
└──────────────────────────────────────┘
```
- It looks the same as today: blue dot, arrow, red pin, swap circle, "Leave at" chips.
- **Opening from "Where to?"** focuses the destination field. Picking a result plans immediately with "Now" and goes to S8. There is no separate "Plan My Trip" tap (fixes F3/F8 step counts). The rider can come back with Back to change the time.
- **Time.** Now / In 15 min / In 30 min / In 1 hr chips (48dp, `chip-inactive` #EBEBEB, selected #2976C7 with white text). "Pick a time…" opens one sheet with "Leave at / Arrive by" radio rows, a large hour:minute wheel (56dp rows) and "Done". That's one screen instead of the four in J2.
- **Search ranking.** Curated landmarks come before OSM places, so "Hobby Airport (bus curb)" appears first (J2.3). Recents and My stops show while the field is empty.
- **No location.** The "From" row reads "Choose a starting point" in `alert-text` with the hint "We can't find your location. Type where you'll start." The Plan button is never greyed out without a reason (J2.10).

### S8. Itinerary list ("Select Itinerary")

```
┌──────────────────────────────────────┐
│ ‹ Back   Choose a trip               │
│ ● My location → 📍 Hobby Airport  ✎  │ 18sp, edit 48dp
│ Leave now                    Change  │
│ [Fewest transfers][Fastest][Least walk]│ 48dp chips
│ ┌──────────────────────────────────┐ │ #F3F2F8 r12
│ │ 4:12 PM → 5:06 PM        54 min  │ │ 20sp Bold
│ │ 🚶5 › [80] › [40] › 🚶2           │ │ chips 40dp
│ │ Get on 80 at 4:18 PM, stop #11425│ │ 16sp #414752
│ │ ● Live · 1 transfer · $1.25      │ │ fare #005DAA
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ 4:20 PM → 5:21 PM   1 hr 1 min   │ │
│ │ ! Tight transfer (3 min)         │ │ alert-text
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```
- Each card is at least 120dp tall, so it is bigger than today's 70dp card and includes the boarding line "Get on 80 at 4:18 PM, stop #11425".
- We keep the familiar mode strip, the right-hand total time and the blue fare #005DAA 18sp.
- `hasTightTransfer` shows "! Tight transfer (3 min)". A final walk longer than 10 min shows "Long walk at the end (17 min)" (J2.3 guard).
- **Empty** (`message`): "No trips found for this time." plus buttons "Try 30 min later", "Start from the nearest stop" and "Walk there (1.8 mi, 40 min)". This replaces the "OK" dead end (J2.4).
- Tapping a card opens S9. Back returns to S7 with everything kept.

### S9. Itinerary detail ("My Itinerary")

```
┌──────────────────────────────────────┐
│ ‹ Back   Your trip       Arrive 5:06 │ 54 min
│ ┌──────────────────────────────────┐ │ map 30%: blue dot,
│ │ map fitted to whole trip         │ │ labeled stops, red
│ └──────────────────────────────────┘ │ pin, colored legs
│ ┌──────────────────────────────────┐ │
│ │ ● 4:12 Start: your location      │ │ timeline #F3F2F8
│ │ ┊ 🚶 Walk 5 min (0.2 mi)       › │ │ → S4
│ │ ▲ 4:18 Get on Route 80           │ │ 18sp Bold
│ │ │  at M L King @ UH Univ Dr      │ │
│ │ │  Stop #11425 · Southbound      │ │ 18sp #414752
│ │ │  West side of M L King Blvd    │ │
│ │ │  Sign says: to MLK & Park Vlg  │ │
│ │ │  ● Live: 6 min    Stop info ›  │ │ → S3
│ │ │  Ride 9 stops (16 min)         │ │
│ │ │  ! Alert: Elevator out… ›      │ │ tappable
│ │ ▼ 4:34 Get off at Eastwood TC    │ │
│ │ ┊  Walk to Bay D (1 min)         │ │
│ │ ▲ 4:40 Get on Route 40 at Bay D  │ │
│ │ ...                              │ │
│ │ 📍 5:06 Arrive Hobby Airport     │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │        ▶ Start trip              │ │ 56dp #2976C7
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```
- This is a full screen with the map on top and a "‹ Back" button. There is no swipe-to-dismiss sheet, so nothing can discard the trip (J2.6). The plan is saved locally until the rider taps "Clear trip" or 24 h pass.
- **Boarding step wording** (fixes J2.1 and J2.5): "Get on Route 80" / at <stop name> / "Stop #11425 · Southbound" / "<side>" / "Sign says: to <headsign>". The words "Transfer to <alighting stop>" are gone. Rail steps read "Get on the Red Line toward Fannin South".
- **Every step is tappable** (J2.2):
  - A walk step opens S4.
  - A stop line opens S3 for that stop.
  - An alert opens Alert detail.
  - Transfer steps show "Walk to Bay D (1 min)" and "Wait 5 min"; a `tight` transfer is flagged in `alert-text`.
- **Map** (J2.7). Fitted to the whole trip, above the list rather than under a sheet. Legs are drawn in each route's colour. Boarding and getting-off stops carry label pills ("Get on · #11425"). Only the destination uses a red pin.
- **Primary: "Start trip"** opens S10. A secondary "Share trip" text link uses the Web Share API.

### S10. Live trip mode ("Go")

```
┌──────────────────────────────────────┐
│ ✕ End trip           Arrive 5:06 PM  │ 48dp; 18sp
│ ┌──────────────────────────────────┐ │ map 40%, follows
│ │  map: you + path + next stop     │ │ you at zoom 17
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │ step card
│ │ STEP 2 OF 5                      │ │ 16sp #414752
│ │ Wait for Route 80                │ │ 26sp Bold
│ │ Stop #11425 · Southbound side    │ │ 18sp
│ │ Sign: to MLK & Park Village      │ │
│ │ ┌──────────────────────────────┐ │ │ #005DAA strip
│ │ │  Bus arrives in  6 min ●Live │ │ │ 32sp white
│ │ └──────────────────────────────┘ │ │
│ └──────────────────────────────────┘ │
│ Then: ride 9 stops, get off at       │ 18sp #414752
│ Eastwood TC                          │
│ [ ◀ Previous step ]  [ Next step ▶ ]│ 56dp tonal each
│ 🔔 Get alerts in your pocket? Turn on│ 56dp tonal card
└──────────────────────────────────────┘
```
Step card variants (all 26sp Bold headline):

| Phase | Headline | Details | Source |
|---|---|---|---|
| Walking | "Walk to Stop #11425" | "3 min · 650 ft. Turn left on Wheeler Ave." plus the next OSRM step | `/walk`, GPS |
| Waiting | "Wait for Route 80" | Live minutes strip, sign text | `/arrivals` |
| Riding | "**4 stops** to Eastwood TC" | A large 40sp number, the next stop name, a progress bar (#2976C7 on #E4EBF6, 12dp tall) | `/trips/:id` stops plus `/vehicles` for that `tripId`, or GPS |
| Get off soon | "**Get off at the next stop**" | A full-width **amber** card (#FFF3CD, 2dp #B26A00 border) and a vibration. Fires 2 stops before and again at 1 stop before (fixes J3.2). | same |
| Transfer | "Walk to Bay D for Route 40" | Bay map thumbnail and "Leaves 4:40 PM, 6 min to spare" | TC data |
| Final walk | "Walk 2 min to Hobby Airport" | Guidance continues to the destination (J3.7) | `/walk` |
| Arrived | "You've arrived" | Buttons "Done" and "Plan return trip" | |

- **Auto-advance** from GPS and the vehicle position. The rider can always step through manually with the two 56dp buttons, so the screen works without GPS.
- **Off route** (J3.4). More than 80 m from the walk path for 20 s shows "You may be going the wrong way." with "Show me the way again", which re-routes from the *current* fix.
- **Lost live data.** "Tracking lost, showing scheduled time 4:18 PM" (honest data).
- **Screen and background** (J3.1). The PWA requests the Wake Lock API so the screen stays on, and says "Keep this screen open during your trip" in the first step. On return from the background it recomputes position immediately ("Welcome back: you are 2 stops from Eastwood TC") instead of silently dying. If notifications are granted (asked here by the tonal card, never at launch), a notification is sent at each phase change while the page is alive. Background location is a platform limitation of a PWA, and the screen states that plainly.
- **Home persistence.** The navy "Trip in progress" banner on Home and a "Trip" chip on the Explore map (bottom-left, 48dp) bring the rider back. Back from S10 returns to Home without ending the trip; only "✕ End trip" (which confirms with "End this trip? Yes, end / Keep going") ends it.

### S11. Alerts (More → Service alerts, or from any alert link)

```
┌──────────────────────────────────────┐
│ ‹ Back   Service alerts              │
│ ┌──────────────────────────────────┐ │
│ │ 🔍 Check a route or stop number  │ │ 56dp field
│ └──────────────────────────────────┘ │
│ AFFECTING YOUR STOPS                 │
│ ┌──────────────────────────────────┐ │ alert-bg card
│ │ ! [82] Kirby stop moved 150 ft   │ │ 18sp Bold alert-text
│ │   east · until Oct 3             │ │ 16sp #414752
│ └──────────────────────────────────┘ │
│ ALL ALERTS (4)                       │
│ ! [5] Detour at Scott & Griggs    › │ 72dp rows
│ ! [Red] Trains every 18 min…      › │
│ ! Hobby Airport elevator out      › │
└──────────────────────────────────────┘
```
- The list is in the app (J4.4), from `/alerts`. Riders don't see the GTFS cause/effect codes; each maps to words ("Detour", "Stop moved", "Reduced service", "Elevator out").
- **Check a route.** Typing "82" shows either that route's alerts or a green `live-text` line "✓ No alerts on Route 82", which makes "no alert" explicit.
- **Alert detail** (pushed). Header in 22sp Bold, description in 18sp, "Active until Oct 3, 2026", and the affected routes (chips) and stops as tappable rows leading to S3 (e.g. #9977 "Closed, board at Scott @ Southmore instead ›").
- Source footer: "From METRO, updated 4:10 PM". In demo mode it reads "Demo alerts".

### S12. My Stops tab (was Recent)

```
┌──────────────────────────────────────┐
│ My Stops                     Edit    │ 24sp; 48dp
│ SAVED                                │
│ ┌──────────────────────────────────┐ │ C2 card compact
│ │★ Westheimer @ Montrose (2958)    │ │
│ │ Eastbound · [82] to Downtown     │ │
│ │                   ● 4 min Live › │ │ 28sp
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │★ Northwest Transit Center        │ │
│ │ [58] Bay M   6 min · [85] 11 min │ │
│ └──────────────────────────────────┘ │
│ RECENT                   Clear all   │ 16sp #414752
│ [82] [40]                            │ chips 56dp
│ 🚏 Lamar St @ Main St (342)       › │ 64dp rows
└──────────────────────────────────────┘
```
- Saved stops show live times (F2 = 0 because they're also on Home). Saving a stop saves all its routes, and "Edit" lets the rider pick which routes to show and reorder with **↑ / ↓ buttons** (48dp) rather than dragging.
- **Edit mode.** Each row gets "Remove" (48dp, `alert-text`). Removal shows the snackbar "Removed. Undo" for 10 s.
- **"Clear all" on Recent** asks "Clear recent stops? Your saved stops stay." with "Clear" and "Cancel".
- Saved stops live in `localStorage` (per device). The copy says "Saved on this phone" so riders understand they won't sync.
- **Empty.** Big star icon (64dp #004F97), "No saved stops yet", and "Open any stop and tap ☆ Save." (18sp).

### S13. Fares (stub: handoff to METRO)

```
┌──────────────────────────────────────┐
│ Fares                                │ 24sp
│ ┌──────────────────────────────────┐ │
│ │ 🎫 Show my ticket                │ │ 56dp #2976C7
│ └──────────────────────────────────┘ │
│  Opens the METRO ticket app          │ 16sp #414752
│ FARES                                │
│ Local bus & METRORail       $1.25    │ 64dp rows 18sp
│ Seniors 65–69, disability,  $0.60    │
│   students (reduced fare)            │
│ Seniors 70 and older         Free    │
│ Park & Ride           $2.00–$4.50    │
│ Transfers within 3 hours     Free    │
│ Get a reduced-fare card ↗            │ #005DAA 18sp
│ Where to buy or reload ↗             │
└──────────────────────────────────────┘
```
- **"Show my ticket"** opens a clear stub sheet: "Tickets and payments are handled by METRO's RideMETRO account. [Continue to METRO ↗]" with a note "Handoff to METRO: login and payment are out of scope for this prototype." F9 = 1 action to reach the fare screen.
- The fare table is static content, marked in code `// VERIFY with METRO fare policy before release`. The reduced and senior values above are our best reading of METRO's published policy and **must be confirmed by METRO**.
- Future work for METRO: a boarding mode (full-screen, maximum-brightness QR, cached offline) per improvements.md #2. We show it only as a greyed "Coming from METRO" row.

### S14. More

```
┌──────────────────────────────────────┐
│ [METRO logo]                         │
│ ! Service alerts               (3) › │ 56dp, count badge
│ 🌐 Language          English      › │
│ Aa Text size          Standard    › │
│ 🚶 Walking pace       Normal      › │
│ RIDER RESOURCES                      │ blue caps #005193
│ Route schedules                   › │ 56dp rows 18sp
│ Learn how to ride                 ↗ │
│ Fare card retailers               ↗ │
│ CONTACT US                           │
│ Customer service  713-635-4000    📞 │ tel: link
│ METRO Police                      📞 │
│ Feedback                          ↗ │
│ MORE INFORMATION                     │
│ Settings · Terms · Privacy        › │
└──────────────────────────────────────┘
```
- The layout is the same as today: blue caps section headers (`brand-blue-dark` #005193, 16sp), dividers in #C1C6D4, chevrons for in-app pages and ↗ for external links. Rows are 56dp (were 48dp).
- The accessibility settings are the first things on the page, not buried in a sub-menu.
- The phone number is a real `tel:` link with the number spelled out.

### S15. Settings: language, text size, walking pace

- **Language.** A 3-row radio group (56dp rows), each written in its own language (English / Español / Tiếng Việt). The change applies instantly with no restart, and the choice is also shown as "Idioma / Ngôn ngữ" beside the title so someone who can't read English can find it.
- **Text size.** A segmented control with Standard / Large / Largest (1.0 / 1.25 / 1.5), and **a live preview card** showing a C2 stop card at that size. Choosing Largest switches home to list-first (the sheet opens Full and the map is behind "Show map").
- **Walking pace.** Normal (about 3 mph) / Slower (about 2 mph). Help text: "Walk times and 'can I make it' use this pace."
- **Accessibility.** "I use a wheelchair or can't use stairs" (switch, 48dp, on = #2976C7 track) sorts accessible stops first and marks the others "Not marked accessible".
- **Vibration** (kept from today's "Pulse Vibration" as "Vibrate for trip alerts").
- **Help:** "Show the welcome screen again".

### S16. Location off / denied

```
┌──────────────────────────────────────┐
│ [METRO] Place, Stop, or Route   🔍   │
│   map: Downtown, zoom 13             │
│   pill: "Showing Downtown, not you"  │ 16sp on white
│╭────────────────────────────────────╮│
││ ┌────────────────────────────────┐ ││ #F3F2F8 card
││ │ 📍 Location is off             │ ││ 20sp Bold
││ │ We can't show stops near you.  │ ││ 18sp
││ │ ┌────────────────────────────┐ │ ││
││ │ │   Turn on location          │ │ ││ 56dp #2976C7
││ │ └────────────────────────────┘ │ ││
││ │   Search for a stop instead    │ ││ 48dp text
││ └────────────────────────────────┘ ││
││ MY STOPS (still live) ...          ││
│╰────────────────────────────────────╯│
└──────────────────────────────────────┘
```
- There is no fake "Nearby" list (J4.2). Search, My stops, routes and the planner all work.
- **"Turn on location."** If the permission state is `prompt`, this re-asks. If it is `denied`, a sheet shows 3 numbered steps with a picture: "1. Tap the ⓘ or lock icon at the top of Chrome. 2. Tap Permissions > Location. 3. Choose Allow." For the installed PWA: "Android Settings > Apps > RideMETRO > Permissions".
- The locate FAB in this state opens the same sheet. It never silently re-centres (J3.13).
- The planner's "From" row asks for a starting point (see S7).

### S17. Offline and error states

| Situation | Treatment |
|---|---|
| **No internet** | A top banner (48dp, #414752 bg, white 16sp): "No internet. Showing times saved at 4:12 PM." Times are shown in #414752 with "Saved 4:12 PM" in place of Live/Scheduled. Stops, routes, saved stops and walk-free info come from the service worker cache (`stops.json`, `routes.json`, last API responses). Planning shows "Trip planning needs internet. Try again ⟳". |
| **Server error / timeout** | Inside the affected card only: "Couldn't load bus times." + "Try again" (48dp tonal). Other cards keep working. |
| **No live data for a route** | Show scheduled times with the word "Scheduled", plus a 16sp note "Live tracking is unavailable for this route right now." |
| **Vehicle stale** (`ageSeconds > 120`) | The bus icon turns grey with "Last seen 3 min ago". |
| **Walk service down** | S4 fallback as described. |
| **Plan fails** | S8 empty state with three alternatives. |
| **Alerts feed down** | "Alerts can't be checked right now." We never show "No alerts" when we don't know. |
| **Unknown stop / route ID** | "We couldn't find stop #99999. Check the number on the sign." + Search. |

---

## 4. Flows F1–F11: new step paths

An action is one tap, one typed field, one swipe, one back press or one system dialog, counted from launch with the app already set up (except for F10).

| Flow | New path | New actions | Baseline (expert/first-timer) | Target |
|---|---|---|---|---|
| **F10** First launch → usable map | 1. Tap "Show buses near me" (language is pre-set from the phone). 2. OS dialog: "While using the app". The home map and list of nearby stops are ready. | **2** | 14 / 14 | ≤ 3 ✓ |
| **F1** Nearest stop for 40 NB + next bus | 0. The home sheet shows stops by walk time. 1. Tap the "40" chip in the route filter row. The list shows "Northbound to N Shepherd P&R: Lamar @ Main #342, 🚶 6 min, 4 min Live". If the 40 NB stop is already among the first cards, it is 0 actions. | **1** (0 if visible) | 2 / 4 | ≤ 1 ✓ |
| **F2** Next 82 at my stop #2958 | 0. Launch: "My stops" at the top of Home shows "Westheimer @ Montrose (2958) · 82 to Downtown · 4 min Live". | **0** (after saving once: open stop, tap ☆ Save = 1 extra tap, one time) | 3 / 5 | 0 ✓ |
| **F3** UH → Hobby, know where to board | 1. Tap "Where to?". 2. Type "hobby". 3. Tap "Hobby Airport (bus curb)", which plans immediately. 4. Tap the first trip. S9 shows "Get on Route 80 at M L King @ UH Univ Dr, Stop #11425 · Southbound · West side · Sign says: to MLK & Park Village". | **4** | 10 / 13 | ≤ 4 ✓ |
| **F4** Walking directions to stop #342 | 1. Tap stop 342's pin on the map (or its card header). 2. Tap "Walk here", which gives the street route and US-unit steps. *Shortcut:* tap the "🚶 4 min" chip on its Home card = **1**. From search: tap search, type 342, tap result, Walk here = 4. | **2** (1 from Home card) | impossible | ≤ 2 ✓ |
| **F5** Route 82 → stops → live EB at Westheimer @ Montrose | 1. Tap search. 2. Type "82". 3. Tap "→ Eastbound to Downtown". Route page, EB, searchable ordered list with live times per stop. 4. Tap "Westheimer @ Montrose #2958" (auto-scrolled into view when it's near the rider; otherwise type "montrose" in *Find a stop*, +1). The stop sheet shows the 82 EB live strip. *Faster:* type "82 montrose" and tap the EB row = **3**. | **4** (3 via smart query; 5 when the stop is far from the rider) | 9 / 18 | ≤ 4 ✓ |
| **F6** Alerts on Route 82 | 1. Tap search. 2. Type "82". The Route 82 result already shows "! 1 alert: Kirby stop moved" (or "No alerts"). The full text is one more tap (3). *Alt:* the Home alert banner shows it at 0 when 82 is saved. | **2** | 6, partial | ≤ 2 ✓ |
| **F7** NW TC: bay for Route 58, next departure | At or near the TC: 1. Tap the "Northwest Transit Center · See departures" card at the top of Stops near you (or the TC pin). S6 lists "Bay M · 58 Westbound · 6 min Live" in time order. 2. (Optional) tap the row to highlight Bay M on the bay map. From elsewhere: search, type "northwest", tap TC = 3. | **1–2** | 2 / 14 | ≤ 2 ✓ |
| **F8** Start live trip tracking | 1. "Where to?". 2. Type "hobby". 3. Tap result (auto-plans). 4. Tap the first trip. 5. "Start trip" opens live step card 1. Notifications are an optional, non-blocking card in S10, so they add no required step. | **5** | 9, partial | ≤ 5 ✓ |
| **F9** Fare screen | 1. Tap "Fares". The fare table (incl. reduced and senior fares) and "Show my ticket" (handoff stub) are shown. | **1** | 1 (wall) | 1 ✓ |
| **F11** HMNS → closest stop → next arrivals | 1. Tap search. 2. Type "natural science". 3. Tap "Houston Museum of Natural Science". The landmark sheet shows "Main St @ Remington Ln (2504) · 🚶 3 min from the museum" and the other stops sorted by walk time, each with every route and its next times. | **3** | 6, partial | ≤ 3 ✓ |

**Total:** baseline 65 expert actions (F4 counted as 3 to a dead end) → **25** (using the headline counts above). Every flow now fully reaches its goal, with the "missing" information on screen.

---

## 5. Audit findings (CRITICAL and HIGH) mapped to this design

| Finding | Severity | Fix in this design |
|---|---|---|
| J1.1 Stops are tiny unlabelled dots | CRIT | C4 markers: 36dp pins with a direction notch and 48dp hit area, clusters with counts below zoom 15, labels "#342 · 4 min" on the 3 nearest, spoken labels with name, ID, direction, routes and walk time. |
| J1.2 Nearby list has no stop, distance or side | CRIT | C2 stop group cards sorted by walk time: name, "Stop #342 · Northbound · East side", walk minutes, max 3 routes each, can't-make-it greying. 6 cards, not 59. |
| J1.3 No walking directions | CRIT | "Walk here" primary button on every stop sheet plus the walk chip on every card, leading to S4 (OSRM street route, steps in feet and miles, side of street, Google Maps handoff). |
| J1.4 Walk leg is a straight dotted line | HIGH | Itinerary walk steps open S4 with the street-routed path. The straight-line fallback is visibly dashed grey with a warning. |
| J1.5 TC bays stacked, arrivals instead of departures | HIGH | S6 transit center view: bay markers at real coordinates, departures-only list in time order with bay badges, "Buses ending here are not listed". |
| J1.6 Panning replaces "nearby" | HIGH | The list stays pinned to GPS. An explicit "Show stops in this area" button, a header naming the area, and "Back to my location". |
| J2.1 Boarding pole, direction and ID missing | CRIT | Boarding step: "Get on Route 80 · Stop #11425 · Southbound · West side · Sign says: to …", also on the S8 card line and the S10 wait card. |
| J2.2 Itinerary steps are dead ends | CRIT | Every step is tappable: walk → S4, stop → S3 live sheet, alert → Alert detail. |
| J2.3 Airport place adds a 17-min walk | CRIT | Curated landmarks (with the bus-curb stop) rank above OSM places. A "Long walk at the end" flag appears on cards. |
| J2.4 "Cannot find any trips" for routable trips | HIGH | S8 empty state explains why and offers 3 alternatives (later time, nearest stop, walk). No bare OK modal. |
| J2.5 "Transfer to <alighting stop>", no headsign | HIGH | Plain verbs "Get on / Ride N stops / Get off at", with "Sign says: to <headsign>". Rail is named "Red Line toward Fannin South", with no zero padding. |
| J2.6 Swiping the sheet discards the trip | HIGH | Itinerary is a full screen with Back, and the plan is persisted. Home shows "You planned a trip… Open / Clear". |
| J2.7 Itinerary map poorly framed | HIGH | Map above the list, fitted to the whole trip, legs in route colours, labelled get-on and get-off pins, red only for the destination. |
| J3.1 Tracking dies in the background | CRIT | Wake Lock keeps the screen on, with a stated "keep this screen open" note. The position is recomputed immediately on return. There is a persistent Home banner and Trip chip, and "tracking" is never shown when it has stopped. |
| J3.2 Alerts fire at 5 m or 25 m | CRIT | Stop-count based warnings (from the trip's stop list, vehicle position and GPS) fire 2 stops and 1 stop before, with a large amber "Get off at the next stop" card and vibration. |
| J3.3 No step-by-step guidance | HIGH | S10 step card with phases, a 40sp stops-remaining count, a progress bar, live ETA, and manual Previous/Next buttons. |
| J3.4 No off-route detection | HIGH | Walks more than 80 m off the path for 20 s produce "You may be going the wrong way" and a re-route from the current fix. |
| J3.5 Stop alerts lack route, direction, ID, and use RT/SC | HIGH | All phase messages name the route, sign, stop # and side of street. Times are labelled "Live" or "Scheduled" in words. |
| J4.1 No favourites | HIGH | ☆ Save on stop, route and TC. Saved stops with live times are on Home and in the My Stops tab. Undo. |
| J4.2 Location denied fakes a position | HIGH | S16: an explicit "Location is off" card, a "Showing Downtown, not you" label, a way to re-enable with steps, and no fake Nearby list. |
| J4.3 Route → stop arrivals takes about 10 taps | HIGH | S5 route page: direction switch, "Find a stop", ordered list with live next times per stop, nearest highlighted. Smart search "82 montrose". |
| J4.4 Alerts on an external website | HIGH | S11 in-app alerts (from GTFS-RT), inline on route, stop, itinerary and search results. Explicit "No alerts on Route 82". |
| J4.5 Pins only inside a circle, overlapping | HIGH | Stops load for the whole visible map with clustering. Same-corner stops are fanned out and labelled with direction notches. The circle is removed. |
| *(Low, core to this lens)* J1.12 / J4.10 coach marks, J4.11 no language | LOW | No coach marks at all. Language on the welcome screen and in More, with EN/ES/VI. |

---

## 6. What stays the same, and what changes

### Stays identical (recognition cues)

1. **Bottom nav:** same four slots in the same order (Explore, Fares, [Recent→My Stops], More), same icons, same #E4EBF6 bar and #2976C7 active pill.
2. **White pill search bar** with the METRO logo and "Place, Stop, or Route", and white rounded-square map FABs with the blue locate icon.
3. **Route chip:** white tile with the navy #004080 band (red for rail) and a black number, used everywhere.
4. **Stop sheet:** centred bold "Name (ID)", the **#005DAA live-minutes strip** with big white numbers, the Full Schedule button.
5. **Plan Your Trip form:** blue dot, arrow, red pin, swap circle, the Now / In 15 / In 30 / In 1 hr chips, blue pill primary.
6. **Itinerary card and timeline:** mode strip, right-aligned duration, blue fare, sort chips, coloured leg lines with dotted walks, "My Itinerary"-style step list on #F3F2F8, pink alert box.
7. **More list:** blue caps section headers, chevron vs ↗, same entries.
8. **Colour semantics and surfaces:** navy/blue = METRO, green = live, red = alert, rail or destination. Roboto, flat M3 surfaces, 28dp sheet corners, #F3F2F8 cards, 16dp margins.
9. **Recent list:** still there, inside My Stops, with the same chips and rows.

### Changes, and why

| Change | Why |
|---|---|
| Everything bigger: body 18sp (from 11–15), times 28sp, targets 48–56dp, primary buttons 56dp | 11sp arrival times and 9sp instructions are unreadable for low vision, and 32dp chips are too small for shaky hands. |
| Darker text versions of the green and red tokens | #00BB1F and #FF3B2F fail contrast as text. |
| Sentence case instead of ALL CAPS for direction and headsign | Caps text is slower to read for low-vision readers. The words stay the same. |
| Left route-chip rail → filter row in the sheet | It covered 15% of the map and hid pins. |
| Trip-planner icon FAB → "Where to?" button | An unlabelled icon was the only way into the planner. |
| "What do you want to do?" and "Choose Direction" dialogs removed | Each added a step and a decision. Results now go straight to the right screen. |
| Legend row removed from the stop sheet | Times now say "Live" or "Scheduled" in words. |
| Recent → My Stops, with Save | Daily riders had no favourites. |
| Coach marks and 3-permission onboarding → one welcome screen | 14 actions before first use. Help lives in plain labels instead. |
| Sheets get visible Show list / Show map / Back buttons | No hidden gestures, and swiping can no longer throw away a trip. |
| Itinerary becomes a full screen with tappable steps, plus a new live-trip screen | Dead ends and the bell-only tracking state (J2.2, J3.3). |
| New screens: Walk directions, Route page with stop list, Transit center view, in-app Alerts, Fare table, Language, Text size, Walking pace | Each fills a gap the audit or the baseline found impossible or partial. |
| Clock format "4:24 PM · 19 min" | Fixes "1:0min", "1:13h" and the zero-padding mix. |

### Data honesty notes for METRO

- Everything above maps to existing endpoints: `/nearby`, `/stops/:id`, `/arrivals`, `/walk`, `/plan`, `/search`, `/routes/:id`, `/trips/:id`, `/vehicles`, `/alerts`, `/transit-centers`.
- Stubbed or needing METRO confirmation:
  - ticket, login and payment (handoff to METRO);
  - fare values (verify);
  - the Vietnamese and Spanish UI copy (native review);
  - alert translations beyond what the feed provides;
  - background tracking, which is a PWA platform limit and is stated on screen;
  - hand-authored TC bay lists, which are labelled on screen when used.
