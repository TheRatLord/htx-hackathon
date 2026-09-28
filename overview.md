# RideMETRO Revamp: Project Overview

**Houston Hackathon 2026** · Challenge: RideMETRO app revamp · Status: working web app (installable PWA) on METRO's real GTFS and live feeds, plus rider research and a before/after audit

We are not METRO. The goal is to show the problem, give METRO a working reference it can borrow from, and offer to talk it through.

## The 190-character submission line

A working RideMETRO redesign on METRO's own live data: map-first "Where to?", walk-to-stop with side of street, trips that survive a swipe. Key tasks drop from 10+ taps to 2-4.

## The 30-second pitch

We asked 20 riders on the street; 14 don't use the RideMETRO app ("No, I just use my card."). Regulars ride one route they know. The app matters most to people who don't know the city: visitors, convention crowds, World Cup fans. For them it is confusing: one rider we interviewed lost her planned route by swiping the sheet down to see the map, another took the bus the wrong way. We built a working web app on METRO's own feeds that fixes those moments: a map-first "Where to?" home, routes drawn on the map with where to board, a "Walk here" button that names the stop and the side of the street, and a live trip that a swipe never throws away. It runs in the browser, no app store needed.

## 1. The problem (evidence in `complaints.md`, `ux-audit/REPORT.md`)

- **Most regulars skip the app.** Team street survey: 14 of 20 riders don't use it. Theory: native Houstonians ride one familiar route and don't need it.
- **The people who need it struggle.** App Store 2.2/5 (144 ratings, v2.71); Google Play 3.5/5, 100K+ downloads. A Google Play review (Aug 2026): "This app was completely unreliable and difficult to navigate, especially as a first-time metro rider..." An out-of-town hackathon attendee used it to get around and was frustrated and confused.
- **Rider interviews (two, recorded: `IMG_5521.MOV`, `IMG_5522.MOV`).** Interview 2: on the route view, pushing the sheet down to see the map cancels the route. Interview 1: GPS and direction confusion; took the bus the wrong way. Both were visitors heading to a convention.
- **Our UX audit of v2.71 (4 journeys on Android emulators).** Stops are tiny unlabeled dots, the Nearby list doesn't say which stop or which side of the street, there is no walk-to-stop option ("Cannot find any trips"), and swiping the itinerary down discards the trip.
- **Why now.** Houston hosts 7 World Cup matches at NRG; the Host Committee counted 557,979 participants at World Cup events in the first two weeks and METRORail carried 246,169 riders across the first four matchdays. RodeoHouston and big conventions come every year. METRO had about 78 million boardings in 2025, about 77% on local buses.

## 2. What we built

- **Where to? first.** Map-first home; stops are labeled pins that group and ungroup cleanly on zoom; route chips give "Route N near you" in one tap.
- **Trip planning up front.** Every option drawn on the map, the selected one on top; each card says where to board ("Board 4 at #1665").
- **Walk here.** From any stop: stop ID, side of street ("north side of Lamar St"), walking route, and "Leaves before you get there" when you can't make the next bus.
- **Live trip that stays put.** Dragging the sheet never discards the trip, and the trip survives a reload. Follow mode and a heading beam show which way you face. Step card advances by GPS, with a "your stop is next" buzz.
- **Honest times.** Live vs. scheduled labeled everywhere; live route alerts inline.
- **Saved stops, Recent, transit-center bays, Spanish, Extra-large text.**
- **Installable from the browser.** No app-store install; works as a home-screen app on Android.

Design reasoning is in `improvements.md` and `docs/design/spec.md`.

## 3. What exists today

| Item | Where |
|---|---|
| Working PWA (Vite + React frontend, Hono API) | `pwa/` (see `pwa/README.md`) |
| Vercel deployment config (Git deploy, `main` to production) | `pwa/vercel.json`, `pwa/README.md` |
| Before/after results on Android Chrome, live METRO feeds | `docs/results.md` |
| Baseline measurements of RideMETRO v2.71 | `docs/baseline-steps.md` |
| UX audit of v2.71 (4 rider journeys, screenshots) | `ux-audit/REPORT.md` |
| Side-by-side comparison videos and action counts | `ux-audit/video/` (`out/steps.json`) |
| Rider interviews (video and rough transcripts) | `IMG_5521.*`, `IMG_5522.*` |
| Complaint research | `complaints.md` |
| NYC comparison and design requirements | `improvements.md` |
| Data check on METRO's developer portal | `data-feasibility.md` |
| Rider test script | `rider-test-plan.md` |
| Submission video work | `submission-video/` |

## 4. Before and after (measured by our team)

Expert actions (taps, typed fields, swipes, back presses, system dialogs) on an Android 14 emulator, RideMETRO v2.71 vs. the redesign. Source: `ux-audit/video/out/steps.json` and `docs/results.md`.

| Task | RideMETRO v2.71 | Redesign |
|---|---|---|
| First launch to a usable map | 14 | 3 |
| Plan UH to Hobby Airport and know where to board | 10 | 3 |
| Walking directions to a stop | dead end ("Cannot find any trips") | 2 |
| Route 82 live arrivals at a stop | 10 | 4 |
| Check a route alert | 6 (partial) | 2 |
| Start live trip tracking | 9 (partial) | 6 |

## 5. What's real and what's stubbed

| Part | Status |
|---|---|
| Stops, routes, schedules, transit centers and bays | **Real**: METRO's public GTFS feed (8,797 stops, 120 routes) |
| Live arrivals | **Real** with METRO API keys (METRO arrivals API and GTFS-RT); otherwise labeled scheduled |
| Service alerts | **Real** METRO alerts feed |
| Trip planning | **Real**, via Transitous (public MOTIS), not METRO's own planner |
| Walking directions | **Real** OSRM foot routing; straight-line estimate when the route is implausible |
| Base map | **Real** OpenFreeMap tiles, restyled to match the current app |
| Live trip | Real plan and times, driven by the phone's GPS; notifications are local (no push server) |
| My ticket | **Stub**: "Sign in to show ticket" hands off to METRO; no login or payment |
| Fare table | Hard-coded from METRO's public fare page, marked "Prices to be confirmed by METRO" |

## 6. Limits

- Action counts are team-measured expert actions on an emulator, not a formal user study.
- Rider research is small: a 20-person street survey and two recorded interviews. The redesign has not been tested with riders yet.
- Arrival accuracy and stop coordinates are METRO's data; we can label times honestly but not fix predictions.
- Fares, ticketing, accounts and payments are out of scope (ticket is a stub).
- Known rough edges are listed in `docs/results.md` (for example, no turn-by-turn walk steps for some downtown stops on live data).

## 7. Handoff

What METRO's team can reuse:
- **The whole reference app**, or pieces of it: the stop card with "Walk here" and side of street, the map-first home, itineraries on the map with where to board, the trip sheet that never discards a trip, the transit-center bay view.
- **The data layer**: everything runs on METRO's own public feeds (GTFS, GTFS-RT, alerts). GTFS is a standard every US transit agency publishes, so the same approach works in other cities.
- **The findings**: the v2.71 audit, baseline counts, before/after results and interview clips.

Next step: rider testing with newcomers (`rider-test-plan.md`). We'd be glad to walk METRO's team through the app, the code and the findings.
