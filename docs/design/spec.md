# RideMETRO PWA: final build spec

**Status:** final (critique round 1 applied; see sections I and the changelog at the end). This is the single source of truth for the implementation agents. When this spec and a proposal disagree, this spec wins.
**Base:** the "Familiar" proposal (`docs/design/proposals/familiar.md`, judge total 229), with grafts from "Elder" (legibility, honesty, no-drag controls, live-trip controls) and "Fast" (boarding block on the itinerary card, inline "Closest stop", Route-in-bay banner, "I'm at the stop"). Every judge must-fix is applied. Section H maps each must-fix and audit finding to where it is handled.
**Units:** 1dp = 1 CSS px and 1sp = 1 CSS px at the Standard text size (`html { font-size: 100% }`). The layout is designed at **360x640** (the worst case) and checked at 412x800 and 430x932.
**Example data:** every stop ID, name, direction, side, headsign, bay and alert below was pulled on 2026-09-25 from this repo's API in offline mode (`OFFLINE=1`) at the baseline scenario GPS positions. Minutes and clock times are illustrative because they depend on when you run it. Nothing here uses a placeholder ID.

---

## A. Principles and non-goals

### A.1 Principles (use these to settle any design argument)

1. **It is still RideMETRO.** Riders keep the same nav (Explore | Fares | Recent | More), the white pill search bar with the METRO mark, the white FAB column, the navy-banded route chips, the centred bold "Name (ID)" stop title, the blue `#005DAA` live-minutes strip, the Scheduled / Live / Canceled legend, the Plan Your Trip form, the itinerary cards and the timeline. Every familiar element keeps its look. **Six things moved or changed, each for a stated reason:** (a) the left route-chip rail moved into the sheet as a labelled chip row (it covered the map, J1.13); (b) "Choose Direction" is gone because a pin opens its stop directly (J1.8); (c) the "What do you want to do?" dialog became inline buttons (J2.9, S11); (d) "Track Itinerary" is renamed "▶ Start trip" and pinned to the sheet footer; (e) the Legend now appears only on the Stop sheet; (f) the planner's "Leave at" row became a 5th time chip "Other time ▾" (D11).
2. **Answer "where do I stand, and when does it come?" on the first screen.** Walk time, stop name + ID, side of the street and the next bus always appear together.
3. **Readable by a 75-year-old in the Houston sun.** No text that matters is smaller than 16sp. Next-arrival minutes are at least 24sp bold. Touch targets are at least 48x48dp. Text contrast is at least 4.5:1. Android and Chrome font scaling is honoured through rem units, and layouts wrap instead of truncating.
4. **Never rely on colour alone.** **Scheduled is the unmarked default:** a plain time is a scheduled time, and each sheet or page that lists times carries one caption, "Times are scheduled unless marked **Live**". A live time always carries the word **Live** plus the arcs icon; a simulated one carries **Live (demo)**; a canceled one carries the word **Canceled** plus a strikethrough. So every non-default state has a word, and colour is never the only cue. Every control has a visible text label. The one exception is the Locate FAB, which has an accessible name.
5. **Say the negative, and say what we don't know.** Show "✓ No alerts for Route 82" **only when the live METRO feed answered** (`source === "metro"`), "Alerts can't be checked right now" when it failed (`source === "unavailable"` or a request error), and "Demo alerts only" in demo mode (never a "No alerts" claim from demo data). Also "Bay not published" and "Street directions unavailable". Never invent a location, a live time, an alert or a bay.
6. **One primary action per screen state.** A screen has at most one filled blue button. Everything else is a tonal pill or a text button.
7. **No dead ends and no choice dialogs.** Anything that looks tappable is tappable. The "What do you want to do?" dialog is replaced by inline buttons. Dialogs are used only to confirm something destructive.
8. **Nothing is lost by accident.** Swiping a sheet down minimises it and never discards it. A planned trip persists. Removing a saved stop offers a 10-second Undo.
9. **Honest PWA limits.** We never claim background tracking or persistent notifications. Live trip says "Keep this screen open during your trip" (once, on D13 only), holds a Wake Lock, and shows "Tracking resumed" when the app comes back.
11. **Times are always fresh or visibly old.** Relative times are computed on the client from `departureTime` against a 15s clock tick, never from the server's `minutesAway`. Departures more than 1 minute in the past are dropped. Offline, times are shown as clock times ("7:05 PM"), never as relative minutes.
12. **One number per fact.** A walk time or a departure time is computed by one helper and shows the same value on every screen (J4.7).
10. **Ask only when needed.** There is one welcome screen and the location permission. Notifications are asked for only inside Live trip, through an in-app card, and declining them blocks nothing. There are no coach marks, ever.

### A.2 Non-goals and stubs

| Area | What we build | What we do NOT build |
|---|---|---|
| **Login / account** | A "My ticket" card on Fares with a **Sign in to show ticket** button that opens the "Handoff to METRO" dialog (D17). | No credential fields, no account screens, no session. |
| **Payments / tickets** | The same handoff dialog. A fare table from `src/data/fares.json` where **every value is flagged "To be confirmed by METRO"** in both the code and the UI. | No QR code (not even a fake one), no purchase flow, no stored value. |
| **Languages** | English and Español only. Alert text uses `header.es` / `description.es` when present. Otherwise it shows the English text with the label "Available in English only". Server strings that arrive in English are localised on the client (see the **i18n of server strings** rules in G.4): `side` by regex, distances by `formatDistance`, walk steps from structured fields, errors by `code`. Stop and street **names** stay as on the sign. `stop.subtitle` and plan `message` are never rendered; the client composes those lines itself. `<html lang>` follows the setting. | No Vietnamese, Chinese or Arabic in the UI. More › Language lists them as "Coming soon" (disabled rows). No RTL. |
| **Background features** | Wake Lock, `visibilitychange` resume, in-app alerts, and vibration while the page is visible. | No background geolocation, no persistent or updating notification, no push server, no continuous re-routing. |
| **Dark mode** | None. The current app is light-only, so we set `<meta name="color-scheme" content="light">` and `color-scheme: light` on `:root`. | No dark palette. |
| **Crowding, rider reports, widgets, beacons** | – | Not built: there is no data or PWA support for them. |
| **Full route timetable (all trips x all stops)** | Kept as an external "PDF schedules on RideMETRO.org ↗" link, plus the per-stop hourly **Full Schedule** grid (D7). | No in-app full timetable matrix, because there is no API for one. |

---

## B. Design tokens

### B.1 Ready-to-paste `src/styles/tokens.css`

```css
/* RideMETRO PWA design tokens. Source: docs/design/existing-style.md (sampled from RideMETRO v2.71).
   Text-safe tokens (-text) are the ONLY colours allowed for text. Icon-only colours are marked. */
:root {
  color-scheme: light;

  /* ---------- Brand ---------- */
  --c-brand-navy: #004080;        /* route-chip top band, route badge, selected route line, TC pin */
  --c-brand-blue-deep: #005DAA;   /* live-minutes strip, dialog titles, link text, back button */
  --c-brand-blue-dark: #005193;   /* More section headers (caps), onboarding hero icon */
  --c-primary: #2976C7;           /* filled buttons, active nav pill, selected segment/chip border */
  --c-on-primary: #FFFFFF;        /* 4.66:1 on --c-primary */
  --c-accent-icon: #2A82E6;       /* ICONS ONLY (3.86:1 on white, fails as text) */
  --c-stop-pin: #4994EC;          /* stop pin body */
  --c-user-dot: #4285F4;          /* you-are-here dot */
  --c-logo-blue: #0053A1;
  --c-logo-red: #DD052B;

  /* ---------- Surfaces ---------- */
  --c-surface: #FFFFFF;           /* sheets, search bar, FABs, dialogs, route-chip body */
  --c-background: #F9F9FF;        /* full pages: More, Settings, Route, TC, Alerts, Welcome */
  --c-card: #F3F2F8;              /* arrival/stop cards, itinerary cards, from/to box, tonal pills */
  --c-search-field: #F2F3FB;      /* text input inside search sheet */
  --c-nav-bg: #E4EBF6;            /* bottom nav; also bay tag and "Route 58 leaves from Bay M" banner */
  --c-chip-inactive: #EBEBEB;     /* inactive filter/time chips */
  --c-chip-selected: #C6C6C6;     /* selected route chip fill (always paired with 2dp primary border + check) */
  --c-disabled-bg: #E3E3E4;
  --c-scrim: rgba(0, 0, 0, 0.32);

  /* ---------- Text ---------- */
  --c-text: #1D1B20;              /* titles, stop names, minutes, directions (15.3:1 on card) */
  --c-text-strong: #000000;       /* route numbers in chips */
  --c-text-variant: #414752;      /* secondary lines: side of street, section labels, nav inactive (8.4:1 on card) */
  --c-text-secondary: #595959;    /* captions: "Updated 8 sec ago", sources (6.3:1 on card). Replaces #6A6A6A */
  --c-text-disabled: #6A6A6A;     /* disabled label (5.4:1 on white; still readable) */
  --c-link-text: #005DAA;         /* text buttons, links, "Show list", "Back" (6.67:1 on white, 6.0:1 on card) */

  /* ---------- Status ---------- */
  --c-live-icon: #00BB1F;         /* ICONS ONLY: live arcs, tracking bell */
  --c-live-text: #007A1A;         /* "Live" word + live minutes (5.53:1 white, 4.97:1 card) */
  --c-live-on-strip: #A2F7B0;     /* live arcs + "Live" word on the #005DAA strip (5.23:1) */
  --c-canceled-text: #B3261E;     /* struck-through canceled time + "Canceled" */
  --c-alert-icon: #FF3B2F;        /* ICONS ONLY: ⚠ / ! glyphs */
  --c-alert-text: #B3261E;        /* alert text, "Hurry", "Tight transfer", stale "Updated" (6.54:1 white, 5.14:1 on alert-bg) */
  --c-alert-bg: #F4DFE4;          /* pink alert box */
  --c-alert-border: #F7BBBB;
  --c-ok-text: #007A1A;           /* "✓ No alerts for Route 82" */
  --c-warn-bg: #FFF4D6;           /* amber "Get off at the next stop" card, demo/offline notes */
  --c-warn-border: #F2B233;
  --c-warn-text: #5E4300;         /* 8.41:1 on warn-bg */
  --c-rail-red: #EF0000;          /* rail chip top band, rail leg line (never text) */
  --c-dest-pin: #FF0000;          /* destination pin (never text) */
  --c-origin-dot: #2A82E6;        /* origin dot in form, timeline and map (always blue) */
  --c-offline-bg: #414752;        /* offline banner bg, white text (9.3:1) */

  /* ---------- Lines ---------- */
  --c-outline: #C6C6C6;           /* pill borders, input borders (decorative) */
  --c-outline-strong: #767676;    /* borders that convey state or bound an input (4.5:1 on white) */
  --c-chip-border: #AAA9AD;       /* route chip side/bottom border */
  --c-divider: #C1C6D4;           /* list/section dividers, route-page spine */
  --c-handle: #414752;            /* sheet drag handle */
  --c-focus: #2976C7;             /* focus ring */

  /* ---------- Map ---------- */
  --c-map-land: #F5F3F3;
  --c-map-park: #C3F1D5;
  --c-map-hospital: #FCE8E6;
  --c-map-commercial: #F8F0DE;
  --c-map-water: #AADAFF;
  --c-map-highway: #B8C7D9;
  --c-map-road: #FFFFFF;
  --c-map-road-casing: #DADCE0;
  --c-map-label: #5F6368;
  --c-route-line: #004080;        /* selected route / bus leg line, 6dp, with 2dp white casing */
  --c-walk-line: #2A82E6;         /* dotted walk path, 5dp, dash 1:2 */

  /* ---------- Typography ---------- */
  --font-family: "Roboto", system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
  --fw-regular: 400;
  --fw-medium: 500;
  --fw-bold: 700;
  /* size / line-height pairs, all rem so browser + in-app text size both scale them */
  --fs-display: 1.75rem;   --lh-display: 2.25rem;   /* 28: Welcome title */
  --fs-strip: 1.875rem;    --lh-strip: 2.25rem;     /* 30: blue live-minutes strip digits (Medium) */
  --fs-minutes: 1.5rem;    --lh-minutes: 1.875rem;  /* 24: next-arrival minutes in cards (Bold) */
  --fs-title: 1.375rem;    --lh-title: 1.75rem;     /* 22: sheet/page titles (Regular, as today) */
  --fs-stop-title: 1.25rem;--lh-stop-title: 1.625rem;/* 20: centred stop-sheet title (Bold) */
  --fs-heading: 1.125rem;  --lh-heading: 1.5rem;    /* 18: card stop names, live-step headline, from/to values */
  --fs-body: 1rem;         --lh-body: 1.375rem;     /* 16: ALL body text, headsign caps, buttons, direction */
  --fs-caption: 0.875rem;  --lh-caption: 1.125rem;  /* 14: ONLY timestamps, source notes, nav labels, chip sub-labels */
  --fs-unit: 1rem;                                  /* "min" unit inside the strip */
  --ls-caps: 0.02em;                                /* letter spacing for ALL-CAPS headsign lines */

  /* ---------- Spacing (4dp grid) ---------- */
  --sp-1: 4px;  --sp-2: 8px;  --sp-3: 12px;  --sp-4: 16px;  --sp-5: 20px;  --sp-6: 24px;  --sp-8: 32px;
  --gutter: 16px;                 /* screen side margin */
  --card-gap: 10px;               /* between cards, as today */
  --card-pad: 12px;

  /* ---------- Radii ---------- */
  --r-chip: 4px;                  /* route chip */
  --r-card: 10px;                 /* cards */
  --r-box: 12px;                  /* from/to box, FABs, grouped lists, dialog */
  --r-alert: 8px;
  --r-sheet: 28px;                /* bottom sheet top corners */
  --r-pill: 999px;

  /* ---------- Elevation (flat M3; shadows only where today's app has them) ---------- */
  --e-0: none;
  --e-1: 0 1px 3px rgba(0,0,0,.20), 0 1px 2px rgba(0,0,0,.12);   /* search bar, route chip on map, swap button */
  --e-2: 0 2px 6px rgba(0,0,0,.22), 0 1px 3px rgba(0,0,0,.14);   /* map FABs, "Search this area" pill */
  --e-sheet: 0 -2px 10px rgba(0,0,0,.14);                          /* bottom sheet top edge */
  --e-dialog: 0 8px 24px rgba(0,0,0,.28);

  /* ---------- Sizes ---------- */
  --touch-min: 48px;              /* every interactive target, no exceptions */
  --touch-gap: 8px;               /* min space between adjacent targets */
  --nav-h: 80px;                  /* bottom nav (plus env(safe-area-inset-bottom)) */
  --searchbar-h: 48px;
  --fab: 48px;
  --appbar-h: 56px;
  --chip-route-sm: 40px;          /* route badge inside rows (visual; row gives the 48dp target) */
  --chip-route-md: 48px;          /* route filter chip */
  --chip-route-lg: 56px;          /* route page header badge */
  --chip-band: 7px;               /* navy top band height (sm: 6px) */
  --strip-h: 64px;                /* blue live-minutes strip */
  --sheet-peek: 132px;
  --sheet-half-min: 220px;        /* see C.6 snap rules */
  --icon: 24px;

  /* ---------- Motion ---------- */
  --dur-fast: 120ms;
  --dur-sheet: 240ms;
  --ease: cubic-bezier(.2, 0, 0, 1);
}

/* In-app Text size setting (More › Settings and Welcome). Browser/Android font scale multiplies on top. */
html[data-text-size="standard"] { font-size: 100%; }   /* 16px */
html[data-text-size="large"]    { font-size: 115%; }   /* 18.4px: all rem tokens x1.15 */
html[data-text-size="xlarge"]   { font-size: 130%; }   /* 20.8px: all rem tokens x1.30 */

@media (prefers-reduced-motion: reduce) {
  :root { --dur-fast: 0ms; --dur-sheet: 0ms; }
}
```

**Base CSS rules** (in `src/styles/base.css`, owned by the foundation):
- `html { -webkit-text-size-adjust: 100%; } body { margin:0; background: var(--c-surface); color: var(--c-text); font: var(--fw-regular) var(--fs-body)/var(--lh-body) var(--font-family); }`
- Fonts: `@fontsource/roboto` weights 400, 500 and 700, self-hosted so they work offline.
- `:focus-visible { outline: 3px solid var(--c-focus); outline-offset: 2px; }` on every interactive element. No `outline: none` anywhere.
- Heights are `min-height` in rem or px, never a fixed `height` on anything that contains text, so cards grow at font scale 1.3 and 200%.
- `font-variant-numeric: tabular-nums` on every time and minute value so numbers don't jump. **Numbers never animate** (no count-up and no crossfade).
- Text never truncates with an ellipsis for stop names, stop IDs, headsigns or alert headers. It wraps. The only allowed ellipsis is on addresses in search results, after 2 lines.
- ALL CAPS is allowed only at 16sp or larger (headsign lines, direction words, section headers at 16sp Medium). Captions are never in caps.

### B.2 Type roles (Standard size, px = sp)

| Role | Token | Weight | Example | Colour |
|---|---|---|---|---|
| Welcome title | display 28 | Regular | "Welcome to RideMETRO" | text |
| Strip digits | strip 30, unit 16 | Medium | "16 min" in the blue strip | white |
| Card next minutes | minutes 24 | Bold | "16 min" | text, or live-text if live |
| Sheet / page title | title 22 | Regular | "Nearby stops", "Plan Your Trip", "Select Itinerary" | text |
| Stop sheet title (centred) | stop-title 20 | Bold | "Lamar St @ Main St (342)" | text |
| Card stop name, from/to values, live step headline | heading 18 | Bold (name) / Medium (from/to) | "Fannin St @ McKinney St (246)" | text |
| Headsign line (caps) | body 16 | Medium, caps, ls-caps | "NORTHBOUND to N SHEPHERD P&R" | text |
| Body, side of street, steps, buttons | body 16 | Regular / Medium for buttons | "North side of Lamar St" | text-variant |
| Status word | body 16 | Medium | "Live" / "Scheduled" / "Canceled" | live-text / text-variant / canceled-text |
| Section header | body 16 | Medium, caps | "SAVED", "BAY M · PLATFORM 2" | text-variant (More: brand-blue-dark) |
| Caption | caption 14 | Regular | "Updated 8 sec ago", "Source: METRO" | text-secondary |
| Nav label | caption 14 | Medium (active Bold) | "Explore" | text / text-variant |

At most **6 sizes appear on one screen** (see F).

### B.3 Iconography

- Inline SVG icons (Material Symbols Outlined paths, weight 400) in `src/ui/Icon.tsx`. There is no icon font, so icons work offline.
- Required names: `map_pin` (Explore), `tickets` (Fares), `bus_stop` (Recent), `menu` (More), `search`, `my_location`, `route_plan` (the custom dotted path from a blue dot to a red pin), `warning`, `error`, `check_circle`, `directions_bus`, `tram`, `directions_walk`, `schedule`, `calendar_month`, `notifications`, `notifications_active`, `refresh`, `chevron_right`, `chevron_left`, `north_east` (external link), `close`, `swap_vert`, `star`, `star_filled`, `place`, `live_arcs` (the Live Tracking arcs), `expand_less`, `expand_more`, `arrow_upward`, `arrow_downward`, `turn_left`, `turn_right`, `turn_slight_left`, `turn_slight_right`, `straight`, `flag`.
- Icon colour follows its meaning: accent-icon for actions, live-icon for live, alert-icon for alerts, text-variant for neutral.
- The METRO mark: `public/brand/metro-mark.svg` is a **placeholder wordmark** ("METRO" in logo-blue with a logo-red bar). Replace it with METRO's official asset at handoff. Its alt text is "METRO".

---

## C. Component inventory

All components live in `src/ui/` (foundation-owned). Screens compose them and must not restyle them. A screen that needs a variant asks the foundation owner for it (see G.5). Every prop type below is TypeScript and goes in `src/ui/types.ts`.

Shared data types used by the props (in `src/api/types.ts`):
```ts
type Status = "live" | "scheduled" | "canceled" | "simulated";
interface Dep { departureTime: string; isRealtime: boolean; canceled: boolean; source: DataSource; tripId: string }  // minutesAway is NOT used for display
interface RouteRef { id: string; name: string; color: string; textColor: string; mode: "bus" | "rail" }
```
`statusOf(dep)`: `canceled` → "canceled". Otherwise `isRealtime && source === "simulated"` → "simulated". Otherwise `isRealtime` → "live". Otherwise "scheduled". A "simulated" time displays as **"Live (demo)"** in live-text, and the screen shows the caption "Demo: live times are simulated". Because `/nearby` departures now carry `source` (G.4 backend change 2), `statusOf` gives the same answer on D2, D3, D4, D6 and D13.

**Shared clock:** `useNow()` (F0, `src/state/clock.ts`) returns `Date.now()` and re-renders every **15s** while the document is visible (and immediately on `visibilitychange`). Every relative time and every "can I make it" check reads it.

### C.1 RouteBadge (the route chip with the navy top band)
- **Anatomy:** a white tile (`--c-surface`), a top band of `--chip-band` in `route.color` (bus = `#004080`, rail uses its own line colour, e.g. Red `#EF0000`), 1dp `--c-chip-border` on the sides and bottom, radius `--r-chip`, and the route number centred in `--c-text-strong` Medium. The optional `showIcon` puts `directions_bus` / `tram` 18dp above the number (the stop-sheet style).
- **Props:** `{ route: RouteRef; size: "sm" | "md" | "lg"; selected?: boolean; showIcon?: boolean; onPress?: () => void; ariaLabel?: string }`
- **Sizes:** sm = 40x40 visual, 16sp number, 6dp band (inside rows, where the row provides the 48dp target). md = 48x48, 18sp, 7dp band, a 48dp target with its own `onPress` (filter chip). lg = 56x56 **navy square** with a white 28sp Medium number, the Route page header badge exactly as today. Numbers of 4+ characters (e.g. "Green", "500") grow the width, with a minimum of 48dp.
- **States:** default. Selected (md only): fill `--c-chip-selected`, a 2dp `--c-primary` border, and a 16dp check badge at the top-right corner, with `aria-pressed="true"`. Pressed: 8% black overlay. Disabled is not used.
- **a11y:** `aria-label` defaults to "Route 40" (or "Red Line"). As a filter it reads "Show Route 40 near you, button, not pressed".
- **Used in:** every route mention: chip row, cards, strip header, itinerary mode strip, timeline, TC view, alerts, search results and Recent.

### C.2 TimeValue and StatusWord
- **TimeValue** `{ dep: Dep; size: "minutes" | "strip" | "body"; walkMin?: number; offline?: boolean }`. It reads `useNow()` itself.
  - Format (`src/lib/format.ts: formatDeparture(departureTime, now, { offline, status })`), with `m = floor((departureTime − now) / 60000)`:
    - `m < −1` → the departure is **dropped** by the list (`upcoming(deps, now)` filters it before render).
    - `m ≤ 0` → **"Now"** if live or simulated. A **scheduled** time never says "Due" or "Now" (the bus may already have gone): it shows the clock time, **"7:05 PM"** (J4.8 / a11y item: "Due" on a schedule is misleading).
    - `1–59` → **"16 min"**. `≥ 60` → clock **"8:05 PM"** (America/Chicago, no leading zero, uppercase AM/PM). Never "1:08m" or "1:13h".
    - `offline === true` → **always the clock time** ("7:05 PM"), because the cache can be up to 24h old.
  - Colour: live → `--c-live-text` plus the `live_arcs` icon (16dp, `--c-live-icon`) after the number. Scheduled → `--c-text`. Canceled → `--c-canceled-text` with a strikethrough.
  - **tooSoon:** when `walkMin` is given and `!canMakeIt(walkMin, dep, now)` (C.17, the only rule for this anywhere), the value is `--c-text-secondary` and its status word is replaced by **"Leaves before you get there"**. Canceled wins over tooSoon.
- **StatusWord** `{ status: Status }` renders "Live" / "Canceled" / "Live (demo)" at 16sp Medium in its text colour. **Scheduled renders nothing** (the unmarked default, A.1.4). **Rule:** in a list of times, a StatusWord follows each time whose status is not scheduled. Examples: "16 min · 46 min" (both scheduled); "4 min Live · 19 min"; "~~12 min~~ Canceled · 42 min".
- **ScheduleCaption** `{}`: the one-per-sheet caption "Times are scheduled unless marked **Live**" (14sp `--c-text-secondary`, with a tiny inline "Live" sample in live-text). It sits next to UpdatedAgo. Offline it reads "Offline: scheduled clock times, may be out of date".

### C.3 LiveStrip (the blue live-minutes strip, the "one good screen")
- **Anatomy:** full-bleed, `--strip-h` 64dp min, `--c-brand-blue-deep` background, and a horizontal list of up to 4 departures. Each shows 30sp Medium white digits plus a 16sp "min" unit. Under each number is its status word at 14sp Medium: "Live" (or "Live (demo)") in `--c-live-on-strip` with arcs, nothing for a scheduled time (the unmarked default), "Canceled" in white with the number struck. Horizontal scroll if more than 3 fit, with no scrollbar.
- **Props:** `{ deps: Dep[]; loading?: boolean; emptyText?: string; offline?: boolean }`. Loading shows "– – min". Under each number the status word shows only for Live / Live (demo) / Canceled; scheduled numbers have no word (the sheet caption covers them). Empty shows the `emptyText` 16sp white. The text is **"No buses in the next 3 hours"** by default, or, when the screen has the `/schedule` answer, "No more trips today. Next bus Sat 5:12 AM" (from `nextServiceFirst`, G.4 backend change 5).
- **a11y:** `role="list"`. Each item's label is "16 minutes, scheduled". It is **not** a live region: polling never re-announces.
- **Used in:** the expanded route in the Stop sheet (D6), the expanded row on the Route page (D9), and the ride step in Live trip (D13, where it shows "3 stops left").

### C.4 Legend
- Today's Scheduled / Live / Canceled legend, enlarged: three items in a row, each a sample chip (`--c-card`, radius 4) holding "8 min" 16sp (black / live-text with arcs / canceled-text struck) plus a 16sp word. It wraps to 2 lines at large sizes.
- **Used in:** the bottom of the Stop sheet (D6) **only**, where today's app has it. Everywhere else the ScheduleCaption does the job, because the status words already say it (see Decisions).

### C.5 Stop cards (built from today's arrival card)
All variants: `--c-card` background, radius `--r-card`, padding `--card-pad`, no shadow, `--card-gap` between cards. The whole card body is one button that opens the Stop sheet. Nested buttons (walk, route rows) stop propagation.

**C.5a NearbyStopCard** `{ stop: StopSummary; walkDistanceM?: number; routes: NearbyRoute[]; maxRoutes?: 3; walkFrom?: { label: string; param: string }; onOpen; onOpenRoute(routeId); onWalk }`. Walk minutes are **computed inside the card** as `walkMinutes(walkDistanceM, pace)` (C.17). The server's `walkMin` is never displayed.
```
┌──────────────────────────────────────────┐
│ Fannin St @ McKinney St (246)  ┌────────┐│ 18sp Bold, wraps
│                                │🚶 1 min ││ WalkButton 48dp
│ On the west side of Fannin St  │  walk   ││ 16sp text-variant
│                                └────────┘│
│ ──────────────────────────────────────── │ 1dp divider
│ [137] WESTBOUND to DOWNTOWN              │ badge sm + 16sp caps
│       7:02 PM Leaves before you get there│ grey (tooSoon) + word
│       · 15 min                           │ 24sp Bold
│ [51]  SOUTHBOUND to DOWNTOWN TC          │
│       2 min · 31 min                     │ scheduled = no word
│ [52]  SOUTHBOUND to DOWNTOWN TC          │
│       16 min · 46 min                    │
│ + 1 more route (11)                    › │ 16sp link-text, 48dp
└──────────────────────────────────────────┘
```
(At the F10 GPS the next 137 is due now and the walk is 1 min, so `canMakeIt` is false: the first time renders as its clock time in `--c-text-secondary` with "Leaves before you get there", and the 15 min time renders normally. QA asserts exactly this, E/F10.)
- Line 1: `stop.name` plus " (" + `stop.id` + ")" in 18sp Bold.
- Line 2 (the **side line**, `sideLine(stop, { withCompass })`, G.4): on cards that show route lines, **the stop's own compass word is dropped** and the line reads **"On the west side of Fannin St"** (from `side`, localised by `localiseSide`). Two compass words on one card ("Westbound stop" next to "NORTHBOUND to …") confuse riders, so only the route's direction appears. If `side` is missing, the line is omitted. Where no route line is shown (search stop rows, D9 rows, D16 recents), `withCompass: true` gives "Westbound stop · North side of Lamar St". Rail stations always show "Rail station".
- **WalkButton** (top right): tonal (`--c-surface` bg, 1dp `--c-outline-strong`), min 64x48dp, `directions_walk` icon plus "1 min" 18sp Bold over "walk" 14sp. It opens Walk (D8). Its label is "Walk to stop 246, 1 minute". When the minutes exceed 20 it shows the distance instead (`formatDistance`, "1.2 mi"). When location is off (and there is no `walkFrom`), it is hidden. With `walkFrom` (D4) its sub-label reads "walk from the museum" and its a11y label "Walk from Houston Museum of Natural Science to stop 688, 4 minutes".
- Route rows: up to `maxRoutes` (3). Each row: RouteBadge sm, then a text column. Line A is the headsign line in 16sp Medium caps: bus = "`DIRECTIONLABEL` to `HEADSIGN`"; **rail = "to `HEADSIGN`" only** (METRO's rail direction labels are unreliable in the data: the Main Street Square NB platform reports "Southbound"). Line B is up to 2 TimeValues (`upcoming(deps, now)`; the API returns 2) with the StatusWord rule. A route row is 48dp min, is tappable, and opens the Stop sheet with `?route=<id>`.
- **No-service row:** a route in `stop.routes` with no departures in the payload (late night, low frequency) still gets a row: badge + route name + **"No buses in the next 2 hours"** (16sp `--c-text-variant`). These rows sort last. A stop whose routes all have no departures shows one row per route this way (max 3, then "+N more"), never an empty card.
- Sorting of rows: by first upcoming departure time, ascending; canceled-only routes, then no-service routes, last.
- Overflow: "+ N more route(s) (list of names)" opens the Stop sheet.
- **a11y label:** "Fannin St at McKinney St, stop 246, west side of Fannin St, 1 minute walk. Route 137 westbound to Downtown, 7:02 PM, leaves before you get there; then 15 minutes. …"

**C.5b SavedStopRow** (compact, home and search empty state) `{ stopId; name; preferredRouteId?: string; routes: {route, directionLabel, headsign, deps: Dep[]}[]; onOpen }`
```
│ ★ Westheimer Rd @ Montrose Blvd (2958)  ›│ 16sp Bold, star accent-icon
│   [82] EASTBOUND to DOWNTOWN              │ 16sp caps
│        7 min · 15 min                     │ 24sp Bold (scheduled)
```
It shows **`preferredRouteId` first** when set (the route that was expanded in D6 when the rider tapped ☆ Save, C.17 `useSaved`), otherwise the route with the soonest upcoming departure, and a "+1 route" suffix if there are more. If the preferred route has no departure in the window it still shows, with "No buses in the next 3 hours". Min height 88dp. Data comes from `/api/arrivals?stop=<id>&limit=6` per saved stop (see D2 for the cap). **It never waits on location:** it renders as soon as its own arrivals call returns, in every location state including `granted-waiting` and `denied`.

**C.5c RouteDirectionCard** (route-filtered home, D3) `{ route: RouteRef; directionLabel; headsign; stop: StopSummary; walkDistanceM?: number; deps: Dep[]; bay?: string; tcName?: string; onOpen; onWalk }`
```
┌──────────────────────────────────────────┐
│ [40] NORTHBOUND to N SHEPHERD P&R        │ 16sp Medium caps
│ Lamar St @ Main St (342)     [🚶 2 min]  │ 18sp Bold
│ On the north side of Lamar St            │ 16sp variant (no compass)
│ 16 min · 46 min                          │ 24sp Bold (scheduled)
└──────────────────────────────────────────┘
```
The transit-center variant replaces line 2 with "Northwest Transit Center · **Bay M**" (bay in a BayTag) and line 3 with "Platform 2 (stop #79)". Walk minutes come from `walkMinutes(walkDistanceM, pace)`; for the TC variant `walkDistanceM` is the TC's `walkDistanceM` from `/nearby`.

**C.5d TransitCenterCard** (home) `{ tc: NearbyTransitCenter; nextDeps: (Dep & {bay?: string; route: RouteRef; directionLabel; headsign})[]; onOpen; onWalk }`
```
┌──────────────────────────────────────────┐
│ [TC] Northwest Transit Center [🚶 11 min]│ navy 32dp "TC" tile, 18sp Bold
│ Transit center · 16 bays · 0.5 mi        │ 16sp variant
│ [BAY D] [85] SOUTHBOUND to DOWNTOWN      │
│         5 min                            │
│ [BAY G] [85] NORTHBOUND to SH 249        │
│         9 min                            │
│ Departures by bay                      › │ 16sp link-text, 48dp
└──────────────────────────────────────────┘
```
It shows the 2 soonest upcoming departures across bays. The body and "Departures by bay" open the TC view (D10). Height about 220dp.

**BayTag** `{ bay: string }`: `--c-nav-bg` fill, 16sp Bold `--c-text`, text "Bay M", radius 4, 28dp tall.

### C.6 BottomSheet
- **Anatomy:** `--c-surface`, top radius `--r-sheet`, `--e-sheet`. A **handle zone 48dp tall**: the 32x4dp handle (`--c-handle`) centred 10dp from the top, **"‹ Back" at its left end and "Show list ▲ / Show map ▼" at its right end**. These two text buttons live in the handle zone **only**, never in the title row, so a title such as "Route 40 near you" (22sp) gets the full width at 360dp. Below it, a **header row** holds the title (and optional right slot for a short action like "Edit"). The body scrolls. An optional **`footer`** is pinned to the bottom of the sheet (above the nav), outside the scroll area, with a 1dp `--c-divider` top edge and `--c-surface` background, and is visible at `half` and `full` (D12 Start trip). The sheet sits above the bottom nav.
- **Snap points:** `peek` = `--sheet-peek` (handle + header + one line). `half` = `clamp(var(--sheet-half-min), 36dvh, 320px)`, or larger when a screen passes `minHalf`, never past 45dvh (Google Maps proportions: most of the screen stays map, and the rider drags up for more). `full` = top at `env(safe-area-inset-top) + 8px`. It covers the search bar, and the FABs hide.
- **No-drag alternative (WCAG 2.5.7):** the handle zone always has a text button at its far right: **"Show list ▲"** in peek and half (goes to full) and **"Show map ▼"** in full (goes to half). 16sp Medium `--c-link-text`, 48dp target. Dragging also works (pointer events, 30% velocity threshold). Swiping down from half goes to peek. **Swiping never closes or discards anything.**
- **Props:** `{ snap: Snap; onSnapChange(s: Snap): void; minHalf?: number; onBack?: () => void; header: ReactNode; peek?: ReactNode; footer?: ReactNode; children; allowPeek?: boolean (default true); ariaLabel: string }`. `peek` is what the peek state shows instead of the header (e.g. D11's "▶ Start" summary).
- **a11y:** `role="region"` with `aria-label`. The Show list/Show map button has `aria-expanded`. When the snap changes, focus stays where it was. **On route change** (a new screen mounts in the sheet), focus moves to the sheet title, which is an `<h1 tabindex="-1">`. Reduced motion means no animation.
- **Used in:** every Explore sub-screen (D2–D8, D10 is a page, D11–D13).

### C.7 SheetHeader and AppBar
- **SheetHeader** `{ title: string; titleAlign?: "start" | "center"; sub?: ReactNode; right?: ReactNode }`. The title is an `<h1 tabindex="-1">`, 22sp Regular (or the centred stop-title variant), and wraps. `sub` sits on the **same row** when it fits and wraps under the title otherwise (used for UpdatedAgo on home). Back is **not** in this row: it is the labelled text button **"‹ Back"** (16sp Medium `--c-link-text`, `chevron_left` icon, 48dp) at the left of the handle zone (C.6).
- **AppBar** (pushed pages: Route, TC, Alerts, Settings, Route list, About): 56dp, `--c-background`, "‹ Back" on the left, then the 22sp title as `<h1 tabindex="-1">`, which receives focus on route change. The **bottom nav stays visible** on every screen except Welcome, so Fares is always 1 tap away.
- **`document.title`:** every route sets it through `usePageTitle(t("…"))` (F0): "<screen title> · RideMETRO", e.g. "Lamar St @ Main St (342) · RideMETRO", "Route 40 near you · RideMETRO".
- **Back behaviour:** `navigate(-1)` when the app has history in this session, otherwise to the logical parent (G.3 `parentOf(route)`). The browser/Android back button behaves the same, because every screen is a URL.

### C.8 Search bar (map) and SearchField (sheet)
- **MapSearchBar:** 48dp, pill, `--c-surface`, `--e-1`, 16dp from the sides, 12dp below the safe-area top. It holds the METRO mark (28dp tall) on the left, the placeholder **"Place, Stop, or Route"** (16sp `--c-text-secondary`), and the `search` icon on the right. The whole pill is a button that opens `/explore/search`. Label "Search for a place, stop or route".
- **SearchField:** 48dp, pill, `--c-search-field` with a 1dp `--c-outline-strong` border. It holds "‹ Back" (text button) on the left, an autofocused input (16sp, `enterkeyhint="search"`, `autocomplete="off"`), and a **"Clear"** text button when the field has text.

### C.9 Map FABs
- 48x48dp, `--c-surface`, radius `--r-box`, `--e-2`, right edge 16dp, 8dp apart, stacked bottom-up just above the sheet's top edge. They move with the sheet and are hidden at `full`. **ExploreLayout renders them; screens choose them** through `useExploreChrome({ fabs })` (G.4). Default: [Locate, Plan Trip]. When a trip is active the layout itself swaps Plan Trip for My trip, on every Explore screen, so no module has to.
- **Plan Trip** (extended FAB): the `route_plan` icon plus the **"Plan Trip"** label, 16sp Medium `--c-text`, 48dp tall, padding 16. Opens `/explore/plan`.
- **Locate:** the `my_location` icon (`--c-accent-icon`) with `aria-label="Show my location"`. This is the only icon-only control in the app. With no fix, tapping it shows the toast "Can't find your location yet".
- **Route alerts** (only while a route filter is active and that route has alerts): extended, `warning` icon (`--c-alert-icon`) plus "1 alert" in `--c-alert-text`. Opens `/more/alerts?route=<id>`.
- **Trip in progress** (while a trip is active): extended, `notifications_active` (`--c-live-icon`) plus "My trip". Opens `/explore/trip`.

### C.10 Buttons and chips
| Variant | Look | Use |
|---|---|---|
| `primary` | `--c-primary` fill, white 16sp Medium, pill, min 48dp, full width in sheets | ONE per screen state (Plan My Trip, Start trip, I'm at the stop, Show stops near me, Turn on location, Try again) |
| `tonal` (action pill) | `--c-card` fill, `--c-text` 16sp Medium label, 24dp icon in `--c-accent-icon`, pill, min 48dp | Save, Walk here, Full Schedule, Track Bus Stop, Directions, Stops near, Previous step / Next step |
| `outline` | `--c-surface`, 1dp `--c-outline-strong`, `--c-text` label | Secondary full-width ("Search a place or stop") |
| `text` | no fill, `--c-link-text` 16sp Medium, min 48dp target | Back, Show list, Clear, Refresh, Details ›, Not now |
| `danger-text` | text variant in `--c-alert-text` | End trip, Remove |
- Props: `{ variant; label: string; icon?: IconName; onPress; disabled?: boolean; disabledReason?: string; fullWidth?: boolean; href?: string; external?: boolean }`. When disabled, `disabledReason` is shown under the button in 16sp `--c-text-variant`. A greyed button is never left unexplained.
- `external` appends the `north_east` icon and "(opens RideMETRO.org)" to the accessible name.
- **FilterChip** `{ label; selected; onPress }`: 48dp tall, pill. Selected = `--c-primary` fill, white text and a check icon. Unselected = `--c-chip-inactive` with `--c-text`. Used for time chips (Now / In 15 min / In 30 min / In 1 hr), sort chips, and the alert filter.
- **ChipRow** `{ children; label?: string; ariaLabel }`: when `label` is set, a **visible 16sp Medium `--c-text-variant` line above the chips** (e.g. "Your route? Tap it:"), 24dp tall, which is also the group's accessible name. Horizontal scroll with 6dp gaps and a 16dp gutter. At 360dp, 4 md chips (4 × 54dp = 216dp) plus the "More ›" button (about 72dp) fit; the 5th chip is partly visible under the gradient as the scroll cue. When the content overflows, a fixed **"More ›"** text button (48dp, white gradient behind it) sits at the right end and scrolls by one viewport width. It becomes "‹ Back" at the end.
- **SegmentedControl** `{ options: {value,label,sub?}[]; value; onChange }`: 2 segments, each min 56dp. Selected = `--c-primary` fill with white text. Unselected = `--c-surface` with a 1dp `--c-outline-strong` border. `role="radiogroup"`.

### C.11 Alert components
- **AlertBox** `{ alert: Alert; lang; compact?: boolean; demo?: boolean; onOpen }`: `--c-alert-bg`, a 1dp `--c-alert-border`, radius `--r-alert`, padding 12, and the `warning` icon (`--c-alert-icon`). Headline = effect word + header ("Stop moved: Route 82 Westheimer: eastbound stop at Westheimer Rd @ Kirby Dr moved 150 ft east") in 16sp `--c-text`. **The header is never truncated, in any variant** (headers are one sentence; F6 depends on the full header). The `compact` variant differs only by omitting the description and dates. A "Demo" tag (BayTag style) appears when `source === "demo"`. The chevron opens D15.
- **AlertStatusLine** `{ scope: "route" | "stop" | "trip"; name; alerts: Alert[] }` is the **only** component screens use for "is there an alert?". It reads `useAlerts().status/source` and renders exactly one of:
  - `status === "loading"` → a one-line skeleton.
  - `status === "error"` or `source === "unavailable"` → **AlertsUnknownLine**: the `error` icon plus "Alerts can't be checked right now" in 16sp `--c-text-variant` with a "Try again" text button.
  - `alerts.length > 0` → the compact AlertBox (first alert, "+N more ›" if more).
  - `source === "demo"` and no alerts → **DemoAlertsLine**: "Demo alerts only. Live alerts are off." in 16sp `--c-warn-text` on `--c-warn-bg`. **Never a "No alerts" claim from demo data.**
  - `source === "metro"` and no alerts → **NoAlertsLine**: the `check_circle` icon plus "No alerts for Route 82" in 16sp `--c-ok-text`.
- **"No alerts" is only ever shown when the live METRO feed answered.**
- Effect words (`src/lib/alerts.ts`): DETOUR → "Detour", NO_SERVICE → "No service", REDUCED_SERVICE → "Less frequent service", SIGNIFICANT_DELAYS → "Delays", STOP_MOVED → "Stop moved", ACCESSIBILITY_ISSUE → "Accessibility", ADDITIONAL_SERVICE → "Extra service", MODIFIED_SERVICE → "Service change", anything else → "Service notice".

### C.12 StatusBanner and the map overlay slot
There are exactly **two places** a status can appear, each showing at most one item:

**1. The map overlay slot** (ExploreLayout, F0): one 48dp row, 8dp under the MapSearchBar (or under the trip bar on D13). Only the highest-priority active item renders; the rest wait:
1. **offline** banner: full-width, `--c-offline-bg`, white 16sp: "Offline · times from 7:42 PM may be out of date".
2. **trip-active** banner: full-width, `--c-brand-blue-deep`, white: "● Trip in progress · arrive 7:49 PM", with "Open ›" (not on D13).
3. **"Search this area"** pill (C.16), centred.
4. **"Showing Downtown Houston"** chip (no fix / denied), centred caption chip.
5. **"Demo location"** chip (`?demoLoc=`), centred caption chip.

Screens request items with `useExploreChrome({ banner })` (G.4); the layout resolves priority. When a higher item hides a lower chip that carries an honesty note (4 or 5), the same words are repeated in the sheet's caption line (e.g. "Near Downtown Houston (no location)").

**2. The sheet banner row** (inside the home sheet, under the title): **trip-planned** (`--c-card` row "Your trip to Hobby Airport · leaves 6:59 PM", with [Open] and [Clear] text buttons) > **location-off** card > **demo** caption ("Demo data: live times are simulated", or "Sample trips · times shifted to now", D11). One at a time.

### C.13 StepList (timeline, itinerary detail)
- **Anatomy:** a `--c-card` container, radius 12. A 40dp left timeline column holds the origin dot (`--c-origin-dot`, 16dp), each ride leg's line in `route.color` (6dp; rail uses its line colour), walk segments as a dotted `--c-text-variant` line, transfer nodes as white rings, and the destination as a `--c-dest-pin` pin.
- Every row is a button (min 56dp) with a trailing `chevron_right`. Walk row → Walk (D8, to the leg's destination stop). Board or get-off stop row → Stop sheet (D6). Alert row → Alert detail (D15).
- **Props:** `{ steps: TimelineStep[]; onStepPress(step) }`, where `TimelineStep = { kind: "walk" | "board" | "ride" | "alight" | "transfer" | "arrive"; title; lines: string[]; time?: string; status?: Status; route?: RouteRef; stopId?: string; alert?: Alert }`.
- Text: title 16sp Bold, lines 16sp, times 16sp Bold. Duration badge ("6 min") 14sp on `--c-surface` with a 1dp `--c-outline`.

### C.14 BayDiagram (schematic, NOT a map)
The data can't place bays: in `transit-centers.json`, 178 of 196 bays share coordinates, and Northwest TC has only 2 distinct points (Platform 1 = stop 13170, Platform 2 = stop 79). So:
- **Anatomy:** one block per platform (stop). A 16sp Medium caps label reads "PLATFORM 2 · STOP #79". Under it is a wrapping row of 48x48dp bay tiles, each a letter in 18sp Bold on `--c-surface` with a 1dp `--c-outline-strong` border. The highlighted bay has a `--c-primary` fill, white text and a 2dp border. A caption reads "Diagram, not to scale". If `source === "hand-authored-demo"`, the caption adds "Bay assignments are from METRO's printed map and may change."
- Platform name: the part after " - " in the stop name ("Northwest Transit Center - Platform 2" → "Platform 2"), or else "Stop #79".
- **Props:** `{ platforms: { stopId: string; label: string; bays: string[] }[]; highlight?: string; onBayPress(bay) }`. Tapping a tile scrolls the list to that bay's group.
- **a11y:** each tile reads "Bay M, platform 2, routes 58".

### C.15 Dialog, Toast, EmptyState, ErrorState, Skeleton, UpdatedAgo, ListRow, SectionHeader
- **Dialog** `{ title; body; actions: {label, variant, onPress}[] }`: 312dp wide (max 90vw), radius 12, `--e-dialog`, scrim `--c-scrim`, title 20sp Medium `--c-brand-blue-deep`, body 16sp, and right-aligned actions: text buttons, sentence case (not ALL CAPS). It traps focus and closes on Esc and on back. **Used only for:** "Clear recent history?", "End this trip?" and "Handoff to METRO".
- **Toast** `{ message; action?: {label, onPress}; durationMs? }`: bottom, above the nav, `--c-text` bg, white 16sp, radius 8, `role="status"`. The default is 4s. **Undo toasts last 10s** and pause while focused.
- **EmptyState / ErrorState** `{ icon; title; body; action? }` / `{ error: ApiError | Error; context?: Record<string,string>; onRetry }`: centred in its container. Title 18sp Bold, body 16sp, one tonal or primary action. ErrorState always offers **"Try again"**. Its body is `t("error." + error.code, context)` (keys in `common.ts` for every server code: `stop_not_found`, `route_not_found`, `tc_not_found`, `bad_request`, `upstream_unavailable`, `network`, `unknown`, …). The server's English `error.message` is used **only as the `en` fallback** when a code has no key.
- **Skeleton** `{ variant: "stop-card" | "row" | "strip" }`: `--c-card` blocks with a shimmer (static under reduced motion).
- **UpdatedAgo** `{ at: string; onRefresh; compact?: boolean }`: "Updated 8 sec ago · Refresh" (compact: "8 sec ago · Refresh", used in the home title row) in 14sp `--c-text-secondary` with a 48dp "Refresh" text button. It re-renders on the `useNow()` tick. Past 90s it turns `--c-alert-text` and reads "Not updated for 2 min". Offline, it reads "Offline · last update 7:42 PM". Not a live region.
- **NotifyPermissionCard** `{ context: "trip" | "stop-track"; onDone }` (moved to F0 so D6 and D13 share it): `--c-card` box, "Want a buzz before your stop?" (trip) or "Want a buzz when the bus is 5 min away?" (stop-track), (Turn on alerts) tonal, "Not now" text. It calls `src/lib/notify.ts` (C.17). Shown at most once per context; declining shows the caption "Alerts will show on this screen only."
- **ListRow** `{ label; value?; kind: "internal" | "external" | "toggle" | "radio"; onPress; disabled? }`: 56dp min, 16dp inset, 16sp label, value 16sp `--c-text-variant`, and a trailing `chevron_right` (internal) or `north_east` (external).
- **SectionHeader** `{ label; tone: "variant" | "blue"; action?: {label, onPress} }`: 16sp Medium caps. "blue" uses `--c-brand-blue-dark` (the More list), "variant" uses `--c-text-variant`.

### C.16 Map primitives (`src/map/`, foundation)
- **MapView:** one MapLibre instance mounted once in the Explore layout, and never re-created on navigation.
- **Style** (`src/map/style.ts`): fetch `https://tiles.openfreemap.org/styles/liberty` and override its layer paints to the `--c-map-*` tokens (land, parks, hospital, commercial, water, highways blue-grey). Hide POI icons below zoom 17 and all shop/food POIs. Label font "Noto Sans Regular" from the OpenFreeMap glyphs. Attribution is compact bottom-left: "© OpenFreeMap © OpenStreetMap".
- **Stop pins layer:** GeoJSON from `/data/stops.json` (8,797 stops, loaded once and cached by the service worker). Hidden below zoom 14. At zoom 14–15.9, unlabelled pins (a 20dp rounded square, `--c-stop-pin`, white bus glyph). At zoom ≥ 16, 28dp pins **with an ID label chip under every pin** ("342", 14sp Medium `--c-text` on white, 1dp `--c-outline-strong`). Labels use `symbol-sort-key` = distance to the anchor, so the nearest win collisions. Pins themselves always show (`icon-allow-overlap: true`). Rail stations use a `--c-rail-red` pin with a tram glyph. Transit centers (from `/api/transit-centers`) use a 36dp navy "TC" pin and a name label at zoom ≥ 13. The direction notch comes from `bearing`: a small white triangle on the pin edge.
- **Tap targets:** tapping a pin opens `/explore/stop/:id` directly (there is no "Choose Direction" step). The hit area is 44dp around the pin. Where pins overlap, the nearest to the tap wins.
- **Accessibility of the map:** the MapLibre canvas container is `aria-hidden="true"` and removed from the tab order (`tabindex="-1"` on the canvas, keyboard handlers off). **The sheet list is the accessible equivalent** of the pins: every stop on the map within the Nearby radius is also a card or row in the sheet, and every map-only action (pan → "Search this area") has a button. The map never holds the only copy of any information.
- **User dot:** `--c-user-dot` 16dp, a 2dp white ring and a 15% accuracy halo. It is drawn **only with a real fix**.
- **Scene API** (how screens drive the map), in `src/map/scene.ts`:
```ts
interface MapScene {
  focus?: { kind: "user" | "point" | "bounds"; point?: LatLon; bounds?: [LatLon, LatLon]; zoom?: number };
  highlightStopId?: string;                 // enlarged 36dp pin + today's white callout "Stop: 342"
  routeLine?: { coords: [number, number][]; color: string };   // selected route
  legs?: { coords: [number, number][]; kind: "walk" | "ride"; color: string }[]; // itinerary / walk
  markers?: { id: string; point: LatLon; kind: "origin" | "destination" | "board" | "alight" | "transfer" | "bay"; label?: string }[];
  vehicles?: { id: string; point: LatLon; label: string }[];   // live bus icons (navy bus glyph, 24dp, white ring)
  showSearchThisArea?: boolean;
}
useMapScene(scene: MapScene, deps: unknown[]): void   // a screen sets its scene on mount; the layout clears it on unmount
useMapPadding(): { bottom: number }                   // current sheet height, so fitBounds keeps content above the sheet
```
- **"Search this area":** when the map centre is more than 300m from the Nearby anchor, a 48dp white pill (`--e-2`, 16sp Medium `--c-link-text`) appears 8dp under the search bar. Tapping it navigates to `/explore?at=<lat,lon>&label=this%20area`. **Panning never changes the list by itself.** There is no blue radius circle.

### C.17 Location, preferences and storage (foundation state)
- `useLocation()` → `{ status: "unknown" | "prompt" | "granted-waiting" | "fix" | "denied" | "unavailable"; fix?: {lat, lon, accuracyM, at}; request(): void }`. It uses `watchPosition` with high accuracy while the page is visible and stops when hidden. After 15s with no fix, the status becomes "unavailable". **Screens must treat the states differently:** `unknown` / `prompt` / `granted-waiting` = "Finding your location…" (neutral, never red, never "off"); `denied` / `unavailable` = "Location is off". Nothing that doesn't need a location (Saved rows, search, the planner with a chosen From) waits on it.
  - **Demo override (for emulator screenshots):** a URL param `?demoLoc=29.7563,-95.3639` is stored in `sessionStorage` and used as the fix. The UI then shows the "Demo location" chip in the overlay slot (C.12), so it stays honest. `?demoLoc=off` clears it.
- `usePrefs()` → `{ lang: "en" | "es"; textSize: "standard" | "large" | "xlarge"; walkPace: "normal" | "slower"; welcomed: boolean; set(...) }`, persisted in `localStorage["ridemetro.prefs"]`. The first `lang` comes from `navigator.language` (`es*` → es). Setting `lang` also sets `document.documentElement.lang` ("en" / "es").
- **Walk time: one formula, everywhere** (`src/lib/walk.ts`):
  - `walkMinutes(distanceM, pace)`: normal = `max(1, round(d / 1.25 / 60))`, slower = `max(1, round(d / 0.9 / 60))`. **This is the only way a walk minute is ever computed for display.**
  - The distance comes from the best source available, in this order: OSRM `distanceM` (from `/walk`, or from `/nearby?precise=1` for the 3 nearest stops, `walkSource === "osrm"`) > `walkDistanceM` from the server's estimate > `estimateWalk(from, to)` (haversine × 1.3). OSRM **`durationMin` and `relaxedDurationMin` are never displayed**.
  - `useWalkDistance(from, stopId)` (F0 hook) caches the best-known distance per `(rounded from, stopId)` in memory, so a card that showed "🚶 2 min" and the D6 / D8 screens it opens all show the same number: D8 seeds from the card's distance (passed as `?d=<m>` on the link) until OSRM answers, and then only replaces it if OSRM's distance differs by more than 10%, in which case every screen updates together.
- **`canMakeIt(walkMin, dep, now): "yes" | "tight" | "no"`** (`src/lib/walk.ts`, the ONLY "can I make it" rule; used by C.2 tooSoon, D8's next-bus line and D13's walk step). With `left = (departureTime − now) / 60000` (fractional): `left < walkMin` → "no"; `left < walkMin + 2` → "tight"; else "yes". Wording: yes → "You have time." (`--c-ok-text`), tight → "Hurry: it's close." (`--c-alert-text`), no → "Leaves before you get there." (`--c-alert-text` in D8/D13; the grey tooSoon rendering on cards).
- **`src/lib/notify.ts`** (F0): `notifyPermission(): "default" | "granted" | "denied" | "unsupported"`, `requestNotify(): Promise<…>`, and `notify(title, body, tag)`, which calls **`navigator.serviceWorker.ready.then(r => r.showNotification(title, { body, tag, vibrate: [200,100,200] }))`**. `new Notification()` is never used: on Android Chrome the constructor throws `TypeError: Illegal constructor`. Also `vibrate(pattern)` guarded by `navigator.vibrate`.
- `useSaved()` → saved stops `{id, name, addedAt, preferredRouteId?}[]` (ordered), saved routes `{id, name}[]`, `add/remove/move(id, dir)`, in `localStorage["ridemetro.saved"]`.
- `useRecents()` → recent stops, routes, searches and trips (max 10 each), in `localStorage["ridemetro.recents"]`, plus `clear()`. **Writers (the only places that call `add`):** recent **stops** ← D6 on open (A); recent **routes** ← D9 on open (B); recent **searches** ← D5 when a result is tapped (B); recent **trips** ← D11 on each successful plan with both ends set (C). D16 (D) only reads and clears.
- `useTrip()` → `{ planned?: StoredTrip; active?: ActiveTrip; setPlanned; start; setStep; end }`, in `localStorage["ridemetro.trip"]`. (The API hook for `/api/trips/:id` is named `useTripStops`, G.4, to avoid a clash.)
- **Every storage access is wrapped in try/catch.** When storage is unavailable the app runs with in-memory state and shows nothing broken.

---

## D. Screens

Conventions for every screen:
- **URL** is the source of truth. A screen reads everything it needs from its path and query, so a cold load of the URL renders the same screen (after fetching). The browser/Android back button pops one screen.
- **Data** uses TanStack Query hooks from `src/api/hooks.ts` (G.4). Polling: arrivals and nearby every 30s while the document is visible, vehicles every 15s, alerts every 120s. Everything refetches on `visibilitychange` → visible.
- **Times** (one rule, C.2): every time is rendered by TimeValue from `departureTime` and `useNow()` (15s tick), so "16 min" counts down between polls. Departures more than 1 min past are dropped client-side (`upcoming()`).
- **States** every screen implements: `loading` (skeletons, never a blank sheet), `error` (ErrorState with "Try again"), `offline`, and, where location matters, `finding-location` (`unknown`/`prompt`/`granted-waiting`) vs `location-off` (`denied`/`unavailable`), which are never conflated.
  - **Offline (the single rule):** cached data plus the offline banner. **Every time is shown as a clock time** ("7:05 PM") with no relative minutes, and **every time is shown as scheduled** (no Live word, even if it was live when cached), because a cached prediction is not live. Past times (more than 1 min) are still dropped. The ScheduleCaption reads "Offline: scheduled clock times, may be out of date". There is no 60s exception.
  - **Late night / no service:** when a stop's routes have no departures in the window, the route rows still render with "No buses in the next 2 hours" (C.5a); the chip row is built from `stop.routes`, not from departures, so chips never vanish.
- **Accessibility on every screen:** on navigation, focus moves to the screen's `<h1>` (sheet title or AppBar title) and `document.title` updates (C.7). **Polling never re-announces:** lists, cards, strips and UpdatedAgo are not live regions. `aria-live="polite"` is used **only** on the D13 step card headline and the D13 get-off warnings (and `role="status"` on toasts).
- **Scheduled is unmarked** (A.1.4): each sheet or page that lists times shows one ScheduleCaption (C.2), next to UpdatedAgo.
- Wireframes are about 42 characters wide for 360dp and are not to scale. `[40]` = RouteBadge, `( … )` = tonal pill, `[[ … ]]` = primary button, `‹ Back` / `Show list ▲` = text buttons.

### D1. Welcome (first launch only) — `/welcome`
```
┌──────────────────────────────────────────┐
│ [METRO]                                  │ mark 28dp, top-left
│                                          │
│                 ( 📍 )                   │ 72dp navy #005193 icon
│  Welcome to RideMETRO                    │ 28sp
│                                          │
│  See the next bus at the stops closest   │ 16sp text-variant
│  to you. We use your location only while │
│  the app is open.                        │
│                                          │
│  Language                                │ 16sp Medium
│  ╭──────────────┬───────────────╮        │ SegmentedControl 56dp
│  │ ✓ English    │   Español     │        │
│  ╰──────────────┴───────────────╯        │
│  Text size                               │
│  ╭──────────┬──────────┬──────────╮      │ SegmentedControl 56dp
│  │ ✓ A      │    A+    │   A++    │      │ 16 / 18 / 21sp glyphs
│  ╰──────────┴──────────┴──────────╯      │
│                                          │
│ [[        Show stops near me         ]]  │ primary 48dp
│          Not now, I'll search            │ text button
└──────────────────────────────────────────┘
```
- **Background** `--c-background`. There is no bottom nav. The content scrolls at xlarge.
- Changing Language or Text size applies immediately to this screen (live preview).
- **Show stops near me** calls `useLocation().request()`, which triggers the OS/Chrome permission dialog. On grant, or on deny, it sets `welcomed=true` and does `navigate("/explore", {replace:true})`. A deny lands in the location-off state (D2).
- **Not now, I'll search** sets `welcomed=true` and goes to `/explore` without asking.
- **Routing guard:** any URL except `/welcome` redirects here when `welcomed` is false, **except deep links to `/explore/stop/*`, `/explore/route/*`, `/explore/tc/*`, `/more/alerts*` and `/fares`**. Those render directly and set `welcomed=true`, so a shared link always works.
- Can be shown again from More › Settings › "Show welcome again".

### D2. Explore home: Nearby — `/explore`
```
┌──────────────────────────────────────────┐
│ ╭[METRO] Place, Stop, or Route      🔍╮ │ MapSearchBar 48dp
│        (overlay slot: ≤1 chip/banner)    │ C.12, only if active
│                                   ┌───┐  │
│   map (light, Google-like)        │ ⌖ │  │ Locate FAB
│   ▣246  ▣567   ◉ you             ╭────╮ │   map strip ≥ 180dp
│         ▣247                      │⋯●  │ │   at 412x800 (rule
│         ▣342                      │Plan│ │   M1 below)
│                                   │Trip│ │ Plan Trip FAB
│╭────────────────────────────────────────╮│
││                ────        Show list ▲ ││ handle zone 48dp
││ Nearby stops       8 sec ago · Refresh ││ 22sp + 14sp, ONE row
││ Your route? Tap it:                    ││ 16sp Medium label
││ [6] [11] [40] [41] [5…         More ›  ││ ChipRow 48dp: 4 fit
││ ★ Westheimer Rd @ Montrose Blvd (2958)›││ SavedStopRow (max 1)
││   [82] EASTBOUND to DOWNTOWN           ││
││        7 min · 15 min                  ││
││ ┌────────────────────────────────────┐ ││
││ │Fannin St @ McKinney St    [🚶1 min]│ ││ NearbyStopCard #1
││ │(246)                       [ walk ]│ ││
││ │On the west side of Fannin St       │ ││
││ │[137] WESTBOUND to DOWNTOWN         │ ││
││ │  7:02 PM Leaves before you get there││ ││ tooSoon (C.2)
│╰┴────────────────────────────────────┴─╯│
│  (Explore)   Fares    Recent    More     │ nav 80dp
└──────────────────────────────────────────┘
```
**Content, top to bottom (sheet):**
1. Handle zone (48dp) with **Show list ▲ / Show map ▼** at its right (C.6).
2. **One title row:** "Nearby stops" (22sp `<h1>`) with the compact UpdatedAgo "8 sec ago · Refresh" right-aligned **on the same row**. If they don't fit (large text), UpdatedAgo wraps under the title. The ScheduleCaption is at the bottom of the list (item 8), not here.
3. Sheet banner row (C.12 item 2): one of trip-planned, location-off, demo. Usually absent.
4. **Route ChipRow** with the **visible label "Your route? Tap it:"** (16sp Medium, `--c-text-variant`, C.10). One md RouteBadge per distinct route in **`stop.routes`** of the returned stops (the `StopSummary` list of routes that serve the stop, **not** the departures, so a route with no bus in the next 2 hours keeps its chip), plus the routes of a TC within 1,000m (item 7). **Sort** (`sortRouteChips`): by the `walkDistanceM` of the nearest stop serving the route, ascending, then by route number numerically ("6" < "11" < "40" < "137"), with rail lines after buses at equal distance. At the F1 GPS this gives `6, 11, 40, 41, 51, 52, 137, Red, Green, Purple, 500`, so **[40] is the 3rd chip, inside the 4 that fit at 360dp**. A tap navigates to `/explore?route=<routeId>` (D3).
5. **Saved** (only if the rider has saved stops): **exactly 1** SavedStopRow (the first in saved order) in every snap of the home sheet. When there are more, the row's trailing chevron is replaced by the text button **"+2 saved ›"** (48dp, `--c-link-text`) that opens `/recent`. No section header (the ★ is the cue). Saved rows **never wait on location** (C.5b): they render in `granted-waiting`, `denied` and `fix` alike.
6. **Nearby stop cards:** up to **8** NearbyStopCards, sorted by `walkDistanceM` (the API order). Cards 7–8 are schedule-only (the API fetches real time for the first 6); since scheduled is the unmarked default they simply show no Live word.
7. **Transit center** (only when one is within 1,000m, from `nearby.transitCenters`, G.4): one TransitCenterCard, placed **directly after the first NearbyStopCard** (never above it), so it never pushes the nearest stop below the fold.
8. Footer: the ScheduleCaption ("Times are scheduled unless marked **Live**"), then "Walk times are estimates at a normal pace. Change the pace in More › Settings." **No Legend on home** (it lives on D6 only).

**Height budget and above-the-fold rules (acceptance-tested, Standard text):**

| Block | dp |
|---|---|
| Handle zone | 48 |
| Title row (title + UpdatedAgo on one row) | 40 |
| Chip label + ChipRow | 24 + 56 |
| 1 SavedStopRow (only when saved stops exist) | 88 |
| Card #1 to its first time: padding 12 + name/ID (2 lines at 360dp) 52 + side line 22–44 + divider 9 + headsign 22 + time 30 | 147–169 |
| **Total, with 1 saved row** | **≈ 425** |
| **Total, no saved row** | **≈ 337** |

The TC card (≈ 220) is after card #1 and the trip-planned banner (56) is the only banner that can appear in the sheet; neither is in the fold budget, and the half height cap below always wins.

- **Half height:** `min(contentHeightToCard1FirstTime, 100dvh − navH − 60 (search bar) − mapMin)` where **`mapMin` = 180dp at heights ≥ 740, 120dp below** (never less than `--sheet-half-min`).
- **M1 (map strip):** at **412x800** the visible map between the search bar's bottom edge and the sheet's top edge is **≥ 180dp** in half, with or without a saved row (800 − 80 − 60 − 425 = 235dp). At 360x640 it is ≥ 120dp.
- **M2 (fold at 412x800):** with 1 saved row, the SavedStopRow **and** card #1's name + ID, walk time and first route row with its time are visible without scrolling.
- **M3 (fold at 360x640):** with no saved row (F1, F10), the same card #1 content is visible (337 ≤ 640 − 80 − 60 − 120 = 380). With a saved row, the SavedStopRow and card #1's name + walk time are visible; its route rows may need **Show list ▲** (stated honestly; F2 still passes because its answer is the saved row).
- **M4:** at 360x640 and 412x800 the stop-pin labels nearest the user (F4's 342 at 136m) are inside the visible map strip at the default zoom 16 (the camera centre is offset by `useMapPadding`).

**Map scene:** focus = user at zoom 16, with the camera centre offset so the user dot sits in the middle of the visible map strip above the sheet (`useMapPadding`). Pins show for the whole viewport. There is no radius circle.

**Data:** `GET /api/nearby?lat&lon&precise=1` (radius default 500, up to 15 stops plus `transitCenters`; `precise=1` gives OSRM walking distances for the 3 nearest stops, `walkSource: "osrm"`, and the client turns every distance into minutes with `walkMinutes`, C.17). Saved row: `GET /api/arrivals?stop=<id>&limit=6` for the first saved stop only. Chips are derived client-side from `stops[].stop.routes`.

**States:**
| State | What shows |
|---|---|
| Finding location (`unknown` / `prompt` / `granted-waiting`) | Title "Finding stops near you…", the Saved row (it doesn't wait), then 3 skeleton cards. Neutral colours, never "Location is off". The map stays at the last known fix, or Downtown with the overlay chip "Showing Downtown Houston" (no blue dot). When the fix arrives the list fills in place. If the status becomes `unavailable` (15s, no fix): the location-off card below, with the text "We couldn't find your location. Try moving near a window, or search instead." |
| Location off (`denied` / `unavailable`) | The sheet banner row shows the location-off card: "📍 **Location is off**" (18sp Bold) / "We can't show stops near you." / [[Turn on location]] / (Search a place or stop). The Saved row still shows, live. No walk times and no "Nearest" anywhere. The map is at Downtown with the overlay chip "Showing Downtown Houston". If the browser blocks re-prompting, show the steps: "In Chrome, tap ⋮ › Settings › Site settings › Location, then allow this site." |
| No stops within 500m (`message` present) | "No stops within a 10-minute walk" (18sp Bold), then the nearest 3 from a re-query with `radius=2000`, labelled with their walk times, then a (Plan Trip) tonal button. |
| **Late night / no service** (stops returned but some or all routes have no departures in the 2-hour window) | Cards render normally; each route with no departures gets the row "[40] Route 40 · No buses in the next 2 hours" (C.5a). Chips are unchanged (built from `stop.routes`). If **no** card has any departure, a caption under the title reads "Late night: few or no buses in the next 2 hours. Tap a stop for its next bus." (The stop sheet, D6, shows the next day's first bus via `/schedule`.) |
| Offline | The offline banner in the overlay slot. The cached list with UpdatedAgo "Offline · last update 7:42 PM". Times as **clock times, scheduled styling** (D conventions, the single offline rule). |
| API error | ErrorState "We couldn't load stops near you." [Try again]. The Saved row still renders if its call succeeds. |
| Search this area | See C.16 (overlay slot, priority 3). |

**Navigation out:** card body or route row → D6. WalkButton → D8 (with `?d=<walkDistanceM>`). Chip → D3. TC card → D10. Search bar → D5. Plan Trip FAB → D11. Pin → D6. Saved row → D6 (`?route=<preferredRouteId>` when set). The trip banner → D12/D13.

### D3. Route near you (route-filtered home) — `/explore?route=<routeId>`
```
│╭────────────────────────────────────────╮│
││ ‹ Back          ────       Show list ▲ ││ handle zone (C.6)
││ Route 40 near you                      ││ 22sp title, full width
││ Your route? Tap it:                    ││
││ [6] [11] [✓40] [41] [5…        More ›  ││ chip 40 selected
││ ┌────────────────────────────────────┐ ││
││ │[40] SOUTHBOUND to MONROE P&R       │ ││
││ │McKinney St @ San Jacinto St (567)  │ ││
││ │                         [🚶 1 min] │ ││
││ │On the south side of McKinney St    │ ││
││ │29 min · 59 min                     │ ││
││ └────────────────────────────────────┘ ││
││ ┌────────────────────────────────────┐ ││
││ │[40] NORTHBOUND to N SHEPHERD P&R   │ ││
││ │Lamar St @ Main St (342)  [🚶 2 min] │ ││
││ │On the north side of Lamar St       │ ││
││ │16 min · 46 min                     │ ││
││ └────────────────────────────────────┘ ││
││ See all Route 40 stops ›               ││ → D9
││ (AlertStatusLine for Route 40)         ││ C.11
││ Times are scheduled unless marked Live ││ ScheduleCaption
│╰────────────────────────────────────────╯│
```
- **Which stop per direction (client-side, not from `/nearby`):** from `GET /api/routes/:id` (cached 5 min), for each `directions[d]`, compute the haversine distance from the anchor (fix or `at`) to every entry of `directions[d].stops` (they carry `lat`/`lon`) and take the nearest. Its walk distance is `/nearby`'s `walkDistanceM` if that stop is in the payload (so the number matches D2), otherwise `estimateWalk`. This fixes both downtown density (the 15 nearest stops can all sit inside 250m and miss a direction) and stop 342 being 8th nearest.
- **Times per card:** `GET /api/arrivals?stop=<id>&route=<routeId>&limit=2` per direction card (2 calls, 3 with a TC; polled every 30s). These calls fetch real time for their stop whatever its rank, so F1's card is live when live keys are set.
- **Order:** **earliest catchable bus first** (the first departure the rider can still reach after walking there), ties broken by the closer stop (at the F1 GPS: SOUTHBOUND via 567 at 63m, then NORTHBOUND via 342 at 136m). **The TC variant card is never below second**, whenever the TC within 1,000m (D2 item 7) has a bay serving this route (from `GET /api/transit-centers/:id`, already fetched for the TC card): "Northwest Transit Center · **Bay M** · Platform 2 (stop #79) · WESTBOUND to WEST BELT", so it always sits inside the half sheet. Nothing is ever hidden.
- **Then** "See all Route 40 stops ›" and the AlertStatusLine (C.11).
- **Header:** "‹ Back" (to `/explore`) and Show list/map sit in the handle zone; the title "Route 40 near you" has its own full-width row (C.6). Tapping the selected chip again also clears the filter.
- **Snap:** `minHalf = min(header + chip row + first 2 cards, 75dvh)`. Because the TC card is always first when present, F7's Bay M card is always inside the first 2; at the F1 GPS (no TC for route 40) both direction cards are inside the first 2.
- **Map scene:** the route's shape for each direction (`directions[].shapePoints`) in `--c-route-line`, only this route's stops highlighted, and fit to the user plus the shown stops.
- **Chrome:** `useExploreChrome({ fabs: ["locate", "planTrip", { kind: "routeAlerts", routeId }] })`; the layout shows "⚠ 1 alert" only when `useAlerts().forRoute(id).length > 0` and `source !== "unavailable"`.
- **Data:** `GET /api/routes/:id`, the per-card arrivals calls above, the TC detail (if any), and the alerts store.
- **Empty:** only when the nearest stop of every direction is more than a 10-minute walk away (`walkMinutes(distance, pace) > 10`): "Route 40 doesn't stop within a 10-minute walk. The closest stop is McKinney St @ … (567), 14 min walk." [See all Route 40 stops]. The claim is computed from the full route stop list, so it cannot be wrong because of `/nearby`'s 15-stop cap.

### D4. Stops near a place — `/explore?at=<lat>,<lon>&label=<text>`
- Identical to D2, but anchored at `at`. The title is **"Stops near Houston Museum of Natural Science"** (wraps to 2 lines). A chip under the title reads **"✕ Back to my location"** (tonal, 48dp; it goes to `/explore`). Walk times are measured **from the place**, and every card says so: the WalkButton reads **"4 min" over "walk from the museum"** (`walkFrom.label` = a short form: the landmark's `shortName` if curated, else "from there"), and the card a11y label says "4 minute walk from Houston Museum of Natural Science". The user dot still shows if there is a fix.
- **Walk link:** the WalkButton opens D8 with **`?from=<at>&fromName=<label>`**, and D8's title then reads "Walk from Houston Museum of Natural Science to Main St @ Remington Ln (688)".
- The map puts the place marker (a black `place` pin, label = `label`) at `at`.
- **Data:** `GET /api/nearby?lat&lon&precise=1` with the place's coordinates. The Saved section is hidden here, to keep the answer focused.
- **Real example (HMNS 29.7220,-95.3897):** 688 Main St @ Remington Ln (On the east side of Main St · 4 min · [56] NORTHBOUND to GREENSPOINT TC); 2504 Main St @ Remington Ln (On the west side of Main St · 4 min · [56] SOUTHBOUND to TMC TC); 25015 Museum District Stn NB (Rail station · 5 min · [Red] to METRORAIL -NORTH LINE TC); 25016 Museum District Stn SB (5 min · [Red] to METRORAIL - FANNIN SOUTH).

### D5. Search — `/explore/search?q=<text>`
```
┌──────────────────────────────────────────┐
│ ╭‹ Back │ hobby|                  Clear╮ │ SearchField 48dp
│ PLACES                                   │ 16sp Medium caps
│ 📍 Hobby Airport                          │ 18sp Bold
│    Airport · 7800 Airport Blvd           │ 16sp variant
│    Closest stop: Hobby Airport (10567) · │ 16sp
│    Eastbound                             │
│    ( ➜ Directions )  ( 🚏 Stops near )    │ tonal pills 48dp
│ ──────────────────────────────────────── │
│ STOPS                                    │
│ 🚏 Hobby Airport (10567)          [🚶 Walk]│ row 64dp
│    Eastbound stop · Routes 40, 50, 73,   │
│    88, 500 · 6.0 mi away                 │
│ ──────────────────────────────────────── │
│ ROUTES                                   │
│ [82] 82 Westheimer                       │ (for q="82")
│    ( Eastbound ) ( Westbound )           │ tonal pills 48dp
│    ⚠ Stop moved: Route 82 Westheimer:    │ compact AlertBox
│    eastbound stop at Westheimer Rd @     │
│    Kirby Dr moved 150 ft east          › │
└──────────────────────────────────────────┘
```
- **Opened by** the map search bar, as a full sheet over the map with a white background. The input is autofocused and the keyboard opens. The query is debounced 250ms and written to the URL with `replace`, so back leaves the search in one press.
- **Data:** `GET /api/search?q&lat&lon` (lat/lon of the fix, if any). Transit center names come from the cached `GET /api/transit-centers`. The alerts come from the alerts store (G.4).
- **Grouping and order (client-side):**
  - If the query is 1–3 digits or a rail line name (`red|green|purple`), show **ROUTES first**, then STOPS. (For "82", the backend lists stop #82 Monroe P&R first. The client moves the route up.)
  - Otherwise: PLACES (landmarks first, then `place` results), then TRANSIT CENTERS, then STOPS, then ROUTES.
  - Stops with `kind === "transit-center"` whose id is in a TC's `stopIds` are **collapsed into one TRANSIT CENTERS row** ("Northwest Transit Center · Transit center · 16 bays", navy "TC" tile), which opens D10. For "northwest", stops 79 and 13170 become that one row.
  - Stops sharing a `group` (same intersection) are shown together, each with its direction ("Eastbound stop", "Westbound stop"). This is the J4.6 fix.
- **Row actions (these replace the "What do you want to do?" dialog):**
  - **Place / landmark:** the body and **Stops near** → D4 with `at` = the landmark lat/lon and `label` = the title. **Directions** → D11 with `to=landmark:<id>` (landmark) or `to=<lat>,<lon>&toName=<title>` (place). A **"Closest stop: <name> (<id>) · <dir>"** line comes from `nearbyStops[0]`. When a fix exists it adds "· N min walk from there" using `estimateWalk(landmark, stop)`.
  - **Stop:** the body → D6. The row's second line is `sideLine(stop, { withCompass: true })` ("Eastbound stop · South side of …"), because a search row shows no route direction; route names follow ("Routes 40, 50"), built client-side from `stop.routes` (never `stop.subtitle`). **[🚶 Walk]** (tonal, 48dp, labelled "Walk") → D8. When there is no fix, the Walk button is hidden.
  - **Recents:** tapping any result calls `useRecents().addSearch(q)` (B is the writer of recent searches, C.17).
  - **Route:** the body → D9 with the direction whose nearest stop is closest to the user (or `dir=0` without a fix). The **direction pills** (labels from `/api/routes/:id` `directions[].label`, e.g. "Eastbound", "Westbound") → D9 `?dir=<directionId>`. The **AlertStatusLine** (C.11) is always shown under the route: the compact AlertBox with the **full header** (first alert, "+1 more ›" if more), or "✓ No alerts for Route 82" (live feed only), or "Demo alerts only", or "Alerts can't be checked right now". **This line is the F6 answer.**
  - **Route + stop shortcut:** if the query matches `^(\d{1,3}|red|green|purple)\s+(.+)$` and the first token is a route, add a group at the top: **"ROUTE 82 STOPS MATCHING 'montrose'"**, with one row per matching stop in each direction (from the cached `/api/routes/:id`): "Westheimer Rd @ Montrose Blvd (2958) · Eastbound". A tap → D9 `?dir=<d>&stop=<id>` expanded at that stop.
- **Empty query state:** Saved stops (SavedStopRow, max 3), then "RECENT" searches (max 5, each a ListRow with a "Remove" text button), then the hint (16sp variant): "Try a stop number from the sign (342), a route (82), a corner (Westheimer and Kirby), or a place (Hobby Airport)."
- **No results:** "No matches for 'xyz'." / "Check the spelling, or try the stop number on the sign at the stop."
- **Warnings** (e.g. the offline "Address search is unavailable right now…"): shown as a 16sp `--c-warn-text` row on `--c-warn-bg` at the end of the list.
- **Error:** ErrorState with "Try again".
- **Pick mode** (`?pick=from|to&returnTo=<encoded D11 URL>`): the first row is "● My current location" (when there is a fix). A result tap calls `navigate(encodePick(returnTo, field, result), { replace: true })` from `src/lib/planQuery.ts` (F0, G.4), so B never hand-builds C's query string.
- **Navigation in:** search bar, Plan Trip "To"/"From" fields (pick mode). **Out:** D4, D6, D8, D9, D10, D11.

### D6. Stop sheet — `/explore/stop/:stopId?route=<routeId>`
```
│╭────────────────────────────────────────╮│
││ ‹ Back          ────       Show list ▲ ││ handle zone
││        Lamar St @ Main St (342)        ││ 20sp Bold, centred <h1>
││     On the north side of Lamar St      ││ 16sp variant, centred
││  ( ☆ Save )    ( 🚶 Walk here · 2 min ) ││ tonal pills 48dp
││ (AlertStatusLine for this stop)        ││ C.11
││ ────────────────────────────────────── ││
││ [🚌]  Telephone / Heights            › ││ route header row
││ [40]  NORTHBOUND to N SHEPHERD P&R     ││ 16sp Bold caps
││  ( 📅 Full Schedule ) ( 🔔 Track Bus Stop )││ tonal pills (as today)
││████████████████████████████████████████││ LiveStrip 64dp
││█ 16 min      46 min     1:16 AM        █││ #005DAA, scheduled =
││█                                       █││   no word under digits
││████████████████████████████████████████││
││ [41] WESTBOUND to TMC TC               ││ collapsed row 64dp
││      2 min · 31 min                  › ││
││ 8 min  Live ᯤ8 min  C̶a̶n̶c̶e̶l̶e̶d̶ 8 min     ││ Legend (D6 only)
││ Scheduled                              ││
││ 8 sec ago · Refresh · Times are        ││ UpdatedAgo +
││ scheduled unless marked Live           ││ ScheduleCaption
│╰────────────────────────────────────────╯│
```
- **Opened from:** a pin, a nearby card or route row (`?route=`), search, Recent, an itinerary row, or the Route page. A deep link works.
- **Header:** "‹ Back" (handle zone), and the **centred bold "Name (ID)"** exactly as today. The meta line is `sideLine(stop)` without the compass word ("On the north side of Lamar St"), because the route header rows below carry the direction (C.5a rule). A TC platform stop also shows a row "Part of **Northwest Transit Center** · Departures by bay ›" → D10.
- **Stop actions (one row, 2 pills):** **☆ Save** toggles to **★ Saved** (star filled, `aria-pressed`), with the toast "Saved. It will show at the top of Explore." Saving stores `preferredRouteId` = the currently expanded route (C.5b). Unsaving shows "Removed from saved. **Undo**" (10s). **🚶 Walk here · 2 min** → D8 (the walk time lives only in this pill; there is no separate "2 min walk · 0.1 mi" line). With no fix it reads just "🚶 Walk here".
- **Alerts:** AlertStatusLine("stop") over `forStop(id, routeIds)` (the stop's alerts plus its routes' alerts); several alerts show as compact AlertBoxes.
- **Routes** (from `serving`, one entry per `routeId + directionLabel + headsign`): the **expanded** route is `?route=` if given, otherwise the one with the soonest upcoming departure. It shows today's route header row (RouteBadge sm with bus icon, `longName` 16sp, "NORTHBOUND to N SHEPHERD P&R" 16sp Bold caps, and a chevron that opens D9 at this stop). Then today's two tonal pills, **Full Schedule** (→ D7) and **Track Bus Stop** (below). Then the LiveStrip with up to 4 upcoming departures of that route. The other routes are **collapsed rows** (badge, headsign line, 2 TimeValues and a chevron). Tapping a collapsed row expands it (only one is expanded at a time) and updates `?route=` with `replace`.
- **Track Bus Stop (built, P1, module A with F0's notify):** a toggle pill (`aria-pressed`). On: it becomes "🔔 Tracking Route 40" and shows the caption **"Works while this screen is open."** (16sp variant) under the pills. When the expanded route's next upcoming departure is ≤ 5 min away (from the strip data and `useNow()`), it fires once: an in-app toast "Route 40 is 5 min away", `vibrate([200,100,200])`, and `notify()` (C.17, `showNotification` via the service worker) if permission is granted. The first time it is turned on, the F0 **NotifyPermissionCard** (`context: "stop-track"`) appears under the pills. Off when the rider leaves the screen. **If module A cannot finish it, it ships as a disabled tonal pill with `disabledReason` "Coming soon"; it is never a silently dead control.**
- **Legend** (the only place it appears), then **UpdatedAgo and the ScheduleCaption** on one wrapped line.
- **Map scene:** the stop centred above the sheet, `highlightStopId`, and today's white callout "Stop: **342**".
- **Data:**
  - `GET /api/stops/:id` once (stop, serving, arrivals(12), alerts, alertsSource, transitCenter), for the header, the routes list and the first paint of the collapsed rows.
  - **Expanded strip:** `GET /api/arrivals?stop=<id>&route=<expandedRouteId>&limit=4`, polled every 30s, re-keyed when the expanded route changes. This guarantees up to 4 departures for that route whatever the stop's other traffic.
  - **Collapsed rows:** one mixed `GET /api/arrivals?stop=<id>&limit=20`, polled every 30s; each collapsed row takes its route's first 2 upcoming departures (a route with none reads "No buses in the next 3 hours").
  - **Empty strip:** when the expanded route has no departure, fetch `GET /api/stops/:id/schedule?route=<id>` once and use `nextServiceFirst` for the strip `emptyText` ("No more trips today. Next bus Sat 5:12 AM"); if that call fails, "No buses in the next 3 hours".
  - Store a recent-stop entry on open (A is the writer of recent stops).
- **States:** loading (the title from the cached stops.json entry, if known, plus a strip skeleton "– – min"). 404 → ErrorState (`error.stop_not_found`: "We couldn't find stop #9999. Check the number on the stop sign.") with a (Search) button. **Late night / no service** → the empty strip above, and collapsed rows with "No buses in the next 3 hours". `realtimeSources` empty while the server has live keys (`/api/health.realtime`) → a caption above the strip, "Live times unavailable. Showing scheduled times." Offline → the single offline rule (clock times, scheduled styling).

### D7. Full Schedule (hourly grid, as today) — `/explore/stop/:stopId/schedule?route=<routeId>`
- A pushed page (AppBar "‹ Back"). Title "Full Schedule". The header block (fixes J3.6) is RouteBadge md + "NORTHBOUND to N SHEPHERD P&R", then "at Lamar St @ Main St (342)", then "Today, Fri Sep 25".
- Today's hourly grid: 56dp rows, each with an hour label ("7 PM", 18sp Medium) and minute values ("05  35", 18sp, tabular). Dividers use `--c-divider`. The current hour is highlighted with a `--c-card` row background and a "Now" tag. **Passed hours** (the whole service day is returned, from its start) are `--c-text-secondary`. It auto-scrolls to the current hour. Service after midnight (e.g. "12:40 AM") is listed at the end under the same service day, as on printed schedules.
- **Data:** `GET /api/stops/:id/schedule?route=<id>` (G.4 backend change 5): **all** of today's scheduled departures for that route at that stop, **from the start of the service day**, plus `nextServiceFirst`.
- **Empty:** "No Route 40 trips from this stop today. Next trip: Sat 5:12 AM." (from `nextServiceFirst`; omitted if null).

### D8. Walk to a stop — `/explore/stop/:stopId/walk?from=<lat,lon>&fromName=<text>&route=<id>&d=<m>`
```
┌──────────────────────────────────────────┐
│  map: you ◉ ····┐ dotted street path     │ #2A82E6 5dp dots
│                 └····▣342 (enlarged)     │
│╭────────────────────────────────────────╮│
││ ‹ Back          ────       Show list ▲ ││
││ Walk to Lamar St @ Main St (342)       ││ 20sp Bold <h1>
││ 2 min · 0.1 mi · north side of Lamar St││ 16sp
││ (about 3 min at an easy pace)          ││ 16sp variant
││ ┌────────────────────────────────────┐ ││
││ │[40] next bus: 16 min.              │ ││ 16sp, --c-card box
││ │You have time.                      │ ││ ok-text Bold
││ └────────────────────────────────────┘ ││
││ ↑  Head south on Main St       250 ft  ││ 56dp rows (steps
││ ↱  Turn right onto Lamar St    100 ft  ││  illustrative)
││ 🚏 Arrive at stop #342 on your right   ││
││ [[         I'm at the stop          ]] ││ primary
││      Open in Google Maps ↗             ││ text button
│╰────────────────────────────────────────╯│
```
- **Data:** `GET /api/walk?from=<?from or fix>&toStop=<id>` (OSRM; fields `source, warning, distanceM, geometry, steps[]` with the structured step fields of G.4 backend change 4), plus `GET /api/arrivals?stop=<id>&route=<?route>&limit=6` for the next-bus line.
- **Title:** "Walk to Lamar St @ Main St (342)". With `?fromName=` (D4): **"Walk from Houston Museum of Natural Science to Main St @ Remington Ln (688)"**, and the origin marker is the place pin, not the user dot.
- **Summary (one number, C.17):** minutes = `walkMinutes(distanceM, pace)`, where `distanceM` is the card's `?d=` until `/walk` answers with `source === "osrm"`, then OSRM's `distanceM` (shared through `useWalkDistance`, so the card, D6's pill and D8 agree). **`durationMin` / `relaxedDurationMin` are never shown.** The distance is `formatDistance(distanceM, lang)` (client). When pace is normal and `walkMinutes(d,"slower") − walkMinutes(d,"normal") ≥ 2`, add "(about N min at an easy pace)".
- **Next-bus line:** uses `?route=` if present, otherwise the soonest route at the stop. The verdict is **`canMakeIt(walkMin, dep, now)`** (C.17), the same helper as the card's tooSoon: yes → "**You have time.**" (`--c-ok-text`, Bold); tight → "**Hurry: it's close.**" (`--c-alert-text`); no → "**Leaves before you get there. The next one is in 46 min.**" (`--c-alert-text`, with the `warning` icon).
- **Steps:** 56dp rows, a 24dp maneuver icon (from `maneuver` + `modifier`), the 16sp sentence composed on the client with `t("walk.step." + maneuver + "." + modifier, { street })` (the server `instruction` is only the `en` fallback), and the distance `formatDistance(step.distanceM, lang)` right-aligned 16sp variant. Tapping a row zooms the map to that step's lat/lon.
- **Primary: "I'm at the stop"** → D6 for this stop (`replace`), which shows its live strip.
- **"Open in Google Maps ↗"** opens `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lon>&travelmode=walking` (plus `&origin=<lat>,<lon>` when `?from=` is set).
- **Map scene:** `legs=[{coords: geometry.coordinates, kind:"walk"}]`, an origin marker at `from`, the stop highlighted, fitted above the sheet.
- **States:** `source === "straight-line-estimate"`: a `--c-warn-bg` box "Street-by-street directions are unavailable. Distance is an estimate." (`t()` key; the server `warning` is the en fallback), a single step, and **Open in Google Maps promoted to the primary** (then "I'm at the stop" becomes tonal). No fix and no `?from=` → an EmptyState "Turn on location to get walking directions" with [[Turn on location]] and (Open in Google Maps ↗). While location is still being found (`granted-waiting`) → "Finding your location…" with a skeleton, not the EmptyState. Offline → "Walking directions need a connection." plus Google Maps.
- **Used for transit centers too:** D10's "Walk here" opens `/explore/stop/<platformStopId>/walk`. The title then reads "Walk to Northwest Transit Center, Platform 2 (79)".

### D9. Route page — `/explore/route/:routeId?dir=<0|1>&stop=<stopId>`
```
┌──────────────────────────────────────────┐
│ ‹ Back                        ( ☆ Save ) │ AppBar, --c-background
│ ┌────┐ Westheimer                        │ lg navy badge 56dp
│ │ 82 │ Bus route                         │ 22sp Bold / 16sp
│ └────┘                                   │
│ ⚠ Stop moved: Route 82 Westheimer:       │ AlertBox (compact)
│ eastbound stop at Westheimer Rd @ Kirby  │
│ Dr moved 150 ft east                   › │
│ ╭───────────────────┬──────────────────╮ │ SegmentedControl
│ │ ✓ Eastbound       │  Westbound       │ │ 56dp
│ │   to DOWNTOWN     │  to WEST OAKS    │ │ sub 14sp → 16sp
│ ╰───────────────────┴──────────────────╯ │
│ ╭ 🔍 Find a stop on this route         ╮ │ 48dp input
│ 101 stops · Next bus (scheduled) ──────▶ │ 14sp caption header
│ ○ Westheimer Rd @ Commonwealth St (2956) │ 56dp rows
│ │                                 5 min  │
│ ○ Westheimer Rd @ Montrose Blvd (2958)   │
│ │                                 7 min  │
│ ● Westheimer Rd @ Stanford St (2959)     │ near-you row
│ │ Nearest to you · 2 min walk            │ 16sp link-text
│ │████ 8 min  ·  15 min  ·  25 min ██████ │ LiveStrip (expanded)
│ │ ( Stop details › )  ( 🚶 Walk )         │ tonal pills
│ ○ Westheimer Rd @ Taft St (2961)   9 min │
│ …                                        │
│ PDF schedules on RideMETRO.org ↗         │ footer
└──────────────────────────────────────────┘
```
- **Data:** `GET /api/routes/:id` (directions with ordered `stops`, `shapePoints`, alerts, alertsSource). **`GET /api/routes/:id/next?dir=<d>`** (new, G.4: the next scheduled departure per stop from the local schedule, with no upstream calls) fills the right-hand column. **Live times are fetched only for the one expanded row:** `GET /api/arrivals?stop=<id>&route=<routeId>&limit=4`. `GET /api/vehicles?route=<id>` (P1) places 20dp navy bus glyphs on the spine between the two stops nearest each vehicle whose `directionLabel` matches. A 503 hides them silently and adds the caption "Live bus positions unavailable".
- **Header:** today's navy square badge and bold long name. **(☆ Save)** saves the route (it then appears in Recent › Saved routes). The AlertStatusLine (C.11). Opening the page calls `useRecents().addRoute(id)` (B is the writer of recent routes, C.17).
- **Direction:** SegmentedControl from `directions[]`: the label is `label` and the sub-line is "to `headsigns[0]`". It writes `?dir=` with `replace`.
- **Stop list:** today's timetable-spine look: a 2dp `--c-divider` spine, ring nodes (16dp), and rows of 56dp min with the stop name 16sp plus " (ID)" 16sp `--c-text-variant`, with the next scheduled time right-aligned in 16sp Medium (a TimeValue from `departureTime`, so it counts down; "–" when `next` is null). The status word appears once, in the column caption "Next bus (scheduled)", because this column is always schedule. **Tapping a row expands it** inline: a LiveStrip (live when available, with status words) plus (Stop details ›) → D6 `?route=` and (🚶 Walk) → D8. Only one row is expanded at a time, and expanding writes `?stop=` with `replace`.
- **Initial scroll:** if `?stop=` is set, scroll to it and expand it. Otherwise, with a fix, find the **nearest stop in this direction**, mark it "Nearest to you · N min walk", expand it, and scroll it to about 35% from the top so the stops just before and after it are visible. Without a fix, start at the top with nothing expanded.
- **Find a stop:** filters rows live by name or ID. The query is normalised (`&`/`and`/`@` treated the same). "No stops match 'xyz' on this direction." offers "Search the other direction" as a text button.
- **Footer:** "PDF schedules on RideMETRO.org ↗" (external).
- There is no map on this page. It is a pushed page with the bottom nav visible.
- **States:** 404 → the API message "Route 999 doesn't exist. Try the number shown on the bus sign." `next` loading → the right column shows "–". Arrivals error → the strip `emptyText` "Live times unavailable. Showing scheduled times." with the scheduled values.

### D10. Transit Center — `/explore/tc/:tcId?route=<routeId>`
```
┌──────────────────────────────────────────┐
│ ‹ Back                                   │ AppBar
│ Northwest Transit Center                 │ 22sp
│ 11 min walk · 0.5 mi · 16 bays           │ 16sp variant
│ ( 🚶 Walk here )                          │ tonal
│ Find your route                          │ 16sp Medium
│ [39][47][49][✓58][66][70][72]    More ›  │ ChipRow, numeric order
│ ┌────────────────────────────────────┐   │ --c-nav-bg banner
│ │ Route 58 leaves from Bay M         │   │ 20sp Bold
│ │ Platform 2 (stop #79)              │   │ 16sp
│ │ Next: 24 min · 84 min              │   │ 24sp Bold
│ └────────────────────────────────────┘   │
│ PLATFORM 1 · STOP #13170                 │ BayDiagram
│ [C][D][E][G][H][I]                        │
│ PLATFORM 2 · STOP #79                    │
│ [K][L][█M█][N][O][P][Q][R][S][T]          │ M highlighted
│ Diagram, not to scale                    │ 14sp
│ DEPARTURES BY BAY                        │ SectionHeader
│ BAY M · PLATFORM 2                       │ 16sp Medium caps
│ [58] WESTBOUND to WEST BELT              │
│      24 min · 84 min                     │
│ (other bays follow when no filter)       │
│ BAY NOT PUBLISHED                        │
│ [219] …                                  │
│ Updated 8 sec ago · Refresh              │
│ Source: METRO Transit Data API           │ 14sp
└──────────────────────────────────────────┘
```
- **Data:** `GET /api/transit-centers/:id` (`name, lat, lon, stopIds, bays[{bay, stopId, routes[], departures[] ≤4}], unassignedRoutes, unassignedDepartures, windowEnd, source, sourceNote?`). The server now fetches up to **200** departures per platform over 90 min (G.4 backend change 3) and returns `windowEnd` = the time of the last departure it considered. The walk time is `walkMinutes` of the `/nearby` TC `walkDistanceM` when known, else `estimateWalk(user, tc)`.
- **Route chips:** every route in `bays[].routes` (these carry `routeId`) plus `unassignedRoutes` (these are **short names** such as "219"; turn them into a `RouteRef` with `routeRefByName(name)` from `src/lib/routes.ts`, G.4, which looks up the cached `/data/routes.json`; a name with no match is dropped), deduplicated by id and sorted with `compareRouteNames`. With `?route=`: the chip is selected and the **banner "Route 58 leaves from Bay M"** shows. If the route uses 2+ bays (one per direction), one banner line per bay: "Northbound to SH 249: Bay G". The bay is highlighted in the diagram, and the list is filtered to the bays serving that route. Without `?route=`, all bays show in letter order, with no banner.
- **Departures by bay:** a group per bay (a 16sp caps header "BAY M · PLATFORM 2"), each a route row (badge sm, headsign line, 2 TimeValues). Departures only (never arrivals ending at the TC). A bay with no departures shows **"No departures before 8:40 PM"**, where the time is `windowEnd` (so the claim is exactly what the data covers; if `windowEnd` is missing it says "No departures listed yet"). The final group is **"BAY NOT PUBLISHED"** (unassigned departures) and appears when not empty.
- **Honesty:** `source === "hand-authored-demo"` → a `--c-warn-bg` note under the diagram: "Bay assignments are from METRO's printed map and may change." (`sourceNote` if present).
- **Walk here** → D8 for the platform stop that serves the selected route (or the first `stopId`).
- **States:** 404 → "No transit center called 'x'." Loading → the diagram skeleton and 3 row skeletons.
- **Navigation in:** the home TC card, D3's TC card, search (TRANSIT CENTERS row), a TC pin, and D6's "Part of … Transit Center" row.

### D11. Plan Your Trip + Select Itinerary — `/explore/plan?from=&fromName=&to=&toName=&time=&arriveBy=&sort=&edit=`
D11 has two layouts in one sheet: **Edit** (the familiar form, while a field is missing or `edit=1`) and **Results** (the form collapsed to one summary row, as soon as a plan returns).

**Edit layout** (today's form, kept):
```
│╭────────────────────────────────────────╮│
││ ‹ Back          ────       Show list ▲ ││ handle zone
││ Plan Your Trip                         ││ 22sp <h1>
││ ┌────────────────────────────────────┐ ││ from/to box --c-card r12
││ │ ●  My current location             │ ││ 18sp Medium, button
││ │ ↓  ─────────────────────  (⇅ Swap) │ ││ 48dp white pill, visible
││ │ 📍 Where to?                        │ ││   label "Swap"
││ └────────────────────────────────────┘ ││
││ [✓Now][In 15 min][In 30 min][In 1 hr]  ││ FilterChips 48dp, wrap
││ [Other time ▾]                         ││ opens the time sheet
││ [[           Plan My Trip           ]] ││ only with unsaved edits
│╰────────────────────────────────────────╯│
```
- The **"Leave at" row is dropped** (it duplicated the "Now" chip). The time chips are **Now / In 15 min / In 30 min / In 1 hr / Other time ▾**. "Other time ▾" opens a small sheet with a native `<input type="datetime-local">` and a "Leave at / Arrive by" SegmentedControl; once set, that chip reads "✓ Arrive by 8:30 PM ▾" (or "✓ Leave 8:30 PM ▾"). A chip change re-plans immediately.
- The swap control is a 48dp white pill **with the visible label "⇅ Swap"** (so L10 keeps a single icon-only control).

**Results layout** (after a plan returns: the sheet **opens at `full`**):
```
│╭────────────────────────────────────────╮│
││ ‹ Back          ────       Show map ▼  ││ 48
││ Select Itinerary                       ││ 22sp <h1>          40
││ ┌────────────────────────────────────┐ ││ summary row, button 64
││ │● My location → 📍 Hobby Airport     │ ││ 16sp Medium
││ │Leave now                     Edit ›│ ││ 16sp + text button
││ └────────────────────────────────────┘ ││
││ Arrive at bus stop #10567              ││ 16sp variant        22
││ [✓Fastest][Fewer transfers][Least wal…]││ sort chips          56
││ ┌────────────────────────────────────┐ ││ ItineraryCard
││ │🚶6 › [80] › 🚶2 › [73] › 🚶1  50 min│ ││ mode strip; 18sp Bold 44
││ │6:59 PM – 7:49 PM · 1 transfer      │ ││ 16sp                26
││ │ ────────────────────────────────── │ ││                      9
││ │Board [80] at #11424 · 7:05 PM      │ ││ 16sp (+ Live, Bay)  26
││ │⚠ Alert on this trip: Accessibility │ ││ alert-text 16sp
││ │Local fare $1.25 · Reduced fares ›  │ ││ fareLine(), local only
││ │                        Details ›   │ ││ text button
││ └────────────────────────────────────┘ ││
││ (card 2, card 3 …)                     ││
││ Times are scheduled unless marked Live ││ ScheduleCaption
││ Fares are estimates, to be confirmed   ││ 14sp caption
││ by METRO.                              ││
│╰────────────────────────────────────────╯│
```
- **F3 fold budget (full, Standard text):** handle 48 + title 40 + summary 64 + landmark note 22 + sort chips 56 = 230, then card 1 to its Board line: padding 12 + 44 + 26 + 9 + 26 = 117. **Total ≈ 347dp**, inside the full sheet at 412x800 (800 − 80 nav − 8 = 712) and at 360x640 (552). Rule **P1:** at `full` on both sizes, card 1's Board line ("Board [80] at #11424 · 7:05 PM") is visible without scrolling.
- **Summary row** (`--c-card`, radius 12, min 64dp, the whole row is a button with the a11y name "Edit trip: from my location to Hobby Airport, leave now"): "● `fromName` → 📍 `toName`" (16sp Medium, wraps), then the time phrase ("Leave now" / "Leave 8:30 PM" / "Arrive by 8:30 PM") and a trailing **"Edit ›"** text button. Tapping it sets `edit=1` (replace) and shows the Edit layout above the list.
- The card carries no stop name, side line or headsign: those are on My Itinerary (D12), one tap away. The detail screen keeps the full `"<dir> stop · <side>"` only where no route line is on the same row.
- **Fields:** tapping From or To opens Search in **pick mode**: `/explore/search?pick=to&returnTo=<this URL>`. B returns with `encodePick` (G.4 `src/lib/planQuery.ts`); C reads the URL with `parsePlanQuery`. A stop → `to=<stopId>`, a landmark → `to=landmark:<id>`, a place → `to=<lat,lon>&toName=`.
- **Defaults and auto-plan (Fast graft):** From = "My current location" (`from=<fix lat,lon>&fromName=My current location`). As soon as both ends are set, the plan runs and the Results layout opens at `full`. There is no separate "Plan My Trip" tap. **[[Plan My Trip]]** appears only in the Edit layout while a text field has unsaved edits, so the primary is either absent or single.
- **From-field location states** (C.17):
  - `fix` → "● My current location".
  - `unknown` / `prompt` / `granted-waiting` → "● **Finding your location…**" in `--c-text-variant` with a small progress ring. Neutral, never red. The To field and chips stay usable, and **the plan runs automatically the moment the fix arrives** (so a fast F3/F8 tap sequence still ends on the list).
  - `denied` / `unavailable` → "Location is off. Choose a starting point" in `--c-alert-text`; focus moves to it; no auto-plan; the Plan button is disabled with `disabledReason` "Choose a starting point first."
- **Plan Trip FAB entry:** `/explore/plan` with `to` empty → the To field shows "Where to?" and **opens pick mode immediately**, with the keyboard up.
- **Landmark snap note:** when `to=landmark:<id>` and that landmark has `stopIds`, show "Arrive at bus stop #<first stopId>". This is the J2.3 fix.
- **ItineraryCard** (the familiar card plus **one Board line**, so F3 needs no detail tap):
  - The mode strip: walk icon + minutes (`walkMinutes(leg.distanceM, pace)`, C.17), then `›` (as today), then RouteBadge sm with the leg duration under it (14sp). The right column holds `durationMin` "50 min" (18sp Bold).
  - Line: "6:59 PM – 7:49 PM · 1 transfer". If `hasTightTransfer`: "⚠ Tight transfer (2 min)" in `--c-alert-text`. In fixture mode: "6:59 PM – 7:49 PM · 1 transfer · **Sample times**".
  - **One Board line** from the first transit leg: "Board [route] at #`board.id` · `formatClock(departureTime)`", plus a StatusWord only if live/simulated and "Bay D" (BayTag) when `board.bay`. The stop name, side and headsign are on D12.
  - Alerts: alerts whose routes intersect the legs' routes or whose `stopIds` include any board/alight stop, with the alert kind in full: "⚠ Alert on this trip: Accessibility". Shown only when `source !== "unavailable"`; when alerts can't be checked the line reads "Alerts can't be checked right now" (16sp variant).
  - **Fare line** (`fareLine(itinerary)` in `src/lib/fares.ts`, F0): only when **every** transit leg is a local bus or METRORail route (not in `fares.json` `parkAndRideRoutes`), show "**Local fare $1.25 · Reduced fares ›**" (16sp, the price `--c-text`, the link `--c-link-text` → `/fares#reduced`). **With any Park & Ride leg the line is omitted** (the P&R fare depends on the zone). The price is never in the right column, so no card implies one price for a 65+ rider.
  - **Details ›** (text button) and a tap on the card → D12 `/explore/plan/<index>?<same query>`.
- **Peek state** (swipe down or Show map ▼ twice): `BottomSheet.peek` shows card 1 as one line, **"Hobby Airport · 50 min · 80 leaves 7:05 PM"** (the first bus, as "Leaves" means on the card), with a trailing tonal **( ▶ Start )** pill that starts card 1 directly (`useTrip().start(itineraries[0])` → `/explore/trip`), so Start can't be missed when the rider is looking at the map.
- **Sort chips** (v2.71's words): Fastest (API order, first arrival) / Fewer transfers (`transfers`, then `endTime`) / Least walking (`walkDistanceM`), applied client-side. The selection is in `?sort=`.
- **Data:** `GET /api/plan?from&to&time&arriveBy` → `PlanResponse`.
- **Offline-fixture mode** (`source === "offline-fixture"`; the recorded plan ignores the requested time): on receipt, C applies `shiftFixture(response, now)` (`src/screens/explore/plan/shiftFixture.ts`): `shiftMs = round((now − Date.parse(recordedAt)) / 60000) × 60000` is added to **every** timestamp in the response (itinerary start/end, every leg's start/end/departure/arrival, intermediate stop times), plus whole minutes when needed so card 1's first bus leaves at least `walkMinutes(walk to it, pace) + 3` min after now (so F8 ends on "You have time", not "Hurry"). Starting a sample trip later re-applies that rule to the started itinerary (`startableFixture`), so a sample trip never starts in the past. Every card shows "**Sample times**", and the sheet banner row shows the demo caption "Sample trips · times shifted to now (offline demo)". The shifted response is what gets stored in `useTrip().planned`.
- **States:** planning → "Finding trips…" plus 2 card skeletons. `itineraries.length === 0` → "No trips found for this time." (a `t()` string; the server `message` is shown under it only in `en`), with 3 tonal buttons: (Leave 30 min later) (Start from a nearby stop → pick mode for From) (Edit trip). Error → ErrorState [Try again].
- **Persistence:** on a successful plan, store `{query, response, chosen: null}` in `useTrip().planned`, and call `useRecents().addTrip(query)` (C is the writer of recent trips, C.17). Home shows the trip-planned banner (D2) until it is cleared or another plan is made.
- **Map scene:** fit origin + destination. With a list, draw the **first card's legs** (walk dotted, rides in route colour with a white casing), origin blue dot and destination red pin. Focusing a card redraws that card's legs.

### D12. My Itinerary (detail) — `/explore/plan/:index?<plan query>`
```
│ map framed on the whole trip above the   │
│ sheet; labelled pins "Board 80 · #11424",│
│ "Transfer · #4789", destination 📍        │
│╭────────────────────────────────────────╮│
││ ‹ Back          ────       Show list ▲ ││
││ My Itinerary                           ││ 22sp <h1>
││ Arrive 7:49 PM · 50 min                ││ 18sp Bold
││ ┌────────────────────────────────────┐ ││ StepList (scrolls)
││ │● My current location     6:59 PM   │ ││
││ │┆ Walk 6 min · 0.3 mi             › │ ││ → D8
││ │┆ to M L King Blvd @ UH University  │ ││
││ │┆ Dr (#11424), west side            │ ││
││ │█ BOARD [80] to MLK & PARK VILLAGE › │ ││ → D6 11424 ?route=080
││ │█ 7:05 PM · 26 stops                │ ││
││ │█ Get off at M L King Blvd @       ›│ ││ → D6 3938
││ │█ Bellfort (#3938)       7:25 PM    │ ││
││ │┆ Walk 2 min · 250 ft to Bellfort Av│ ││
││ │┆ @ M L King Blvd (#4789), south    │ ││
││ │┆ side · wait 9 min               › │ ││
││ │  …                                 │ ││
││ │⚠ Accessibility: Hobby Airport: use │ ││ AlertBox row
││ │  the ground-floor exit near baggage│ ││
││ │  claim to reach the bus curb     › │ ││
││ └────────────────────────────────────┘ ││
││ Local fare $1.25 · Reduced fares ›     ││ fare line (D11 rule)
││┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄││ sticky footer (C.6)
││ [[           ▶ Start trip           ]] ││ primary, ALWAYS visible
│╰────────────────────────────────────────╯│
```
- **▶ Start trip is a sticky footer** (`BottomSheet.footer`, C.6): 72dp (48dp button + 12dp padding above and below), pinned above the nav at `half` and `full`, outside the scroll area. The 15-row UH → Hobby StepList scrolls **behind** it; Start is never more than zero scrolls away. Rule **P2:** at 360x640 and 412x800, in half and full, "▶ Start trip" is fully visible on first render.
- **Data:** the stored `PlanResponse` from D11 (from memory or `useTrip().planned`, already fixture-shifted). A cold deep link re-runs `/api/plan` with the query (and `shiftFixture` in fixture mode) and picks `itineraries[index]`. If the index no longer exists: "This trip is no longer available. See current trips ›".
- **Wording** (J2.5/J3.8): "BOARD [80] to MLK & PARK VILLAGE" (the headsign as on the sign), "Get off at <name> (#id)". A transfer is its own walk/wait row: "Walk 2 min to <stop> (#id), <side> · wait 9 min", or "Transfer at the same stop · wait 2 min" when `transfer.sameStop`, with "Bay D" when `board.bay`. A tight transfer adds "⚠ Tight transfer" in `--c-alert-text`. Walk minutes use `walkMinutes(leg.distanceM, pace)`.
- **Every row is tappable** (C.13). Walk rows open D8 with `?from=<leg start lat,lon>&fromName=<leg start name>&d=<leg.distanceM>`. Alert rows come from the same intersection as D11.
- **▶ Start trip** → `useTrip().start(itinerary)` → `navigate("/explore/trip")`. There is **no "Keep this screen open" caption here** (it is said once, on D13).
- **Swipe down** → peek "My Itinerary · 50 min · ( ▶ Start )". It never discards.
- **Map scene:** all legs (walk geometry decoded from `geometry.polyline`; each ride in route colour with a 2dp white casing so consecutive bus legs are distinguishable), labelled markers for board/transfer/destination, fitted above the sheet.

### D13. Live trip — `/explore/trip`
```
┌──────────────────────────────────────────┐
│ ● Trip in progress · arrive 7:49 PM      │ 48dp #005DAA bar, white
│   map follows you; the next stop pin is  │
│   enlarged; live bus icon if available   │
│╭────────────────────────────────────────╮│
││ STEP 3 OF 7                 All steps ›││ 16sp Medium caps
││ Ride [80] to MLK & PARK VILLAGE        ││ 20sp Bold (aria-live)
││ Get off at M L King Blvd @ Bellfort    ││ 18sp
││ (#3938)                                ││
││████████████████████████████████████████││ LiveStrip variant
││█        5 stops left · about 7 min    █││ 30sp white
││████████████████████████████████████████││
││ Next stop: M L King Blvd @ Airport Blvd││ 16sp
││ ━━━━━━━━━━━━━━━━━━━●━━━━━━━  progress  ││ 6dp navy bar + text
││ Based on the schedule                  ││ 14sp caption
││ ┌────────────────────────────────────┐ ││ NotifyPermissionCard
││ │Want a buzz before your stop?       │ ││   (F0, first trip
││ │( Turn on alerts )    Not now       │ ││   only)
││ └────────────────────────────────────┘ ││
││ ( ‹ Previous step )  ( Next step › )   ││ tonal 48dp
││ Keep this screen open during your trip.││ 14sp caption (only here)
││           End trip                     ││ danger-text
│╰────────────────────────────────────────╯│
```
- **Steps** come from the itinerary's legs (`src/features/trip/steps.ts`): Walk to the board stop → Wait at the board stop → Ride → (Walk to the transfer stop → Wait) → Ride → Final walk → Arrived. A walk under 5 m (the planner's 0 m last walk when a trip ends at a stop) is no step, no D12 row and no 🚶 in the mode strip, so UH → Hobby Airport has 6 steps. Each step card:
  - **Walk:** "Walk 6 min to M L King Blvd @ UH University Dr (#11424)" / "On the west side of M L King Blvd" / the next-bus line "Your 80 leaves at 7:05 PM · You have time" (the verdict is `canMakeIt`, C.17, the same helper as D8 and the cards) / (Walking directions ›) → D8.
  - **Wait:** "Wait at stop #11424, west side" / the LiveStrip for that route at that stop (`/api/arrivals?stop&route&limit=4`) / "Board the bus marked **MLK & PARK VILLAGE**".
  - **Ride:** as drawn. Stops left = the count of stops from the vehicle's current position to the alight stop, using `useTripStops(tripId, board.id)` → `GET /api/trips/:tripId?fromStop=<board.id>` (stops with lat/lon and `scheduledTime`). **Time alignment:** `/trips` re-bases stop times onto today's service day, which need not match the itinerary (always in fixture mode, sometimes with delays). So `progress.ts` computes `offset = leg.startTime − tripStops[board].scheduledTime` and adds it to every trip stop time before use; stop **order and count** come from `/trips`, **times** from the itinerary. The position is taken from **(1)** the GPS fix: the nearest trip stop within 150m, only moving forward. If there is no usable fix, from **(2)** the clock: the last stop whose aligned time has passed (not in fixture mode, see below). The caption says which: "Based on your location" or "Based on the schedule".
  - **Final walk:** "Walk 1 min to Hobby Airport" plus the steps from `/api/walk` (J3.7).
  - **Arrived:** "You've arrived at Hobby Airport" plus [[Done]], which ends the trip.
- **Get-off warnings** (J3.2), by stops left rather than metres: at **2 stops left**, the amber card (`--c-warn-bg`, 2dp `--c-warn-border`, 20sp Bold `--c-warn-text`) reads "**Get ready: 2 stops to M L King Blvd @ Bellfort (#3938)**", with `vibrate([200,100,200])`. At **1 stop left**: "**Get off at the next stop: M L King Blvd @ Bellfort (#3938)**", with a vibration and, if permission was granted, **`notify()` from `src/lib/notify.ts`**, i.e. `navigator.serviceWorker.ready.then(r => r.showNotification(…))` (never `new Notification()`, which throws on Android Chrome). Each warning fires once per step. The warning cards are `aria-live="polite"`.
- **Auto-advance:** Walk → Wait when within 40m of the board stop. Wait → Ride when the GPS moves more than 150m along the trip, or (live/schedule mode only) the aligned departure time is 1 min past. Ride → next when the alight stop is passed. **In offline-fixture mode (`planned.response.source === "offline-fixture"`), all clock-based advancing and clock-based stop counting are off**: only GPS and the manual buttons move the trip, and the caption reads "Sample trip: use Next step to move along". **Manual controls always work:** (‹ Previous step) and (Next step ›). The emulator demo with a static GPS uses these.
- **Notifications:** asked **only** through the F0 NotifyPermissionCard (`context: "trip"`), the first time a trip is started. (Turn on alerts) → `requestNotify()`. "Not now" hides the card and shows the caption "Alerts will show on this screen only." It never blocks the trip.
- **Honest limits:** a Wake Lock (`navigator.wakeLock.request("screen")`) is held while this screen is visible and re-acquired on `visibilitychange`. The caption "Keep this screen open during your trip." appears **here only**. On return to visible after more than 30s: the toast "Tracking resumed · step 3 of 7" and an immediate recompute. There is no claim of background tracking anywhere.
- **All steps ›** → a full-height sheet with the D12 StepList, the current step marked "You are here", and at its top a tonal **( ↻ Plan again from here )** button: it navigates to `/explore/plan?from=<fix lat,lon>&fromName=My current location&to=<trip to>&toName=<trip toName>` (a new plan; the active trip stays until the rider starts another or ends it). With no fix it is disabled with `disabledReason` "Needs your location. Turn it on in More › Settings." (J3.4)
- **End trip** → Dialog "End this trip?" with [Keep going] [End trip]. Ending clears `active`, keeps `planned` (so it can be restarted), and goes to `/explore`.
- **Persistence:** `active = {itinerary, query, stepIndex, startedAt}` in localStorage. Reopening the app while a trip is active shows the trip-active banner in the overlay slot on every Explore screen, and the layout swaps the Plan Trip FAB for "My trip" (C.9).
- **Degradation:** `/api/vehicles` 503 or no match → no bus icon, schedule-based progress. `/api/trips` error → progress from the leg's `numStops` and times only. It always shows something, never an error screen.
- **Map scene:** follow the user when there is a fix (otherwise the current leg's geometry). The next stop is highlighted, and the vehicle is shown when it is matched by `tripId`.
- **Chrome:** `useExploreChrome({ hideSearchBar: true, banner: null })`; the trip bar replaces the search bar.

### D14. Service Alerts list — `/more/alerts?route=<routeId>&filter=mine|all`
```
┌──────────────────────────────────────────┐
│ ‹ Back                                   │
│ Service Alerts                           │ 22sp
│ [✓ My routes] [ All routes ]             │ FilterChips
│ ┌──────────────────────────────────────┐ │ AlertBox (full)
│ │⚠ [82] Stop moved                     │ │
│ │ Route 82 Westheimer: eastbound stop  │ │
│ │ at Westheimer Rd @ Kirby Dr moved    │ │
│ │ 150 ft east                  [Demo] ›│ │
│ └──────────────────────────────────────┘ │
│ ✓ No alerts for your other routes:       │ ok-text 16sp (live feed only)
│   40, 41                                 │
│ Source: METRO · Updated 1 min ago        │ 14sp
└──────────────────────────────────────────┘
```
- **Data:** `GET /api/alerts` (the store, G.4) → `{source, sourceNote?, alerts[]}`. "My routes" = the routes of saved stops, saved routes, and routes in the last nearby payload. With `?route=`, the list is filtered to that route and the title is "Alerts for Route 82".
- Each item shows its route badges, the effect word, `header[lang]` (with a fallback to `en` plus "Available in English only" in 14sp), active dates ("Until Oct 3" / "Ongoing"), and a Demo tag when `source === "demo"`.
- The footer reads `source === "demo"` → "Demo alerts only (offline demo). These are not real METRO alerts.", otherwise "Source: METRO".
- **States** (by `useAlerts()`): `status === "error"` or `source === "unavailable"` → AlertsUnknownLine as the whole body (never a "No alerts" line). `source === "demo"` → the demo items with their Demo tags, the warn caption "Demo alerts only", and **no** "✓ No alerts for …" lines at all. `source === "metro"`: empty (the "My routes" filter) → "✓ No alerts for your routes: 40, 41, 82"; empty (all) → "✓ No active METRO alerts right now"; the "No alerts for your other routes" line appears only in this case.

### D15. Alert detail — `/more/alerts/:alertId`
- AppBar "‹ Back". The effect word (20sp Bold `--c-alert-text` with the icon), the header 18sp Bold, "From Sep 25, 5:00 AM until Oct 3" (or "Ongoing"), the full `description[lang]` in 16sp, then **AFFECTED ROUTES** (chips → D9) and **AFFECTED STOPS** (ListRows "Scott St @ Griggs Rd (9976)" → D6).
- Unknown id → "This alert has ended or no longer exists." (Service Alerts ›).

### D16. Recent — `/recent`
```
┌──────────────────────────────────────────┐
│ Recent                            Clear  │ 22sp; "Clear" text btn
│ ★ SAVED STOPS                      Edit  │ SectionHeader + action
│ ★ Westheimer Rd @ Montrose Blvd (2958) › │ SavedStopRow (live)
│   [82] EASTBOUND to DOWNTOWN             │
│        7 min · 15 min                    │
│ ★ SAVED ROUTES                           │
│ [82] [40]                                │ badges md
│ RECENTLY VIEWED ROUTES                   │ (as today)
│ [58] [85]                                │
│ RECENTLY VIEWED STOPS                    │
│ 🚏 Lamar St @ Main St (342)            › │ ListRow 56dp
│    Westbound stop · Routes 40, 41        │
│ RECENT TRIPS                             │
│ ● → 📍 Hobby Airport          Plan again │ text btn → D11
└──────────────────────────────────────────┘
```
- The nav label stays **Recent**. SAVED is the first section (it is not renamed "My Stops").
- **Edit mode** (Saved): each row gets **↑ Move up / ↓ Move down / Remove** text buttons (48dp; no drag needed). Remove → the toast "Removed Westheimer Rd @ Montrose Blvd. **Undo**" (10s). "Done" leaves edit mode.
- **Clear** → Dialog "Clear recent history? Saved stops and routes stay." [Cancel] [Clear]. It clears only the RECENT sections.
- **Data:** saved stop rows use `GET /api/arrivals?stop=<id>&limit=6` each, for all saved stops (up to 10), with `preferredRouteId` first (C.5b). Recents are local; D16 only reads and clears them (writers: C.17). Recently viewed stops use `sideLine(stop, { withCompass: true })` ("Westbound stop · North side of Lamar St"), since those rows show no route line.
- **Empty:** Saved → "Tap ☆ Save on any stop to see its next buses here and at the top of Explore." All empty → an EmptyState "Stops and routes you look at will appear here."

### D17. Fares (stub plus real info) — `/fares`
```
┌──────────────────────────────────────────┐
│ Fares                                    │ 22sp
│ ┌──────────────────────────────────────┐ │ --c-card
│ │ 🎫 My ticket                          │ │ 18sp Bold
│ │ Sign in with your RideMETRO account  │ │ 16sp
│ │ to show your ticket.                 │ │
│ │ [[   Sign in to show ticket     ]]   │ │ primary
│ │ Handoff to METRO: sign-in and        │ │ 14sp caption
│ │ payment are not part of this         │ │
│ │ prototype.                           │ │
│ └──────────────────────────────────────┘ │
│ FARES  · To be confirmed by METRO        │ SectionHeader + BayTag-style
│ Local bus and METRORail          $1.25   │ ListRows 56dp
│ Day pass                         $3.00   │
│ Park & Ride (by zone)      $2.00–$4.50   │
│ Transfers        Free within 3 hours     │
│ REDUCED FARES · To be confirmed by METRO │
│ Seniors 65–69, students, riders          │
│ with disabilities, Medicare      $0.60   │
│ Seniors 70 and older              Free   │
│ How to get a reduced fare card        ↗  │ external
│ Where to buy a fare card              ↗  │ external
└──────────────────────────────────────────┘
```
- **Sign in to show ticket** → Dialog "**Handoff to METRO**" / "Sign-in, tickets and payment are handled by METRO's secure system. In the real app, this button opens METRO's sign-in." [OK]. **No credential fields and no QR code, ever.**
- **Data:** `src/data/fares.json` (F0 creates it, D owns the screen): `{ "confirmedByMetro": false, "asOf": "2026-09-25", "items": [{ "key": "local", "label": {"en","es"}, "value": {"en","es"} }...], "reduced": [...], "parkAndRideRoutes": ["201", "202", …] }`. `parkAndRideRoutes` is generated by F0 from `routes.json` (long name containing "P&R" or "Park & Ride", or number 200–299) and is used only by `fareLine()` (D11). The REDUCED FARES section has the anchor `#reduced`. The UI shows "To be confirmed by METRO" beside every section header while `confirmedByMetro` is false. The code comment at the top of the file says the same.
- External links: `https://www.ridemetro.org/fares` and `https://www.ridemetro.org/fares/reduced-fares` (to be verified by METRO; the labels carry ↗).

### D18. More — `/more`
```
┌──────────────────────────────────────────┐
│               [METRO]                    │
│ RIDER RESOURCES                          │ blue caps 16sp
│ Route Schedules                        › │ → D20
│ Service Alerts                         › │ → D14 (in-app now)
│ Fares                                  › │ → D17
│ Learn How to Ride                      ↗ │
│ RideMETRO.org                          ↗ │
│ ──────────────────────────────────────── │
│ SETTINGS                                 │
│ Language                      English  › │ → D19
│ Text size                    Standard  › │
│ Walking pace                   Normal  › │
│ Location                           On  › │
│ Notifications                     Off  › │
│ Show welcome again                     › │
│ ──────────────────────────────────────── │
│ CONTACT US                               │
│ Customer Service · 713-635-4000        ↗ │ tel:
│ ──────────────────────────────────────── │
│ About this prototype and data          › │ → D21
└──────────────────────────────────────────┘
```

### D19. Settings — `/more/settings#<section>`
- One page with radio groups (no sub-screens). Each group has a 16sp Medium header and 56dp radio rows:
  - **Language:** English, Español, then Tiếng Việt, 中文 and العربية as **disabled rows labelled "Coming soon"**. Changing it re-renders the app immediately and sets `<html lang>` ("en" / "es").
  - **Text size:** Standard / Large / Extra large, with a live preview NearbyStopCard (static sample data: stop 342) under the group.
  - **Walking pace:** Normal (about 3 mph) / Slower (about 2 mph). It affects walk minutes everywhere and "Leaves before you get there".
  - **Location:** the status ("On", "Blocked in browser settings", "Not asked yet") with [Turn on location] or the Chrome steps text.
  - **Notifications:** the status plus "Used only during a trip, to warn you before your stop."
  - **Show welcome again** → sets `welcomed=false` and navigates to `/welcome`.
- The More rows deep-link to `#language`, `#text-size`, and so on.

### D20. Route Schedules list — `/more/routes`
- AppBar "Route Schedules". A "Find a route" input (48dp), then all routes from `/data/routes.json`, sorted numerically with rail first: a ListRow with a RouteBadge sm, the name ("82 Westheimer") and a chevron → D9.

### D21. About this prototype — `/more/about`
- Plain text: data sources (METRO GTFS feed version from `/api/health.feedVersion`, the METRO Transit Data API, the GTFS-RT alerts, OpenFreeMap/OpenStreetMap tiles, OSRM walking, the Transitous trip planner), the realtime status from `/api/health.realtime` ("Live times: on / off / simulated"), and "Login, tickets and payments are a handoff to METRO and are not part of this prototype." Version.

### D22. Global states
| Situation | Behaviour |
|---|---|
| Offline (`navigator.onLine === false` or fetch TypeError) | The offline banner in the overlay slot. Every time renders as a scheduled clock time (the single offline rule, D conventions). TanStack Query serves the cache (persisted to IndexedDB via `@tanstack/query-async-storage-persister` + `idb-keyval`, max 24h). The service worker (vite-plugin-pwa, Workbox) precaches the app shell, fonts, icons, `stops.json` and `routes.json`, and runtime-caches map tiles (CacheFirst, 7 days, max 2,000). |
| API 5xx / network error | ErrorState in the affected block only. The rest of the screen stays usable. It is never a modal with only "OK". |
| Live source down | The times show as scheduled (unmarked; the API already labels them). If `/api/health.realtime` says live should be on but a response has `realtimeSources: []`, a caption reads "Live times unavailable. Showing scheduled times." |
| Vehicle age > 120s (`ageSeconds`) | The bus icon is drawn grey with the label "Last seen 3 min ago". |
| Unknown URL | "We couldn't find that page." [[Go to Explore]]. |
| Install prompt | Never shown automatically. More › About has an "Add to home screen" row when `beforeinstallprompt` has fired. |

---

## E. Flows F1–F11: acceptance tests

**Counting rules (same as the baseline):** 1 action = one tap, one typed field (however many characters), one swipe, one back press, or one system dialog. **A scroll or swipe to reach a control counts as an action.** The start is a cold launch of an onboarded app at the scenario GPS (except F10). The scenario GPS positions and preconditions are the baseline's (`docs/baseline-flows.json`). For emulator runs, set the fix with `adb emu geo fix <lon> <lat>`, or use the `?demoLoc=` override (C.17) for headless screenshots.

**How to run (two capture sets):**
- **Set S (scheduled, the step-count run):** `OFFLINE=1 DEMO_REALTIME=0 npm run dev` (G.1), at 360x640 and 412x800, Standard text. Each test passes only if the "Visible at the end" column is literally on screen without scrolling (at 412x800), and nothing else was needed. Times here are scheduled, so they carry no status word.
- **Set L (live demo, the look run):** `OFFLINE=1 DEMO_REALTIME=1 npm run dev`, same sizes. Captures at least **D2 home, D3 (F1 end), D6 (stop 342, strip with green Live arcs), D12 and D13 (ride step)**, saved as `ux-audit/redesign/live/<screen>.png`. Every simulated time reads **"Live (demo)"** with the arcs, on every screen (this relies on `source` in `/nearby` departures, G.4 backend change 2), and the demo caption is visible. Step counts are identical to Set S.

| Flow | Scenario / precondition | Exact path from launch | Actions | Visible at the end (real data) | Target |
|---|---|---|---|---|---|
| **F10** First launch → usable map | Storage cleared. GPS 29.7563,-95.3639 | 1. Tap **Show stops near me** (Welcome). 2. Tap **Allow** in the Chrome location dialog. | **2** | Explore with the map strip (≥ 180dp at 412x800; no overlays, no coach marks) and the half sheet "Nearby stops", chip label "Your route? Tap it:", first card "Fannin St @ McKinney St (246) · On the west side of Fannin St · 🚶 1 min · [137] WESTBOUND to DOWNTOWN". **QA asserts the tooSoon rendering:** the due 137 time is its clock time in `--c-text-secondary` followed by "Leaves before you get there" (walk 1 min > time left), and the second 137 time ("15 min") renders normally. If the fix is still pending after step 2, the sheet reads "Finding stops near you…" (neutral) and fills in place with no extra action. | ≤ 3 ✅ |
| **F1** Nearest stop for Route 40 northbound + next bus | GPS 29.7563,-95.3639 | 1. Tap chip **[40]** (the 3rd chip under "Your route? Tap it:"). | **1** | D3 "Route 40 near you", card "[40] NORTHBOUND to N SHEPHERD P&R · **Lamar St @ Main St (342)** · 🚶 2 min · On the north side of Lamar St · **16 min** · 46 min". Both direction cards are visible (no TC serves route 40 within 1km; Downtown TC at 972m has no route 40 bay). The 342 stop comes from `/api/routes/040` directions, not from `/nearby`'s rank. | ≤ 1 ✅ |
| **F2** Next 82 at my stop 2958 | GPS 29.7440,-95.3900. Precondition: stop 2958 saved once from D6 with Route 82 expanded (`preferredRouteId: "082"`). | (none) | **0** | The home half sheet's SavedStopRow: "★ **Westheimer Rd @ Montrose Blvd (2958)** · [82] EASTBOUND to DOWNTOWN · **7 min** · 15 min", visible at 360x640 and 412x800 even before the location fix arrives. | 0 ✅ |
| **F3** UH → Hobby, know exactly where to board | GPS 29.7199,-95.3422 | 1. Tap the search bar. 2. Type "hobby". 3. Tap **Directions** on the "Hobby Airport" place row. | **3** | D11 Results layout at `full`: summary "● My location → 📍 Hobby Airport · Leave now · Edit ›", then card 1: "🚶6 › [80] › 🚶2 › [73] › 🚶1 · 50 min", "**Board [80] at #11424 · 7:05 PM**" (stop name, side and headsign on D12) (in Set S, offline fixture: times shifted to now and labelled "Sample times"). Rule P1: all of this is above the fold at 360x640 and 412x800. | ≤ 4 ✅ |
| **F4** Walking directions to stop 342 | GPS 29.7563,-95.3639 | 1. Tap the map pin labelled **342** (labels show at the default zoom 16; M4 keeps it inside the map strip). 2. Tap **🚶 Walk here · 2 min**. *Equivalent:* 1. chip [40], 2. the "🚶 2 min" button on the NORTHBOUND card. | **2** | D8 "Walk to Lamar St @ Main St (342)", a street-routed dotted path on the map, "2 min · <distance> · north side of Lamar St" (the same minutes as the pill/card, one formula), steps in ft, "[40] next bus: 16 min. You have time." | ≤ 2 ✅ |
| **F5** Route 82 → its stops → live EB arrivals at Westheimer @ Montrose | GPS 29.7440,-95.3900 | 1. Tap the search bar. 2. Type "82". 3. Tap the **Eastbound** pill on "82 Westheimer". 4. Tap the row **Westheimer Rd @ Montrose Blvd (2958)**, which is visible directly above the auto-expanded "Nearest to you" row 2959 Westheimer Rd @ Stanford St. | **4** | D9 Eastbound, 101 stops in order, with row 2958 expanded: the LiveStrip "7 min · 15 min · 25 min" (Live words in Set L), (Stop details ›), (🚶 Walk). **Shortcut from anywhere:** 1. search bar, 2. type "82 montrose", 3. tap "Westheimer Rd @ Montrose Blvd (2958) · Eastbound" = **3**. | ≤ 4 ✅ |
| **F6** Is there an alert on Route 82? | any | 1. Tap the search bar. 2. Type "82". | **2** | The route row "82 Westheimer" with the AlertStatusLine "⚠ Stop moved: Route 82 Westheimer: eastbound stop at Westheimer Rd @ Kirby Dr moved 150 ft east [Demo]", with the full header text (AlertBox headers are never truncated, C.11). With the live feed and no alert: "✓ No alerts for Route 82". With the live feed down: "Alerts can't be checked right now". Optional 3rd tap → D15 full text. | ≤ 2 ✅ |
| **F7** Northwest TC: bay for Route 58 + next departure | GPS 29.7890,-95.4560 (the NWTC bays are 613–662m away, so the TC comes from `nearby.transitCenters`, G.4) | 1. Tap chip **[58]** (the 1st chip: nearest walk, then numeric order 58, 66, 85, 89). | **1** | D3 "Route 58 near you" with the **TC card in the first two** (D3 order rule: earliest catchable bus first, the TC card never below second): "[58] WESTBOUND to WEST BELT · Northwest Transit Center · **Bay M** · Platform 2 (stop #79) · **24 min** · 🚶 11 min", then the street-stop cards (8249 N Post Oak Rd @ Post Oak Green Ln …). *Alternative (2):* 1. tap the Northwest Transit Center card, 2. chip [58] → banner "**Route 58 leaves from Bay M** · Next: 24 min", grouped by bay. | ≤ 2 ✅ |
| **F8** Start live trip tracking | GPS 29.7199,-95.3422 | 1. Tap the search bar. 2. Type "hobby". 3. Tap **Directions**. 4. Tap itinerary card 1. 5. Tap **▶ Start trip** (sticky footer, visible without scrolling, rule P2). | **5** | D13 "● Trip in progress · arrive 7:49 PM", "STEP 1 OF 7 · Walk 6 min to M L King Blvd @ UH University Dr (#11424) · On the west side of M L King Blvd · Your 80 leaves at 7:05 PM · You have time". The notification ask is an in-app card, not an OS dialog, so it adds 0. *Faster variant (4):* after step 3, Show map ▼ twice is 2 more actions, so the peek "( ▶ Start )" is not shorter; it exists for riders who are already looking at the map. | ≤ 5 ✅ |
| **F9** Ticket / fare screen | any | 1. Tap **Fares**. | **1** | "My ticket" with [[Sign in to show ticket]] (Handoff to METRO) and the fare table including REDUCED FARES, flagged "To be confirmed by METRO". | 1 ✅ |
| **F11** Landmark (HMNS) → closest stop → next arrivals | GPS 29.7500,-95.3600 | 1. Tap the search bar. 2. Type "museum of natural science" (or "hmns"). 3. Tap **Stops near** on "Houston Museum of Natural Science". | **3** | D4 "Stops near Houston Museum of Natural Science", sorted by walk time from the museum: "**Main St @ Remington Ln (688)** · On the east side of Main St · 🚶 4 min walk from the museum · [56] NORTHBOUND to GREENSPOINT TC · 11 min", then 2504, 25015 and 25016, each with their routes. Before step 3, the result row already shows "Closest stop: Main St @ Remington Ln (688) · Northbound". | ≤ 3 ✅ |

**Final step-count table**

| Flow | Baseline (expert) | Target | This spec | Notes |
|---|---|---|---|---|
| F10 | 14 | ≤ 3 | **2** | One welcome screen plus the location dialog |
| F1 | 2 (first-timer 4) | ≤ 1 | **1** | [40] is the 3rd chip under a visible label; stop from the route's own stop list |
| F2 | 3 | 0 | **0** | Saved row (preferred route first), never waits on location |
| F3 | 10 | ≤ 4 | **3** | Form collapses to a summary row; list opens at full; boarding block above the fold |
| F4 | impossible | ≤ 2 | **2** | ID-labelled pin → Walk here (or chip → walk button) |
| F5 | 9 (18) | ≤ 4 | **4** | 3 with the "82 montrose" shortcut from anywhere |
| F6 | 6, partial | ≤ 2 | **2** | Alert line on the route search result; honest in all 3 feed states |
| F7 | 2 (14) | ≤ 2 | **1** | TC card is never below second in D3 when a TC serves the route; 2 via the TC view |
| F8 | 9, partial | ≤ 5 | **5** | Start trip is a sticky footer: no scroll needed |
| F9 | 1 (wall) | 1 | **1** | Stub plus a real fare table |
| F11 | 6, partial | ≤ 3 | **3** | Inline "Closest stop" before the tap |

**Honesty notes (these must stay true in the build):** F1 = 1 depends on the chip sort in D2 item 4 (built from `stop.routes`, so it survives late night) and on the 4 chips that fit at 360dp. F4 = 2 via the pin depends on ID labels at zoom 16 with distance-sorted collisions and on rule M4. If a label is hidden by collision, the equivalent chip path is still 2. F5 = 4 relies on 2958 being adjacent to the nearest-EB stop 2959 (sequence 84 and 85 of 101). From elsewhere the route-page path costs 6 (focus Find + type + tap), and that is why the "82 montrose" shortcut exists. F7 = 1 depends on the `/nearby` TC addition and the D3 rule that keeps the TC card in the first two. Without the TC addition, F7 = 3 via search. F8 has no slack: the notification ask must never be an OS dialog on Start, and Start must stay in the sticky footer (rule P2). F3/F8 tapped before the fix arrives still end on the list, because D11 auto-plans when the fix lands (no extra action).

---

## F. Visual acceptance rubric (for the judges and the QA agent)

Screenshots are taken at **360x640 and 412x800, Standard text**, plus **360x640 at Extra large (x1.3)** for the legibility checks, in both capture sets (E: Set S scheduled, Set L live demo). Each line is pass/fail.

### F.1 "Concise and visually simple": measurable limits
| # | Rule | Limit |
|---|---|---|
| S1 | Filled primary buttons per screen state | **≤ 1** (0 is fine) |
| S2 | Distinct font sizes on one screen | **≤ 6** (from the B.2 scale only) |
| S3 | Colours on one screen | Only B.1 tokens. At most **one status accent** family per card (live green, alert red, warn amber) plus brand blue. |
| S4 | Home half sheet, top to bottom | ≤ 5 blocks: title row (with UpdatedAgo), (1 banner), labelled chip row, ≤ 1 saved row, cards |
| S4b | Home map strip (rule M1) | ≥ 180dp at 412x800, ≥ 120dp at 360x640, in half, with or without a saved row |
| S4c | Repeated words | The word "Scheduled" never appears next to a time (it is the unmarked default); one ScheduleCaption per sheet/page; the Legend only on D6; "Keep this screen open" only on D13 |
| S5 | Route rows per NearbyStopCard | ≤ 3 plus "+N more" |
| S6 | Times per route row | ≤ 2 in cards, ≤ 4 in a LiveStrip |
| S7 | Lines of text per card before the first time | ≤ 4 |
| S8 | Tonal action pills in one row | ≤ 2 (a third wraps to its own row) |
| S9 | Banners visible at once | ≤ 1 in the map overlay slot and ≤ 1 in the sheet banner row (C.12 priority) |
| S10 | Overlays at launch | 0 coach marks, 0 tips, 0 unrequested dialogs |
| S11 | Choice dialogs in core flows | 0. Dialogs only confirm Clear, End trip and the METRO handoff. |
| S12 | Map chrome over the map | The search bar, ≤ 3 FABs and the attribution. No left chip rail and no radius circle. |

### F.2 Legibility (older riders)
| # | Rule | Check |
|---|---|---|
| L1 | Text that carries information (stop names, IDs, directions, sides, headsigns, times, status words, instructions, alert text, buttons) | **≥ 16px** at Standard |
| L2 | Next-arrival minutes in cards | **24px Bold**. Strip digits 30px. |
| L3 | Only timestamps, source notes, nav labels and diagram captions may be 14px | Grep the CSS: no `font-size` below `--fs-caption` |
| L4 | ALL-CAPS text | only at ≥ 16px |
| L5 | At 360x640 Extra large | No truncated stop name, ID or headsign (they wrap). No horizontal page scroll. No overlapped text. |
| L6 | Contrast of text | **≥ 4.5:1** (the B.1 comments give the ratios). `#00BB1F`, `#FF3B2F`, `#2A82E6` and `#EF0000` never colour text. |
| L7 | Contrast of state and UI boundaries (selected chip, input border, segment) | ≥ 3:1 (a 2dp primary border, or `--c-outline-strong`) |
| L8 | Touch targets | ≥ 48x48dp, ≥ 8dp apart (checked with the DevTools overlay) |
| L9 | Colour alone | Every non-default time state has a word (Live + arcs icon, Live (demo), Canceled + strikethrough, "Leaves before you get there"); a plain time is scheduled, stated by the ScheduleCaption. Selected states have a check or border. Alerts have an icon and a word. |
| L10 | Icon-only controls | Exactly one: the Locate FAB (with `aria-label`). The planner's swap control has the visible label "⇅ Swap". |
| L11 | Focus | A visible 3px ring on every control with keyboard or switch access |
| L12 | Motion | Sheet animation ≤ 240ms, none under reduced motion. Numbers never animate. |
| L13 | Screen reader | On each navigation, focus lands on the screen's `<h1>` and `document.title` changes. The map canvas is `aria-hidden`. No live region except the D13 step headline and get-off warnings (and toasts), so 30s polling is silent. |
| L14 | Stale times | With the network cut for 5 min, no relative time ("16 min") remains on screen: offline times are clock times, and a departure more than 1 min past disappears. Between polls, relative times count down on the 15s tick. |

### F.3 Familiarity checklist (a long-time rider recognises it)
- [ ] Bottom nav **Explore | Fares | Recent | More**, same icons and order, `#E4EBF6` bar, `#2976C7` active pill.
- [ ] White pill search bar, METRO mark, placeholder "Place, Stop, or Route".
- [ ] White rounded-square FAB column on the right, including the dotted-path planner icon (now labelled "Plan Trip").
- [ ] Route chips everywhere with the 7dp navy top band (rail red) and a black number.
- [ ] Stop sheet: **centred bold "Name (ID)"**, route header row with "NORTHBOUND to …", Full Schedule / Track Bus Stop pills, **blue `#005DAA` strip with big white minutes**, the Scheduled / Live / Canceled legend.
- [ ] Plan Your Trip form: blue dot, arrow, red pin, swap control, Now / In 15 min / In 30 min / In 1 hr (plus "Other time ▾").
- [ ] "Select Itinerary" cards with the mode strip and right-aligned duration (the fare is now its own line, local itineraries only). "My Itinerary" timeline with coloured leg lines and dotted walks.
- [ ] More list with blue caps headers and › vs ↗.
- [ ] Roboto, flat `#F3F2F8` cards, 16dp margins, 28dp sheet corners.

### F.4 Honesty checklist
- [ ] "No alerts" appears only when `source === "metro"`. Feed down → "Alerts can't be checked right now" (server `source: "unavailable"`). Demo → "Demo alerts only", never "No alerts".
- [ ] No blue dot and no walk times without a real fix. "Showing Downtown Houston" is labelled.
- [ ] Demo data is labelled: "Demo" on demo alerts, "Live (demo)" on simulated times on **every** screen (home cards included), "Sample times" on fixture itineraries (shifted to now), "Demo location".
- [ ] Bays: "Diagram, not to scale". "Bay not published". The hand-authored note.
- [ ] Fares: "To be confirmed by METRO". The ticket is a "Handoff to METRO" stub with no QR and no credential fields.
- [ ] No background-tracking claim. "Keep this screen open during your trip" is shown on D13. "Track Bus Stop" says "Works while this screen is open."
- [ ] Walk minutes for one stop are identical on the card, D6's pill and D8 (one formula, C.17). The "can I make it" verdict is identical on the card and D8 (`canMakeIt`).
- [ ] Fares: no single price on itineraries with a Park & Ride leg; "Reduced fares ›" next to every local fare.
- [ ] Languages offered: English and Español only (the others show "Coming soon" and are disabled).

---

## G. Implementation plan

### G.1 Stack and project layout (fixed)
- Frontend inside the existing `pwa/` package: **Vite 7 + React 19 + TypeScript**, `react-router` v7 (library mode, `createBrowserRouter`), `@tanstack/react-query` v5 (+ `@tanstack/query-async-storage-persister`, `@tanstack/react-query-persist-client`, `idb-keyval`), `maplibre-gl` v5, `vite-plugin-pwa` (Workbox), `@fontsource/roboto`, `@mapbox/polyline` (to decode leg geometry; or a local 30-line decoder in `src/lib/polyline.ts`). No UI kit and no CSS framework: plain CSS Modules plus `tokens.css`.
- Scripts to add to `pwa/package.json`: `"dev": "concurrently -k \"npm:server:dev\" \"npm:web:dev\""`, `"web:dev": "vite --host"`, `"web:build": "tsc -p tsconfig.app.json --noEmit && vite build"`, `"web:preview": "vite preview --host"`, `"typecheck:web": "tsc -p tsconfig.app.json --noEmit"`.
- `vite.config.ts`: `server.proxy['/api'] = 'http://localhost:8787'`, publicDir `public` (it already holds `data/stops.json` and `data/routes.json`), and the PWA manifest (name "RideMETRO", short_name "RideMETRO", theme `#2976C7`, background `#F9F9FF`, display `standalone`, icons from `public/brand/`).
- `tsconfig.app.json`: `"jsx": "react-jsx"`, `"moduleResolution": "Bundler"`, `"types": ["vite/client", "node"]`, `"include": ["src", "shared"]`. The root `tsconfig.json` stays for the server.
- **Android emulator:** geolocation needs a secure context, so run `adb reverse tcp:5173 tcp:5173` and open `http://localhost:5173` in Chrome on the emulator (not 10.0.2.2). Set the GPS with `adb emu geo fix <lon> <lat>`.

### G.2 Directory ownership (DISJOINT: an agent edits only its own paths)

F0 is split in two (G.5). **F0a** writes everything below marked F0 as **final contracts with stub bodies**; **F0b** later fills in the same files' internals (never their exported signatures) while A–D work.

```
pwa/
├─ index.html, vite.config.ts, tsconfig.app.json, package.json (deps/scripts)  ─ F0a
├─ public/brand/*, public/manifest icons                                       ─ F0b
├─ server/app.ts, server/services/{alerts,nearby,stopDetail,walk}.ts (edits),
│  server/services/{routeNext,stopSchedule}.ts (new),
│  tests/api-additions.test.ts (new)                                           ─ F0a (backend changes 1–7, G.4)
├─ scripts/record-fixtures.ts + server/fixtures/osrm/* (new walk fixtures)     ─ F0b
├─ src/
│  ├─ main.tsx, app/ (App, router.tsx, routes.ts, layouts/, BottomNav, guards,
│  │        ExploreChrome context, usePageTitle, focus-on-navigate)           ─ F0a
│  ├─ styles/ (tokens.css, base.css)                                          ─ F0a
│  ├─ api/ (client.ts, types.ts, hooks.ts, alertsStore.ts, keys.ts)           ─ F0a
│  ├─ lib/ (format.ts, walk.ts, geo.ts, polyline.ts, storage.ts, alerts.ts,
│  │        sortRoutes.ts, text.ts, notify.ts, planQuery.ts, fares.ts,
│  │        routes.ts, i18nServer.ts)                                         ─ F0a (real, tested: pure functions)
│  ├─ state/ (location.tsx, prefs.tsx, saved.ts, recents.ts, trip.ts,
│  │         clock.ts, walkDistance.ts)                                       ─ F0a
│  ├─ i18n/ (index.ts: t(), useT(); strings/common.ts)                        ─ F0a
│  ├─ i18n/strings/{home,stop,walk}.ts                                        ─ A
│  ├─ i18n/strings/{search,route,tc}.ts                                       ─ B
│  ├─ i18n/strings/{plan,trip}.ts                                             ─ C
│  ├─ i18n/strings/{alerts,recent,fares,more,welcome}.ts                      ─ D
│  ├─ map/ (MapView.tsx, style.ts, scene.ts, layers/*.ts)                     ─ F0a scene API + blank map; F0b style + layers
│  ├─ ui/ (every component in section C) + ui/types.ts                        ─ F0a props + plain stubs; F0b visuals
│  ├─ sw/ (service worker config, IndexedDB persister)                        ─ F0b
│  ├─ screens/explore/home/        (D2, D3, D4)                               ─ A
│  ├─ screens/explore/stop/        (D6, D7)                                   ─ A
│  ├─ screens/explore/walk/        (D8)                                       ─ A
│  ├─ screens/explore/search/      (D5 incl. pick mode)                       ─ B
│  ├─ screens/explore/route/       (D9)                                       ─ B
│  ├─ screens/explore/tc/          (D10)                                      ─ B
│  ├─ screens/more/routes/         (D20)                                      ─ B
│  ├─ screens/explore/plan/        (D11, D12, shiftFixture.ts)                ─ C
│  ├─ screens/explore/trip/        (D13)                                      ─ C
│  ├─ features/trip/ (steps.ts, progress.ts, wakeLock.ts)                     ─ C  (notify.ts moved to src/lib, F0)
│  ├─ screens/welcome/             (D1)                                       ─ D
│  ├─ screens/alerts/              (D14, D15)                                 ─ D
│  ├─ screens/recent/              (D16)                                      ─ D
│  ├─ screens/fares/               (D17)   src/data/fares.json                ─ D (file created by F0a)
│  ├─ screens/more/ (except routes/): D18, D19, D21, NotFound                 ─ D
│  └─ tests/e2e/ flows.spec.ts (Playwright, F1–F11 from section E)            ─ QA (after merge)
```
Each screen folder exports exactly one default component per route (e.g. `screens/explore/stop/StopSheet.tsx`). **F0a creates every folder with a placeholder component** ("TODO: D6 Stop sheet") that is already wired into the router, so module agents only fill their folders and never touch `router.tsx`.

**Shared-but-owned pieces (so no module imports another):** `NotifyPermissionCard` (ui) and `notify.ts` (lib) are F0, used by A (Track Bus Stop) and C (Live trip). `planQuery.ts` is F0, used by B (pick mode writes) and C (reads). FABs and overlay items are rendered by F0's ExploreLayout and requested through `useExploreChrome` (A: route-alerts FAB on D3; C: the trip bar; the layout itself swaps Plan Trip → My trip). Recents writers are listed in C.17.

### G.3 Router table (F0 writes it; this is the URL contract)

| Path | Screen | Layout | Owner | `parentOf` |
|---|---|---|---|---|
| `/` | redirect → `/explore` (or `/welcome`) | – | F0 | – |
| `/welcome` | D1 Welcome | bare (no nav) | D | – |
| `/explore` (`?route=`, `?at=&label=`) | D2 / D3 / D4 Home | ExploreLayout (map + sheet + nav) | A | – |
| `/explore/search` (`?q=&pick=from` or `pick=to`, plus the plan query) | D5 Search | ExploreLayout | B | `/explore` |
| `/explore/stop/:stopId` (`?route=`) | D6 Stop sheet | ExploreLayout | A | `/explore` |
| `/explore/stop/:stopId/schedule` (`?route=`) | D7 Full Schedule | PageLayout (app bar + nav) | A | `/explore/stop/:stopId` |
| `/explore/stop/:stopId/walk` (`?from=&route=`) | D8 Walk | ExploreLayout | A | `/explore/stop/:stopId` |
| `/explore/route/:routeId` (`?dir=&stop=`) | D9 Route page | PageLayout | B | `/explore` |
| `/explore/tc/:tcId` (`?route=`) | D10 Transit Center | PageLayout | B | `/explore` |
| `/explore/plan` (`?from=&fromName=&to=&toName=&time=&arriveBy=&sort=`) | D11 Plan + list | ExploreLayout | C | `/explore` |
| `/explore/plan/:index` (same query) | D12 Itinerary detail | ExploreLayout | C | `/explore/plan` |
| `/explore/trip` | D13 Live trip | ExploreLayout (trip bar replaces the search bar) | C | `/explore` |
| `/fares` | D17 Fares | TabLayout | D | – |
| `/recent` | D16 Recent | TabLayout | D | – |
| `/more` | D18 More | TabLayout | D | – |
| `/more/alerts` (`?route=&filter=`) | D14 Alerts | PageLayout | D | `/more` |
| `/more/alerts/:alertId` | D15 Alert detail | PageLayout | D | `/more/alerts` |
| `/more/settings` (`#section`) | D19 Settings | PageLayout | D | `/more` |
| `/more/routes` | D20 Route Schedules | PageLayout | B | `/more` |
| `/more/about` | D21 About | PageLayout | D | `/more` |
| `*` | NotFound | TabLayout | D | – |

- **ExploreLayout** keeps one `MapView`, the MapSearchBar (hidden on D5 and D13 and at `full`), the FAB stack, the map overlay slot (C.12) and the BottomNav. The child route renders **inside a `BottomSheet`** that the child controls through `useSheet()` (`{snap, setSnap, setMinHalf}`), and it chooses its FABs, overlay item and search-bar visibility through `useExploreChrome()` (G.4).
- **PageLayout** is an AppBar plus a scroll area plus the BottomNav. **TabLayout** is a title plus a scroll area plus the BottomNav.
- The BottomNav's "Explore" tab returns to the **last Explore URL** of the session (so a sub-screen is not lost). Tapping it again while on Explore goes to `/explore`.
- Links use `<Link>` / `navigate()`. Query-only changes inside a screen (expanding a row, changing direction, sort) use `{replace: true}`.
- `parentOf` is used by "‹ Back" when there is no in-app history (a cold deep link).

### G.4 Shared contracts F0a must deliver before the modules start

**Backend changes** (F0a owns them, each with a vitest test in `tests/api-additions.test.ts`):
1. **`/api/nearby` adds `transitCenters`:** `NearbyTransitCenter[]` for every TC whose centre is within **1,000m** of the origin (independent of `radius`): `{ id, name, lat, lon, distanceM, walkDistanceM, walkDistanceText, walkMin, bayCount, source }`, sorted by distance, same walk formula as the stops. Test: at 29.7890,-95.4560 it includes `northwest-transit-center` with `walkMin` 11 (±1).
2. **`/api/nearby` departures carry `source`:** in `server/services/nearby.ts`, `NearbyRoute.departures` becomes `Pick<Arrival, "departureTime" | "minutesAway" | "isRealtime" | "delaySeconds" | "canceled" | "tripId" | "source">[]` (a one-line change; `groupByRoute` already has the full `Arrival`). Test: with `DEMO_REALTIME=1`, some departure has `source === "simulated"`.
3. **TC detail window:** `getTransitCenterDetail` calls `getArrivals(platform, { limit: 200, horizonMin: 90 })` (was 40), and the response adds `windowEnd: string | null` = the latest `departureTime` it considered across platforms. Test: `northwest-transit-center` returns a `windowEnd` and every bay with a scheduled trip in 90 min has ≥ 1 departure.
4. **Structured walk steps:** `WalkStep` adds `maneuver: "depart" | "turn" | "new name" | "continue" | "arrive" | "roundabout" | string`, `modifier?: "left" | "right" | "slight left" | "slight right" | "sharp left" | "sharp right" | "straight" | "uturn"`, `street?: string` (from OSRM's `type`, `modifier`, `name`); `instruction` stays as the en fallback. The straight-line fallback returns one step `{ maneuver: "arrive", street: <stop name> }`. Test: the F4 fixture returns steps with `maneuver` set.
5. **`GET /api/stops/:id/schedule?route=<id>`** (new, `stopSchedule.ts`) → `{ stopId, routeId, serviceDate, departures: { departureTime }[], nextServiceFirst: { serviceDate, departureTime } | null }`. `departures` covers the **whole** current service day **from its start** (so D7 can grey passed hours), `realtime: false`, limit 300. `nextServiceFirst` is the first departure on the next day that has service (look ahead up to 7 days), used by D6's empty strip and D7's empty state. Test: stop 342 route 40 returns more than 10 departures and a non-null `nextServiceFirst`.
6. **`GET /api/routes/:id/next?dir=0|1`** (new, `routeNext.ts`) → `{ routeId, directionId, generatedAt, stops: { stopId, next: { departureTime } | null }[] }`, using `getArrivals(stopId, { routeId, limit: 1, realtime: false, horizonMin: 180 })` per stop in `directions[dir].stopIds`. `Cache-Control: max-age=60`. No upstream calls. Test: route 82 dir 0 returns 101 entries.
7. **Honest alerts source** (`server/services/alerts.ts`): `AlertsResult.source` becomes `"metro" | "demo" | "unavailable"`. When a METRO key is configured, `!config.offline`, and the live fetch fails → return `{ source: "unavailable", sourceNote: "METRO alerts could not be loaded.", alerts: [] }` (cached for 60s like a success, so a flapping feed doesn't hammer upstream). **Demo alerts are returned only when `config.offline` or no key is configured** (`source: "demo"`). `getStopDetail` / `getRouteDetail` pass the same `alertsSource`. Test: with a key set and the fetch mocked to throw, `source === "unavailable"` and `alerts` is empty.

`/nearby` keeps its cap of 2 departures per route and its 15-stop limit; the design uses 2 and no longer depends on the stop rank (D3 uses `/routes/:id`).

**Frontend contracts:**
```ts
// src/api/client.ts
export class ApiError extends Error { code: string; status: number }
export function apiGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T>  // throws ApiError; UI shows t("error."+code), message = en fallback

// src/api/types.ts: type-only re-exports so the UI matches the server exactly
export type { Arrival, ClientStop, ClientRoute, DataSource, LatLon, Cardinal } from "../../shared/types";
export type { NearbyStop, NearbyRoute } from "../../server/services/nearby";     // departures include `source` (change 2)
export type { StopSummary } from "../../server/services/present";              // `routes` is the chip source (D2 item 4)
export type { Alert, AlertsResult } from "../../server/services/alerts";        // source: "metro" | "demo" | "unavailable"
export type { SearchResult, SearchResponse } from "../../server/services/search";
export type { PlanResponse, Itinerary, Leg, WalkLeg, TransitLeg, PlanStop } from "../../server/services/plan";  // recordedAt? for fixtures
export type { WalkRoute, WalkStep } from "../../server/services/walk";          // structured steps (change 4)
export type { Vehicle } from "../../server/services/vehicles";
export type { TransitCenter } from "../../server/services/transitCenters";
export interface NearbyTransitCenter { id: string; name: string; lat: number; lon: number; distanceM: number; walkDistanceM: number; walkDistanceText: string; walkMin: number; bayCount: number; source: string }
export type NearbyResponse = { origin: LatLon; radiusM: number; generatedAt: string; message?: string; stops: NearbyStop[]; transitCenters: NearbyTransitCenter[] };
export type StopDetail = Awaited<ReturnType<typeof import("../../server/services/stopDetail").getStopDetail>>;
export type TransitCenterDetail = Awaited<ReturnType<typeof import("../../server/services/stopDetail").getTransitCenterDetail>>;  // + windowEnd
export type RouteDetail = Awaited<ReturnType<typeof import("../../server/services/routeDetail").getRouteDetail>>;
export type TripDetail = ReturnType<typeof import("../../server/services/trips").getTrip>;
export interface RouteNext { routeId: string; directionId: 0 | 1; generatedAt: string; stops: { stopId: string; next: { departureTime: string } | null }[] }
export interface StopSchedule { stopId: string; routeId: string; serviceDate: string; departures: { departureTime: string }[]; nextServiceFirst: { serviceDate: string; departureTime: string } | null }

// src/api/hooks.ts (TanStack Query; the keys are in keys.ts)
useHealth(); useNearby(anchor?: LatLon, opts?: { radius?: number; precise?: boolean }); useStop(id); useArrivals(stopId, { route?, limit?, enabled? });
useSearch(q, near?); useRoute(id); useRouteNext(id, dir); useStopSchedule(stopId, routeId, { enabled? }); useTransitCenters(); useTransitCenter(id);
usePlan(query: PlanQuery | null); useWalk(from?: LatLon, toStop?: string); useTripStops(tripId?, fromStop?); useVehicles(routeId?, { enabled });
useAlerts(): { status: "loading" | "ok" | "error"; source?: "metro" | "demo" | "unavailable"; alerts: Alert[]; forRoute(id): Alert[]; forStop(id, routeIds): Alert[]; forItinerary(it): Alert[] }

// src/app/layouts/ExploreChrome.tsx: how a screen drives the layout it doesn't own
useSheet(): { snap; setSnap; setMinHalf }
useExploreChrome(opts: {
  fabs?: ("locate" | "planTrip" | { kind: "routeAlerts"; routeId: string })[];   // default ["locate","planTrip"]; planTrip auto-swaps to "My trip" when a trip is active
  banner?: "search-this-area" | "demo-location" | "downtown-fallback" | null;    // overlay-slot requests; offline & trip-active are added by the layout; priority per C.12
  hideSearchBar?: boolean;                                                       // D5, D13
}): void   // set on mount, cleared on unmount
usePageTitle(title: string): void              // document.title = `${title} · RideMETRO`
// Focus: the layout moves focus to the new screen's <h1 tabindex="-1"> after every navigation (not on replace-only query changes).

// src/state/clock.ts
useNow(): number                               // 15s tick while visible; immediate tick on visibilitychange

// src/lib/format.ts
formatDeparture(departureTime: string, now: number, opts: { offline?: boolean; status: Status; lang }): string  // "Now" | "16 min" | "8:05 PM" (C.2)
upcoming<T extends { departureTime: string }>(deps: T[], now: number): T[]    // drops departures more than 60s past
formatClock(iso: string, lang): string          // "7:05 PM" (America/Chicago)
formatDistance(m: number, lang): string         // "250 ft" / "0.1 mi" (es: "250 pies" / "0.1 mi"); never use server distanceText
formatDateRange(from?: string|null, until?: string|null, lang): string
statusOf(dep): Status
sideLine(stop: { directionLabel?, side?, kind }, opts: { withCompass: boolean; lang }): string
    // withCompass=false: "On the north side of Lamar St"; true: "Westbound stop · North side of Lamar St"
headsignLine(route: RouteRef, directionLabel: string, headsign: string, lang): string  // rail omits the direction
// src/lib/i18nServer.ts: localising English strings that come from the server
localiseSide(side: string, lang): string        // /^(North|South|East|West) side of (.+)$/ → t("side."+dir, { street }); no match → side unchanged
walkStepText(step: WalkStep, lang): string      // t("walk.step.<maneuver>.<modifier>", { street }), fallback step.instruction
errorText(err: ApiError | Error, vars, lang): string   // t("error."+code), fallback err.message (en only)
// src/lib/walk.ts (C.17)
walkMinutes(distanceM: number, pace: "normal" | "slower"): number
estimateWalk(from: LatLon, to: LatLon, pace): { distanceM, minutes }
canMakeIt(walkMin: number, dep: { departureTime: string }, now: number): "yes" | "tight" | "no"
useWalkDistance(from: LatLon | undefined, stopId: string, seedM?: number): { distanceM?: number; source: "osrm" | "estimate" }
// src/lib/notify.ts (C.17): notifyPermission(), requestNotify(), notify(title, body, tag), vibrate(pattern)
// src/lib/planQuery.ts
interface PlanQuery { from?: string; fromName?: string; to?: string; toName?: string; time?: string; arriveBy?: boolean; sort?: "soonest" | "transfers" | "walk" }
parsePlanQuery(search: URLSearchParams): PlanQuery
planUrl(q: PlanQuery, extra?: { edit?: boolean; index?: number }): string
encodePick(returnTo: string, field: "from" | "to", result: SearchResult | { kind: "my-location"; point: LatLon }): string   // returns the D11 URL with that field filled
// src/lib/fares.ts
fareLine(it: Itinerary): { text: string; reducedHref: "/fares#reduced" } | null  // null if any leg is Park & Ride
// src/lib/routes.ts
routeRef(id: string): RouteRef | undefined; routeRefByName(shortName: string): RouteRef | undefined   // from cached /data/routes.json; for TC unassignedRoutes
// src/lib/sortRoutes.ts
sortRouteChips(stops: NearbyStop[], tcs?: { tc: NearbyTransitCenter; routes: RouteRef[] }[]): RouteRef[]   // uses stop.stop.routes, D2 item 4
compareRouteNames(a: string, b: string): number             // numeric, rail after bus
// src/map/scene.ts: see C.16.  src/state/*: see C.17.
// src/i18n: t(key: string, vars?: Record<string, string|number>): string; useT(); keys are namespaced "home.title", "stop.save".
```
**PlanQuery encoding:** `from` / `to` are `"lat,lon"`, a stop id, or `"landmark:<id>"` (exactly what `/api/plan` accepts). `fromName` / `toName` are display names. `time` is ISO or absent (= now). `arriveBy` is `"1"` or absent. Only `planQuery.ts` reads or writes these parameters.

**i18n of server strings (rules for every module):**
- `side` → `localiseSide`. Walk steps → `walkStepText` (structured fields, change 4). Distances → client `formatDistance` (never `distanceText`). Errors → `errorText` by `code`. `stop.subtitle` and plan `message` are **not rendered** in es (the client composes those lines; `message` appears under the t() line in en only). Stop, street and headsign names stay as on the sign.
- `common.ts` (F0a) holds en + es for every C component string (Show list / Show map, Back, Clear, Remove, Undo, Refresh, Try again, Save / Saved, Walk here, status words, ScheduleCaption, AlertStatusLine texts, "No buses in the next 2 hours", error codes, side directions, walk maneuvers, units).

### G.5 Build order and parallel work
1. **F0a Contracts (1 agent, first, about 1 hour; the only serial step):**
   - `tokens.css`, `base.css`, fonts; the `src/api` client, types and hooks; all of `src/lib` and `src/state` (pure functions, with unit tests for `formatDeparture`, `upcoming`, `canMakeIt`, `walkMinutes`, `sideLine`, `localiseSide`, `encodePick`/`parsePlanQuery`, `fareLine`, `sortRouteChips`); i18n with `common.ts`.
   - The router with every placeholder screen, ExploreLayout / PageLayout / TabLayout with `useSheet`, `useExploreChrome`, `usePageTitle` and focus-on-navigate; a blank MapLibre map with the Scene API wired (no custom style yet).
   - **Every section C component with its final props** and a plain, correct-but-unstyled body (semantic HTML, right text, 48dp targets), so modules can compose real screens immediately.
   - Backend changes 1–7 with tests.
   - **Exit criteria:** `npm run typecheck:web` and `npm test` pass; `/explore` shows a map and a placeholder sheet; every component renders in `/dev/ui` with its props.
2. **In parallel, after F0a** (5 agents):
   - **F0b Polish (foundation):** the real visuals of every C component (pixel spec in C, checked in the `/dev/ui` gallery at 360dp), the OpenFreeMap restyle and stop-pin/TC/label layers (C.16), the service worker and IndexedDB persister (D22), PWA icons, and the OSRM fixture recording (add F4 29.7563,-95.3639 → 342; F8 29.7199,-95.3422 → 11424; F11 HMNS → 688 to `scripts/record-fixtures.ts`, then `npm run fixtures:record` with network access; without them, offline mode shows the honest straight-line fallback). **F0b never changes an exported signature**; screens pick up the visuals automatically.
   - **A: Home, Stop, Walk.** D2, D3, D4, D6, D7, D8. Acceptance: F1, F2, F4, F10 (with D), F11 end state, rules M1–M4.
   - **B: Search, Route page, Transit Center, Route list.** D5 (including pick mode, via `encodePick`), D9, D10, D20. Acceptance: F5, F6, F7 (alternative path), the F3/F11 search steps.
   - **C: Planner, Itinerary, Live trip.** D11, D12, D13, `features/trip`, `shiftFixture`. Acceptance: F3, F8, rules P1–P2.
   - **D: Welcome, Alerts, Recent/Saved, Fares, More/Settings, About, NotFound.** D1, D14–D19, D21. Acceptance: F9, F10, F6's detail step.
3. **QA (1 agent, after merge):** Playwright `tests/e2e/flows.spec.ts` automates section E at 360x640 and 412x800 with `?demoLoc=`, for **both capture sets** (S and L), saves `ux-audit/redesign/<flow>-end.png` and `ux-audit/redesign/live/<screen>.png`, asserts the F10 tooSoon rendering, M1–M4 and P1–P2 by bounding boxes, and runs the F rubric checks it can automate (min font sizes via computed styles, 48dp targets via bounding boxes, axe-core contrast, no "Scheduled" text node next to a time, focus on `<h1>` after navigation).

**Cross-module rules:**
- A module needing a shared component change files a note in `docs/design/requests.md` (created by F0a). F0b, or the lead afterwards, makes the change. Modules never edit `src/ui`, `src/map`, `src/api`, `src/lib`, `src/state` or `src/app`.
- The only cross-module links are URLs (G.3) and F0 contracts (G.4). B's pick mode returns with `encodePick(returnTo, …)`. No module imports another module's files.
- Every user-facing string goes through `t()` with en and es in the module's own strings file (shared strings in `common.ts`). Spanish is written by the module agent and must not be machine-garbled: use short, plain sentences.

---

## H. Traceability: audit finding → fix

### H.1 UX audit findings (REPORT.md)
| Finding | Sev | Fix | Where |
|---|---|---|---|
| J1.1 Stops are tiny unlabeled dots | CRIT | 28dp pins with a direction notch, **an ID label on every pin at z ≥ 16**, accessible names | C.16 |
| J1.2 Nearby list never says which stop, distance or side | CRIT | Cards grouped by stop: Name (ID), direction stop, side, walk minutes, sorted by walk distance | C.5a, D2 |
| J1.3 No walking directions | CRIT | Walk buttons on cards, the stop sheet, search, route rows and the TC. OSRM street path, US units | D8 |
| J1.4 Walk leg is a straight line | HIGH | Itinerary walk rows open D8. Leg geometry is drawn from the plan polylines | D12, D8 |
| J1.5 TC bays stacked; arrivals shown instead of departures | HIGH | TC view with **departures by bay**, a schematic BayDiagram (honest about the data), "Bay not published" | D10, C.14 |
| J1.6 Panning replaces nearby results | HIGH | Nearby anchored to the fix; an explicit "Search this area" pill | C.16 |
| J1.7 No fix → fake Museum District location | MED | "Showing Downtown Houston" label, no dot, no walk times | D2 states |
| J1.8 Pin tap gives a route picker without a name or times | MED | A pin opens the Stop sheet directly | C.16, D6 |
| J1.9 Times inconsistent, flicker, "1:08m" | MED | `formatDeparture` from `departureTime` on a 15s tick, tabular numbers, no animation, one arrivals source per screen plus UpdatedAgo | C.2, B.1 |
| J1.10 Pin colours reversed | MED | Origin is always blue, destination always red, in the form, timeline and map | D11, D12 |
| J1.11 Confusing labels | LOW | Plain labels: "Board … to HEADSIGN", "Get off at …", "Walk here" | D11, D12 |
| J1.12 Heavy onboarding + coach marks | LOW | One Welcome screen, no coach marks | D1, S10 |
| J1.13 Left chip rail covers the map | LOW | Chips moved into the sheet as a ChipRow with the visible label "Your route? Tap it:" | D2, C.10 |
| J2.1 Boarding stop lacks ID, direction, side | CRIT | The boarding block on every itinerary card and in the detail | D11, D12 |
| J2.2 Itinerary steps are dead ends | CRIT | Every StepList row is a button (stop / walk / alert) | C.13, D12 |
| J2.3 Airport place → a 17-min wrong walk | CRIT | Landmark `to=landmark:<id>` (curb coordinates) plus "Going to the bus stop at Hobby Airport (#10567)" | D5, D11 |
| J2.4 "Cannot find any trips" for routable trips | HIGH | Stop/landmark-snapped endpoints, and an inline message with Leave later / Start from a nearby stop / Edit | D11 |
| J2.5 "Transfer" misuse, no headsign | HIGH | "BOARD [80] to MLK & PARK VILLAGE". Transfer as its own walk/wait row | D12 |
| J2.6 Swipe down discards the trip | HIGH | Swipe minimises only. The trip persists with a banner. Back is labelled | C.6, D11, D12 |
| J2.7 Itinerary map poorly framed | HIGH | Fit above the sheet (`useMapPadding`), labelled board/transfer pins, legs cased per route | D12 |
| J2.8 Transfers lack arrival time, walk, tightness | MED | A transfer row with walk minutes, side, wait, bay and "Tight transfer" | D12 |
| J2.9 Autocomplete icons identical | MED | Typed groups with distinct icons, direction on stop rows, TC rows | D5 |
| J2.10 No explanation when location is unavailable | MED | "Finding your location…" (neutral, auto-plans on fix) vs "Location is off. Choose a starting point" (denied/unavailable), with `disabledReason` | D11, C.17 |
| J2.11 Arrival sheet doesn't name the stop | MED | The centred "Name (ID)" on every stop sheet | D6 |
| J2.12 "1:0min", ambiguous dialog | LOW | `formatDeparture`; no tracking dialog | C.2, D13 |
| J2.13 Planner hidden behind an unlabeled FAB | LOW | The extended FAB "Plan Trip", plus Directions on every place result | C.9, D5 |
| J3.1 Tracking dies in the background | CRIT | Wake Lock, "Keep this screen open", resume toast, persisted active trip, trip banner | D13 |
| J3.2 Stop alerts need 5 / 25m | CRIT | Get-off warnings by **stops left** (2 and 1) with vibration | D13 |
| J3.3 No step-by-step guidance | HIGH | Step cards Walk / Wait / Ride / Transfer / Final walk / Arrived, plus Previous / Next | D13 |
| J3.4 No off-route detection; frozen origin | HIGH | "From" always uses the current fix at plan time. Progress is by fix or clock. "( ↻ Plan again from here )" at the top of All steps (no continuous re-routing, see A.2) | D11, D13 |
| J3.5 Alerts lack route, direction, ID; RT/SC codes | HIGH | Every warning names the stop and ID. Status words instead of codes | D13, C.2 |
| J3.6 Timetable with no header | MED | Full Schedule header: route, direction, stop (ID), date | D7 |
| J3.7 Tracking ends before the final walk | MED | The Final walk step with walking directions, then Arrived | D13 |
| J3.8 Confusing step wording | MED | See J2.5 | D12 |
| J3.9 Pin colours reversed | LOW | See J1.10 | D11, D12 |
| J3.10 Coach marks during trips | LOW | None exist | S10 |
| J3.11 Alert chip has no summary | LOW | The AlertBox shows the effect word, header and dates | C.11 |
| J3.12 Meaningless pin a11y labels | LOW | "Stop 342, Lamar St at Main St, westbound" | C.16 |
| J3.13 Locate gives no feedback | LOW | The toast "Can't find your location yet" | C.9 |
| J4.1 No favourites | HIGH | ☆ Save on stops and routes. Saved at the top of Explore and Recent | D6, D9, D2, D16 |
| J4.2 Location denied pretends a location | HIGH | The "Location is off" card, re-request, Chrome steps | D2, D19 |
| J4.3 Route → stop takes about 10 taps | HIGH | Direction pills in search. The Route page with ordered, searchable stops scrolled to you. The "82 montrose" shortcut | D5, D9 |
| J4.4 Alerts on an external site | HIGH | In-app alerts on search, route, stop, itinerary and More, plus an explicit "No alerts" | C.11, D14, D15 |
| J4.5 Tiny pins only in a circle | HIGH | Pins across the whole viewport; no circle | C.16 |
| J4.6 Cross-street results indistinguishable | MED | Grouped intersection rows with direction; "and"/"&"/"@" treated alike | D5, D9 |
| J4.7 Times and direction labels change between screens | MED | Times: one `formatDeparture` from `departureTime` + `useNow()`, and `source` on every departure (so Live (demo) matches everywhere). Walk: one `walkMinutes(distanceM, pace)` with a shared best-known distance. Verdict: one `canMakeIt`. Labels: the same `sideLine` / `headsignLine` helpers everywhere | C.2, C.17, G.4 |
| J4.8 Mislabelled for screen readers | MED | a11y label templates on cards, pins, times and chips | C.2, C.5, C.16 |
| J4.9 Nearby cards don't say which stop | MED | Every card leads with Name (ID) | C.5 |
| J4.10 Tip overlays pile up | LOW | None exist | S10 |
| J4.11 No Spanish | LOW | English and Español, with an alert-language fallback note | A.2, D19 |

### H.2 Judge must-fixes
| Must-fix | Resolution | Where |
|---|---|---|
| Inconsistent or invented example data (#11425 vs #11424, 2743 Fannin, #12345) | All examples come from the offline API: the UH boarding stop is **11424, Southbound, West side of M L King Blvd**, route 80 "MLK & PARK VILLAGE", then 73 at **4789** to **Hobby Airport 10567**. The HMNS closest stop is **688 Main St @ Remington Ln** (computed, as HMNS has no curated stopIds). Route 58 at NWTC is **Bay M, Platform 2, stop 79**. Stop 342 is **Westbound, North side of Lamar St, 8th nearest (136m)**. | Header, D, E |
| Recount honestly (Find-field focus is its own tap; F3 needs the headsign on the card; F1 above the fold) | E counts every focus tap. F3 has the headsign on the card. The F5 far case is stated as 6, which is why the shortcut exists. The above-the-fold rule is tested | E, D2 |
| Legibility floor | 16px information floor, 24px Bold minutes, caps only ≥ 16px, 14px nav labels, rem units, x1.3 check | B, F.2 |
| Live vs scheduled not by colour alone | StatusWord on every time; text-only greens and reds | C.2, B.1 |
| No icon-only controls | All labelled except Locate (with an aria-label) | C.9, L10 |
| TC grouped by bay, "Bay not published", demo note | D10 | D10 |
| Home sheet above the fold with Saved + entries | Saved capped at 1 compact row ("+N saved ›"), UpdatedAgo in the title row, no Legend on home, TC card after card #1, half height capped so the map strip stays ≥ 180dp at 412x800 (rules M1–M4) | D2 |
| Languages en/es only | A.2, D19 | A.2 |
| Honest PWA limits | Wake Lock, "Keep this screen open", resume toast, no background claims | D13 |
| Fares "to be confirmed", ticket stub, no QR | D17 | D17 |
| Notification permission in-app, non-blocking | The in-app card in D13 only | D13 |
| Keep familiar cues (centred Name (ID), Recent, legend, sheets over the map, visible back/close) | F.3 checklist; "‹ Back" on every sheet | F.3, C.7 |
| Bay coordinates are not per bay | The schematic BayDiagram, labelled "not to scale" | C.14 |
| F7 unreachable (TC outside 500m) | `/nearby.transitCenters` within 1km, the TC card after card #1, and the TC card never below **second** in the route filter | G.4, D2, D3 |
| `/nearby` returns 2 departures per route | The design shows 2 everywhere on cards | C.5a |
| Text contrast (#FF3B2F, #C62828, #2A82E6 as text) | Text tokens `--c-alert-text` #B3261E, `--c-link-text` #005DAA; icon-only tokens marked | B.1 |
| Selected chip only by grey fill | A 2dp primary border, check badge and aria-pressed | C.1 |
| WCAG 2.5.7 dragging | Show list / Show map buttons; ↑ / ↓ / Remove in Recent edit | C.6, D16 |
| Honour Android/Chrome font scale | rem tokens, min-heights, wrap | B.1 |
| Route-page arrivals fan-out | Live only for the expanded row; per-stop next times from the local-schedule `/routes/:id/next` | D9, G.4 |
| `/vehicles` 503 | Silent degrade plus a caption; schedule progress; manual steps | D9, D13 |
| Remove over-claims (persistent notifications, re-routing) | A.2 non-goals | A.2 |
| F1 chip order / width at 360dp | The walk-distance + numeric sort puts [40] 3rd; 4 md chips (48dp + 6dp gaps) plus "More ›" fit at 360dp; chips come from `stop.routes` so they survive late night | D2, C.10 |
| Realtime only for the first 6 stops | Cards 7–8 simply carry no Live word (scheduled is unmarked). D3 no longer depends on rank: it calls `/arrivals?stop&route` per card | D2, D3 |
| stop.dir vs route direction wording | `sideLine` drops the stop's compass word wherever a route line is shown ("On the north side of Lamar St" under "NORTHBOUND to N SHEPHERD P&R"); it keeps it only on rows without a route line (search, D16). Rail omits the route direction | C.5a, G.4 |
| F5 auto-expand lands on 2959, not 2958 | Acknowledged: 2958 is the adjacent row, and F5 counts its tap (4) | E |
| F8 has no slack | No OS dialog on Start; Start trip is a sticky sheet footer (rule P2); peek shortcut on D11 | D11, D12, D13 |

---

## I. Decisions (critique round 1)

Where a defect's suggested fix offered options, or where this spec deviates from it, the choice and the reason:

- **#1 "Start" on D11 card 1's peek:** read as the D11 sheet's **peek state**, which now shows card 1 as one line with a tonal "( ▶ Start )". A Start button on every expanded card was rejected: it would put a second call to action on each card (S1 intent) and skip the timeline riders should see first. F8 is met by the sticky footer (5 actions, no scroll), not by the peek.
- **#2 "Leave at" row vs time chips:** the **"Leave at" row is dropped** and the chips stay, because the chips are one tap each and are what riders see today; the custom time and Arrive-by moved into a 5th chip, "Other time ▾". The Results layout hides both behind the summary row anyway.
- **#3 F7:** chose **TC card always first** when a TC serves the route (F7 stays 1). A TC is a deliberate destination (many routes, sheltered bays); putting it first costs a street-stop rider one card height at most.
- **#5 Offline Live words:** offline, even a time that was live when cached renders as scheduled (no Live word) and as a clock time. A cached prediction is not live, and the old 60s exception was the source of the contradiction.
- **#8 A third verdict, "tight":** `canMakeIt` returns yes / tight / no. Only "no" changes a card (tooSoon); "tight" adds "Hurry: it's close." on D8/D13. Cards and D8 therefore never disagree about whether the bus is catchable, which was the defect.
- **#9 Walk distance refinement:** when OSRM's distance for a stop differs from the estimate by more than 10%, the shared cache updates and **every** screen shows the new minutes together, so no two visible screens disagree (a small change after the first OSRM answer is accepted, rather than never using the better street distance).
- **#10 Copy windows:** cards say "No buses in the next **2** hours" (the `/nearby` horizon is 120 min); the LiveStrip and saved rows say "next **3** hours" (the `/arrivals` horizon is 180 min); the D6 strip and D7 use `nextServiceFirst` when available. Each claim matches the window of the data behind it.
- **#13 TC window:** did **both**: `limit: 200` (removes the practical cut-off) **and** the "No departures before <windowEnd>" copy (so the claim stays exactly true even if a platform ever exceeds 200).
- **#18 Fold at 360x640 with a saved row:** the numbers don't allow a 180dp map, the saved row and card #1's first time together at 360x640. The spec keeps the map (≥ 120dp there, ≥ 180dp at 412x800) and the saved row, and states that card #1's route rows may need Show list at 360x640 with a saved row (rule M3). F2 is unaffected (its answer is the saved row); F1 and F10 have no saved row.
- **#20 Chip label:** chose the visible label **above** the chips ("Your route? Tap it:"), not a leading "Routes:" chip: an in-row label would take about 80dp and push [40] (the 3rd chip) toward the More button at 360dp.
- **#22 Legend:** kept on D6 only (where today's app has it), per the defect's own fix.
- **#27 Track Bus Stop:** chose to **build it** on F0's notify with the caption "Works while this screen is open."; the disabled pill with `disabledReason` is the stated fallback if module A runs out of time. It is never silently dead.
- **#28 Handle zone height:** moving Back and Show list/map into the handle zone needs 48dp targets there, so the handle zone is 48dp (was 24). The D2 budget counts this (the title row lost its sub-line instead).
- **#29b Alert headers:** chose **never truncated** anywhere (F6 needs the full header, and headers are one sentence); the compact variant only drops the description and dates.
- **#29e Swap:** chose a visible "⇅ Swap" label rather than a second icon-only exception.
- **#30 "Due":** a scheduled time at or past its minute shows its clock time ("7:05 PM"), never "Due" or "Now"; a live time at 0 shows "Now". Nothing shows "Due".
- **#31 P&R detection:** `fares.json.parkAndRideRoutes` is derived from `routes.json` by name ("P&R" / "Park & Ride") or number 200–299 and flagged "To be confirmed by METRO" like every other fare value. The only fare shown on itineraries is the local fare, with "Reduced fares ›".

## Changelog (critique round 1)

| # | Defect | Change | Where |
|---|---|---|---|
| 1 | F8 Start trip below the fold | "▶ Start trip" is a sticky `BottomSheet.footer`, visible at half and full (rule P2); D11 peek shows card 1 with ( ▶ Start ); D12 peek keeps ( ▶ Start ) | C.6, D11, D12, E |
| 2 | F3 fold / snap undefined | D11 Results layout: form collapses to one summary row, opens at `full`, "SELECT ITINERARY" label became the title, "Leave at" row dropped (5th chip "Other time ▾"); budget ≈ 461dp, rule P1 | D11, E, F.3 |
| 3 | F7 = 1 not guaranteed | D3 ranks by earliest catchable bus first; the TC variant card is never below second when a TC serves the route | D3, E, H.2 |
| 4 | Dishonest demo alerts | Backend change 7 (`source: "unavailable"`, demo only when offline/no key); `AlertStatusLine` with 5 states; "No alerts" only from the live feed; "Demo alerts only" | A.1.5, C.11, D3, D5, D6, D14, F.4, G.4 |
| 5 | Stale relative times | `formatDeparture(departureTime, now)` + `useNow()` 15s tick; `upcoming()` drops > 1 min past; offline = clock times, scheduled styling (single rule) | A.1.11, C.2, D conventions, D2, D6, D22, L14 |
| 6 | No `source` on nearby departures | Backend change 2 adds `source` to the pick; `statusOf` consistent everywhere | C (types), G.4 |
| 7 | F10 example contradicts tooSoon | Card 246 wireframe and F10 row show "Leaves before you get there"; QA asserts it | C.5a, D2, E, G.5 |
| 8 | Two thresholds | One `canMakeIt(walkMin, dep, now)` in `src/lib/walk.ts` for C.2, D8, D13 | C.17, C.2, D8, D13, G.4 |
| 9 | Three walk-minute sources | Only `walkMinutes(distanceM, pace)`; OSRM `distanceM` preferred (`/nearby?precise=1`, `/walk`), `durationMin` never shown; shared `useWalkDistance`; `?d=` seed | C.17, C.5, D2, D6, D8, D12 |
| 10 | Late night breaks home | Chips from `stop.routes`; "No buses in the next 2 hours" rows; `nextServiceFirst` on `/schedule`; Late-night rows in D2 and D6 states | C.3, C.5a, D2, D6, D7, G.4 |
| 11 | Fixture trips misbehave | `shiftFixture` shifts every timestamp by `now − recordedAt`; "Sample times"; `/trips` times aligned to the leg; no clock auto-advance in fixture mode | D11, D12, D13 |
| 12 | `new Notification()` throws on Android | `notify()` via `serviceWorker.ready.showNotification`; moved to `src/lib/notify.ts` (F0) | C.17, D13, G.2 |
| 13 | TC "no departures in 90 min" false | Backend change 3: `limit: 200` + `windowEnd`; copy "No departures before <time>" | D10, G.4 |
| 14 | D3 misses stops / live times | Nearest stop per direction from `/routes/:id` stops (client haversine); `/arrivals?stop&route&limit=2` per card; empty state computed from the full stop list | D3, E |
| 15 | D6 strip unreliable | Separate poll `/arrivals?stop&route=<expanded>&limit=4` plus one mixed call for collapsed rows | D6 |
| 16 | Module boundaries | (a) `useExploreChrome({fabs, banner, hideSearchBar})`; (b) `NotifyPermissionCard` + `notify.ts` in F0; (c) `planQuery.ts` (`encodePick`/`parsePlanQuery`); (d) recents writers assigned (A stops, B routes/searches, C trips); (e) `routeRefByName` for `unassignedRoutes` | C.9, C.15, C.17, D5, D9, D10, D11, G.2, G.4 |
| 17 | F0 too big | Split into F0a (≈1h, contracts + stubs + backend) and F0b (visuals, map style, SW, fixtures) in parallel with A–D | G.2, G.5 |
| 18 | Home reads as a list | UpdatedAgo in the title row; no Legend on home; Saved capped at 1 row; half height capped; map strip ≥ 180dp at 412x800 (rules M1–M4) | D2, F.1 (S4, S4b) |
| 19 | TC card / saved-row budget | TC card after card #1; budget counts exactly 1 saved row | D2 |
| 20 | Unlabelled chip row | Visible label "Your route? Tap it:"; wireframe redrawn with 4 chips + More at 360dp | C.10, D2, D3 |
| 21 | Two compass words per card | `sideLine` drops the stop compass when a route line is shown ("On the north side of Lamar St"); kept on search/D16 rows | C.5a, C.5c, D3, D4, D6, D11, G.4 |
| 22 | Repeated information | Scheduled is the unmarked default + one ScheduleCaption; Legend on D6 only; D6 walk time only in the "Walk here · 2 min" pill; "Keep this screen open" only on D13 | A.1.4, C.2, C.4, D6, D12, F.1 S4c |
| 23 | No green live state in screenshots | Capture Set L with `DEMO_REALTIME=1` ("Live (demo)") for D2, D3, D6, D12, D13 | E, G.5 |
| 24 | Spanish incomplete | `localiseSide`, structured walk steps (backend change 4), client `formatDistance`, `errorText` by code, no `subtitle`/`message` in es, `<html lang>`, es keys in `common.ts` | A.2, C.15, C.17, D8, D19, G.4 |
| 25 | Location states conflated | "Finding your location…" (neutral, auto-plan on fix) vs "Location is off"; Saved never waits on location | C.5b, C.17, D2, D8, D11 |
| 26 | F2 route may be hidden | `preferredRouteId` stored on Save from D6 and shown first | C.5b, C.17, D6, D16, E |
| 27 | Track Bus Stop dead end | Built on F0 notify with "Works while this screen is open."; disabled-with-reason fallback | D6 |
| 28 | Overlay and header collisions | One map overlay slot with a priority order + one sheet banner row; Back and Show list/map live in the handle zone only | C.6, C.7, C.12, D3 |
| 29 | Internal contradictions | (a) A.1.1 lists the 6 moved/changed elements; (b) alert headers never truncated; (c) `/schedule` from service-day start; (d) "Plan again from here" specified; (e) visible "⇅ Swap"; (f) API hook renamed `useTripStops` | A.1, C.11, D7, D13, D11, L10, G.4 |
| 30 | a11y specifics | Focus to `<h1>` on navigation; `usePageTitle`; no live regions except D13 step + warnings; map `aria-hidden`, sheet list is the equivalent; no "Due" on scheduled times | C.2, C.6, C.7, C.16, D conventions, L13 |
| 31 | Flat fare misleads | `fareLine()`: "Local fare $1.25 · Reduced fares ›" only for local bus/rail itineraries, omitted with a P&R leg; fare removed from the card's right column and the D12 header | D11, D12, D17, F.3, F.4 |
| 32 | D4 walk wording | "4 min · walk from the museum"; D8 link carries `?from=&fromName=`, title "Walk from … to …" | C.5a, D4, D8 |
