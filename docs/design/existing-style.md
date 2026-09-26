# RideMETRO Android v2.71: existing visual style reference

Purpose: give the PWA redesign enough detail to reproduce the current RideMETRO Android look, so existing riders (many of them older) still recognise it, while leaving room to change the interface.

**Method.** I viewed about 35 screenshots from `ux-audit/j1..j4` and `baseline/` with the Read tool. PIL was not installed, so I sampled hex colours with a small pure-Python PNG decoder (zlib only), using the mode of a box or the darkest/most saturated pixel for text and icons. I measured sizes by scanning pixel runs. The device is 1080x2400. Conversions use **2.625 px per dp**. Type sizes are estimated from cap-height ink (Roboto cap height is 0.711 em), so treat them as ±1sp. The emulator may also apply a system font scale.

The scripts are in the session scratchpad and are not committed. Crops are in `docs/design/ref/`, and each file is named in the sections below.

---

## 1. Colour tokens

### Brand and primary
| Token | Hex | Where used | Evidence |
|---|---|---|---|
| `brand-navy` | **#004080** | Top band of route chips; big route badge on the Route screen; selected-route polyline (#014180) | j1/12 chip header, j4/20 "82" badge, j1/17 route line |
| `brand-blue-deep` | **#005DAA** | Live-minutes strip on the stop sheet; dialog titles; dialog "Cancel"; Settings section header | j1/17 strip, j4/12 dialog, j4/48 |
| `brand-blue-dark` | #005193 / #004F97 | More-tab section headers ("RIDER RESOURCES"); links on the Route schedule screen ("PDF Schedule", "EASTBOUND (…)"); onboarding hero icons | j1/35, j4/20, j1/00 |
| `primary` | **#2976C7** | Filled buttons (Continue, Close, Track Itinerary, Plan My Trip when enabled); active nav pill; active filter and time chips | j1/00, j2/32, j1/36, j2/22 |
| `accent-blue` | **#2A82E6** | Icon tint (calendar and bell on the stop sheet), fare price "$1.25", "CLEAR" text button, back arrows, origin dot, stop dots on the map | j1/17, j2/22, j4/28, j4/20 |
| `accent-blue-light` | #4A95E9 / #4990DF | Refresh icon; locate-me FAB icon; stop-pin marker body (#4994EC) | j1/12, j1/05 |
| `radius-circle` | #2296F3 | Stroke of the blue nearby-search circle on the map | j1/05 |
| `user-location` | #4285F4 | Google "you are here" dot | j1/17 |
| Logo | blue #0053A1, red #DD052B, black wordmark | METRO logo in the search bar, onboarding, More header | j1/05, j1/00 |

### Surfaces
| Token | Hex | Where used |
|---|---|---|
| `surface` | **#FFFFFF** | Bottom sheets, search bar, FABs, dialogs, route-chip bodies, Recent body |
| `background` | **#F9F9FF** | Full-screen pages: More, Settings, Route, onboarding, Recent app bar. Also the alternate timetable row. |
| `surface-container` (cards) | **#F3F2F8** | Arrival cards, itinerary cards, from/to box, "Leave at" row, stop-sheet action buttons, legend badges, direction list group |
| `search-field` | #F2F3FB | Search input inside the search sheet |
| `nav-bg` | **#E4EBF6** | Bottom navigation bar |
| `chip-inactive` | #EBEBEB | Inactive filter chips and time chips |
| `disabled` | #E3E3E4 bg / #97989A text | Disabled "Plan My Trip" button |
| `selected-chip-gray` | #C6C6C6 | Route chip in the map rail when its route is selected (j1/17 "40") |
| `scrim` | ~#000 at 32% | Behind dialogs; the map dims to #ADADAD |
| `coach-overlay` | #3F7FC0 (primary at ~85%) | Blue coach-mark spotlight overlay |

### Text
| Token | Hex | Where used |
|---|---|---|
| `on-surface` | **#1D1B20** | Titles, stop names, direction ("NORTHBOUND"), times, durations |
| `on-surface-strong` | #191C21 / #000000 | Nav active label, More list items, route-chip numbers (pure black) |
| `on-surface-variant` | **#414752** | Inactive nav icons and labels, Recent section labels, sheet drag handle |
| `text-secondary` | **#6A6A6A** | "updated every 30 sec", headsign line ("TO GREENSPOINT TC"), time range "5:10pm to 5:35pm", "25min" |
| `text-tertiary` | #70777C / #828282 | "Leave at", form placeholders, search placeholder |
| `text-muted` | #9A9A9A | Settings help text |
| `on-primary` | #FFFFFF | Button text, active nav icon, minutes strip |

### Status and semantic
| Token | Hex | Where used |
|---|---|---|
| `realtime-green` | **#00BB1F** | "Live Tracking" label and wifi-arc icon, real-time minute values in arrival pills; tracking bell FAB (#1AC235) |
| `canceled-red` | #FD4D43 | Struck-through "8min" in the legend |
| `alert-red` | **#FF3B2F** | "!" alert icon on itinerary cards, "Alert" chip text |
| `alert-bg` | #F4DFE4, border #F7BBBB | Pink "Alert" box on an itinerary leg |
| `alert-fab-red` | #FF0000 | Warning triangle on the route-alerts FAB |
| `rail-red` | **#EF0000** | Red Line chip top band and red rail leg line in the itinerary |
| `dest-pin` | #FF0000 | Red destination pin in the from/to form and itinerary |
| `outline` | #C6C6C6 | Pill borders (Live Tracking, times), duration badges, chip borders (#AAA9AD) |
| `divider` | **#C1C6D4** | More list section dividers, hourly-grid rows, timetable spine |
| `chevron` | #3C3C43 in cards; #A8A8A9 in More list | |

### Map
Google Maps default light style: land #F5F3F3, parks #C3F1D5/#B6EDCB, hospital areas #FCE8E6, commercial #F8F0DE, highways blue-grey. POI icons are coloured Google pins. A PWA using OSM/MapLibre should choose a light, low-contrast style that gives the same impression.

---

## 2. Typography

The font is Roboto, the Android system font (Material 3 defaults). There is no custom brand font in the app. The METRO logo is an image.

| Role | Est. size | Weight | Example | Colour |
|---|---|---|---|---|
| Onboarding display | ~34sp | Regular 400 | "Location Access", "Mobile Fare Payments" | #49454F |
| Route header name | ~28sp | Bold 700 | "Westheimer" next to the 82 badge | #000 |
| Big route badge number | ~36sp | Medium | "82" white on navy | #FFF |
| Sheet / page title | **22–24sp** | Regular 400 | "59 Nearby Arrivals", "Plan Your Trip", "Select Itinerary", "My Itinerary", "Recent", "Choose Direction", "Settings" | #1D1B20 |
| Live-minute strip digits | **~30sp** | Medium 500 | "19 min 50 min" (the "min" unit is ~16sp) | #FFF on #005DAA |
| Hourly grid hour / minutes | ~21sp / ~17sp | Medium | "4 PM   07 15 24" | #6A6A6A (hour darker) |
| Dialog title | ~20sp | Medium | "What do you want to do?" | #005DAA |
| From/To values | ~18sp | Medium 500 | "Main Street Square Stn SB", "Choose destination" | #1D1B20 / #70777C |
| List item / search result title | ~17sp | Regular (More) / Medium–Bold (results) | "Route Schedules", "Lamar St @ Main St" | #191C21 |
| Stop sheet title | ~17sp | Bold 700, centred | "Lamar St @ Main St (342)" | #1D1B20 |
| Search placeholder | ~16sp | Regular | "Place, Stop, or Route" | #828282 |
| Direction line (card) | ~15sp | Medium, ALL CAPS | "NORTHBOUND" | #1D1B20 |
| Button label | ~15sp | Medium 500 | "Full Schedule", "Continue", "Track Itinerary" | |
| Section header | ~15sp | Regular/Medium, ALL CAPS | "RIDER RESOURCES" (blue), "RECENTLY VIEWED STOPS" (#414752) | |
| Dialog options | ~14.5sp | Regular, ALL CAPS | "SHOW ON MAP", "SEE FULL SCHEDULE" | #212121 |
| Itinerary duration | ~14.5sp | Regular | "25min" | #1D1B20 |
| Itinerary step stop + time | ~13sp | Regular | "Main Street Square Stn SB  04:10pm" | #1D1B20 |
| Chip filter / time chip | ~13–14sp | Regular | "Fewer transfers", "In 15 min" | |
| Nav label | ~12sp | Medium (active bold) | "Explore" | |
| Headsign line | ~11–12sp | Medium, ALL CAPS, letter-spaced | "TO GREENSPOINT TC" | #6A6A6A |
| Arrival pill times / Live Tracking | ~11–12sp | Medium, letter-spaced | "9m 24m 39m" | green = real time, black = scheduled |
| Route chip number (in cards) | ~11sp | Medium | "6", "108" | #000 |
| Itinerary step instruction | ~9–10sp | Regular | "Transfer to the Memorial Hermann…" | #1D1B20 |
| Leg duration under chip | ~8sp | Regular | "16m" | |

For an elderly audience, the arrival times (11sp), headsigns (11sp), itinerary instructions (9–10sp) and leg durations (8sp) are far too small. Keep the hierarchy, but in the PWA set a 16px minimum body size and at least 20px for arrival times.

---

## 3. Spacing, size, radius and elevation (dp)

| Element | Measurement |
|---|---|
| Screen side margin | **16dp** (cards start at x=39px) |
| Bottom nav | **80dp** bar plus ~24dp gesture inset (total 104dp), bg #E4EBF6, no top border |
| Nav active indicator | Pill **~64x32dp**, #2976C7, white icon (M3 NavigationBar) |
| Search bar (map) | **44dp** tall, full pill radius, white, soft shadow, 16dp from the edges, 62dp below the top. Logo inside on the left, magnifier on the right. |
| Search field (search sheet) | 44dp, pill, #F2F3FB, back arrow on the left, X on the right |
| Map FAB | **~44–46dp** rounded square (radius ~12dp), white, elevation ~3dp shadow, 8dp spacing, right edge 16dp. Icons are blue #4990DF. |
| Route chip rail (map) | Chip **~50x45dp**: white body, **7dp navy top band** (red #EF0000 for rail), radius ~4dp, drop shadow, 56dp pitch. Number ~17sp black. |
| Route chip (in cards) | **~32x33dp**, 7dp navy top band, 1dp #AAA9AD bottom/side border, radius ~4dp |
| Stop-sheet route chip | ~40x45dp with a bus icon above the number |
| Arrival card | Height **75dp**, gap **10dp**, radius **~10dp**, #F3F2F8, no shadow. Inner padding 10dp. Chip at left, text column at 48dp, chevron at right. |
| Arrival pill | ~17dp tall, 1dp #C6C6C6 border, radius 4dp |
| Bottom sheet | Top radius **~28dp**, white. Drag handle **32x4dp** #414752, 12dp from the top. Title 24sp at 16dp left. |
| Stop-sheet action buttons | 2 across: each **~169x34dp**, pill, #F3F2F8, 10dp gap, blue icon plus 15sp label |
| Live-minute strip | Full-bleed, **58dp** tall, #005DAA, scrolls horizontally |
| Primary button | **40–42dp** tall, full width minus 16dp (or 40dp on onboarding), pill radius |
| Time / filter chips | **36dp** tall, pill, 84dp wide (time chips), 12dp gap |
| From/To box | 106dp tall, radius ~12dp, #F3F2F8. Swap button is a 34dp white circle with shadow. |
| "Leave at" row | 53dp, same box style, 8dp below the From/To box |
| Itinerary option card | 70dp tall, 10dp gap, radius 10dp |
| Direction list | Grouped container radius 12dp, **49dp rows**, 1dp dividers |
| More list | **48dp rows**, 16–20dp text inset, no row dividers, 1dp #C1C6D4 section dividers |
| Dialog | 342dp wide, **square corners (0 radius)**, white. Option rows 48dp. Text buttons are right-aligned. |
| Hourly grid rows | 44dp, 1dp dividers #C1C6D4 |
| Timetable rows | 42dp, alternating #FFFFFF / #F9F9FF, grey spine line |
| Touch targets | Most are ≥48dp. The route chips in cards (32dp) are too small to tap. |

Elevation is mostly flat, M3 tonal. Shadows appear only on the search bar, map FABs, route chips on the map, the swap button and sheet edges.

---

## 4. Iconography

- Material Symbols / Material Icons, **outlined** style for navigation and **filled** style inside content.
- Nav icons: Explore = map with location pin (`map` + pin, "travel_explore"-like); Fares = two tickets (`confirmation_number`, rotated/stacked); Recent = bus-stop sign (`signpost`/bus stop pole); More = `menu` (three lines).
- Map FABs: `my_location` (crosshair, blue); trip planner = custom route icon (dotted path from blue dot to red pin); `warning` (red triangle) for route alerts; `notifications_active` (green bell) while tracking.
- Content: `directions_bus` (filled, on stop chip and in legs), `tram` for light rail, `directions_walk`, `schedule` (clock), `calendar_month` (blue), `notifications` bell (blue), `refresh` (blue), `chevron_right`, `north_east` arrow for external links, `arrow_back` (blue), `close`, `search`, `place` (black pin for places, red for destination), bus-stop pole icon for stops, `rss_feed`-like arcs for Live Tracking, `error` (red circle "!") for alerts.
- Onboarding hero icons are large solid navy (#004F97) glyphs: a pin, a bell, and Bluetooth.

---

## 5. Component inventory

| # | Component | Anatomy / states | Crop |
|---|---|---|---|
| 1 | **Bottom navigation** | 4 tabs, icon over label. Active: blue pill behind a white icon, bold label. Inactive: #414752 outline icon. | `ref/01-bottom-nav.png` |
| 2 | **Map search bar** | Logo, placeholder "Place, Stop, or Route", magnifier. Tapping opens the search sheet. | `ref/02-search-bar.png` |
| 3 | **Map FAB stack** | White rounded squares on the right: alert (only when a route is selected), locate, trip planner. The bell replaces them while tracking. | `ref/03-map-fabs.png` |
| 4 | **Route chip rail** | Vertical list on the left of nearby routes. Navy/red top band. Grey fill when selected. Covers about 15% of the map. | `ref/04-route-chip-rail.png` |
| 5 | **Arrival card** | Route chip, DIRECTION (caps), "TO HEADSIGN" (caps, grey), [Live Tracking pill] [bus icon + 3 times pill], chevron. Green times are real-time, black times are scheduled. | `ref/05-arrival-cards.png` |
| 6 | **Nearby sheet header** | Handle, "N Nearby Arrivals" 24sp, refresh icon, "updated every 30 sec". The collapsed peek shows only the title. | `ref/06-sheet-header-nearby.png` |
| 7 | **Stop sheet** | Centred bold "Stop name (ID)"; route row (chip with bus icon, route name, "NORTHBOUND to X" bold, chevron); Full Schedule / Track Bus Stop buttons; blue minutes strip; legend (Scheduled / Live Tracking / Canceled). | `ref/07-stop-sheet.png` |
| 8 | **Hourly schedule grid** | Clock icon, hour + AM/PM, 7 minute columns, dividers | `ref/08-schedule-grid.png` |
| 9 | **Plan Your Trip form** | Title; From/To box (blue dot, arrow, red pin, divider, swap FAB); Leave-at row; 4 time chips; full-width Plan My Trip (disabled grey) | `ref/09-plan-trip-form.png` |
| 10 | **Select Itinerary** | Form summary, "Available Routes", 3 sort chips, option cards (mode strip walk > [chip] > walk with durations; right column shows ! + duration, blue fare, time range) | `ref/10-itinerary-options.png` |
| 11 | **My Itinerary detail** | Mode strip + "Arriving at 4:35pm / 25min"; step list in a #F3F2F8 container: left timeline column (blue dot, coloured leg line, walk icon, dotted walk, red pin), stop name + time, instruction + duration badge, "Every 6 min" badge, pink Alert box; primary "Track Itinerary". | `ref/11-itinerary-detail.png` |
| 12 | **More list** | Logo, blue caps section headers, 48dp rows with chevron (in-app) or north-east arrow (external), dividers between sections | `ref/12-more-list.png` |
| 13 | **Choice dialog** | Square white card, blue title, ALL-CAPS options, blue "Cancel" | `ref/13-dialog-choice.png` |
| 14 | **Search results** | Icon (bus = route, stop pole = stop, pin = place), bold title, "(Stop #342)" or "Route (METRO)" subtitle | `ref/14-search-results.png` |
| 15 | **Onboarding step** | Logo top-left, big navy icon, 34sp title, body, "1 of 3", pill Continue | `ref/15-onboarding.png` |
| 16 | **Choose Direction list** | Grouped rows: chip + "OUTBOUND to N SHEPHERD P&R" + chevron | `ref/16-direction-list.png` |
| 17 | **Recent tab** | App bar "Recent" + blue CLEAR; "RECENTLY VIEWED SCHEDULES" (big chips); "RECENTLY VIEWED STOPS" (card rows) | `ref/17-recent-tab.png` |
| 18 | **Route schedule header** | Navy square badge with number + bold route name, PDF link, day headings, blue direction links | `ref/18-route-schedule-header.png` |
| 19 | **Coach mark** | Full-screen blue overlay with a circular spotlight and white 22sp text | `ref/19-coach-mark.png` |
| 20 | **Stop timetable** | Grey spine with ring nodes, stop (ID), time columns, zebra rows | `ref/20-timetable.png` |

Other elements: a white "Stop: **342**" map callout with a pointer, above a blue rounded bus-stop pin marker (#4994EC) (j1/17). A blue circle marks the nearby-search radius. Small blue stop dots (~16dp) appear only inside the circle. The Settings toggle is a Material switch (off = #B9B9BD track, #EDEDED thumb).

---

## 6. Navigation structure

```
Bottom nav (always visible on root tabs): Explore | Fares | Recent | More
  Explore  (map, default)
    ├─ Search bar → full-height search sheet → result → "What do you want to do?" dialog
    │     stop: SEE NEARBY ARRIVALS / SHOW ON MAP / USE AS 'TO' / USE AS 'FROM'
    │     route: SHOW ON MAP (→ "Please choose direction" dialog) / SEE FULL SCHEDULE
    ├─ Left rail: nearby route chips → selects route (polyline + alert FAB)
    ├─ Right FABs: Locate · Trip planner (icon only) · [Route alerts] · [Tracking bell]
    ├─ Map stop dot → "Choose Direction" sheet → Stop sheet
    └─ Bottom sheet: "N Nearby Arrivals" → card → Stop sheet (Full Schedule, Track Bus Stop)
       Trip planner mode: Plan Your Trip → Select Itinerary → My Itinerary → Track (confirm dialog)
  Fares    (page title "Fares", marketing copy + login sheet: "Close"). Stub in PWA.
  Recent   (recent schedules + stops, CLEAR)
  More     (Rider Resources / Contact Us / More Information / Settings)
             Route Schedules → Route page → day/direction → stop timetable
             Service Alerts → external ridemetro.org (Chrome)
```
Pushed screens (Route, Settings, timetable) use an app bar with a blue back arrow and a 22–24sp title, and hide the bottom nav. The bottom sheets on Explore have three states: peek (title only), half, and full.

---

## 7. Copy tone and labelling conventions

- Direction + headsign is written in ALL CAPS from GTFS: "NORTHBOUND", "TO GREENSPOINT TC", "EASTBOUND to DOWNTOWN" (with a lowercase "to" on the stop sheet).
- Stops: "Street @ Cross St (ID)" or "(Stop #342)". Riders know stop codes, so keep them.
- Times: relative "9m", "1:08m" (inconsistent), strip "19 min", absolute "05:10pm" / "5:10pm to 5:35pm" (mixed zero-padding). The PWA should standardise these, for example "9 min" and "5:10 PM".
- Terse functional labels in title case: "Full Schedule", "Track Bus Stop", "Plan My Trip", "Track Itinerary", "Leave at", "Available Routes", "Choose destination", "My current location".
- Dialog options are ALL CAPS with a sentence-case question title. Sheet titles count results ("12 Nearby Arrivals").
- The tone is polite and institutional ("Please allow the app to access this device's location.").

---

## 8. What to keep for familiarity

1. **Bottom nav: Explore | Fares | Recent | More**, in the same order, with the same icons, the #E4EBF6 bar and the blue #2976C7 active pill. This is the strongest recognition cue.
2. **Map-first Explore** with the white pill search bar ("Place, Stop, or Route" plus the METRO logo) and white rounded-square FABs on the right (locate icon in blue).
3. **Route chip visual**: white tile with a navy #004080 top band (red for rail) and a black number. Use it everywhere a route appears.
4. **Arrival card language**: #F3F2F8 rounded card, CAPS direction, grey CAPS headsign, green = live, black = scheduled, the "Live Tracking" arcs icon and a chevron.
5. **Stop sheet** with a bold centred "Name (ID)", the **blue #005DAA live-minutes strip** in large white numerals, and the Scheduled/Live/Canceled legend. The audit calls this the "one good screen".
6. **Plan Your Trip form**: blue dot, down arrow, red pin; swap circle; "Leave at" row; Now / In 15 / In 30 / In 1 hr chips; full-width blue pill primary button.
7. **Itinerary cards**: mode strip with chips and walk icons, a right-aligned duration, blue fare and time range. Keep the sort chips (Fewer transfers / Fastest / Least walking).
8. The **timeline step list** with coloured leg lines (navy bus, red rail) and dotted walk segments.
9. **More list**: blue CAPS section headers, 48dp rows, chevron vs north-east arrow for internal vs external links.
10. Colour semantics: navy/blue = METRO, green = real time, red = alert, rail, or destination; Roboto; flat M3 surfaces; 16dp margins; 28dp sheet corners.

## 9. What is visually broken (from REPORT.md) and should change

- **Stops are tiny unlabeled 16dp dots**, unclustered and shown only inside the blue circle (J1.1, J4.5). Use larger labelled stop markers with a direction arrow, and a callout with the name and ID.
- **Nearby list never says which stop, the distance, or the side of the street**, and is sorted by route number (up to 59 cards) (J1.2, J4.9). Group by stop and show walk minutes.
- **Same-name stops can't be told apart** (J2.1). Always show the stop ID and direction ("Northbound side").
- **Type is too small for older riders**: 11sp arrival times and headsigns, 9–10sp itinerary instructions, 8sp leg durations. Low-contrast greys (#6A6A6A on #F3F2F8, #9A9A9A help text) are also used for important information.
- **The left route-chip rail covers ~15% of the map** and hides pins (J1.13).
- **The trip planner is an unlabeled icon FAB** (J2.13). Give it a text label or entry point, such as a "Where to?" field.
- **Pin colours are reversed**: red = destination in the list but red is drawn at the origin on the map (J1.10, J3.9).
- **Itinerary steps and the Alert chip look tappable but are dead ends** (J2.2). The "Alert" chip has no summary (J3.11).
- **Formatting bugs**: "1:0min", "1:12min", "1:08m", mixed "05:10pm"/"5:10pm" (J1.9, J2.12).
- **Repeated coach-mark overlays** (the heavy blue spotlight, 7 steps) block the map (J1.12, J4.10). Drop them or keep one.
- **Walking legs are straight dotted lines** with no distance (J1.4). **Transit-center bays are stacked on one point** (J1.5).
- **Square Material-2 dialogs with ALL-CAPS options** for core choices ("What do you want to do?") add a step and don't match the rest of the M3 styling. Replace them with inline actions on the result or stop card.
- **Service alerts open an external website** (J4.4). Show them in the app with the same pink/red alert styling.
- **No favourites or save star**; only a clearable Recent list (J4.1).
- **Swiping the itinerary sheet down discards the trip** (J2.6). Sheets need a visible close or back control.
- **Arrival times are inconsistent between screens and flicker between refreshes** (J1.9, J4.7).
