# Baseline: steps per rider flow in RideMETRO v2.71

Measured on 4 Android 14 emulators on 2026-09-25. For each flow, one agent measured the shortest path, then a second agent tried to find a shorter one and checked that the goal was really reached.

- **Actions** = taps + typed fields + swipes + back presses + system dialogs + coach-mark dismissals.
- **Screens** = distinct screens, sheets, dialogs and pickers passed through.
- **Expert** = the shortest path an experienced rider can take.
- **First-timer** = the same flow the first time, including coach marks and discovery.

Raw per-step data is in `docs/baseline-flows.json`. Screenshots are in `ux-audit/baseline/<flow>/`; they are not committed because of their size (246 MB).

| Flow | Goal | Reached? | Expert actions | Screens | First-timer actions | What's missing even on the best path |
|---|---|---|---|---|---|---|
| F10 | First launch → usable map | yes | **14** | 15 | 14 | 3 permission explainers, 3 OS dialogs, an intro card and 7 coach marks, with no skip. The map silently falls back to Museum District when there is no fix. |
| F1 | Nearest stop for Route 40 NB, plus next bus | yes | **2** | 3 | 4 | Works only if you notice the unlabeled route chips. No distance or walk time is shown, so "nearest" can't be checked. |
| F2 | Returning commuter: next 82 at my stop (#2958) | yes | **3** | 4 | 5 | No favorites. You have to go through Recent, and a tip sheet covers the arrivals. |
| F3 | Plan UH → Hobby and know exactly where to board | yes* | **10** | 10 | 13 | The itinerary never shows the stop ID, direction or headsign. *These are only found by leaving the planner. |
| F4 | Walking directions to stop #342 | **no** | 3 (to dead end) | 4 | 8 | There are no walking directions anywhere. The planner says "Cannot find any trips". |
| F5 | Route 82 → its stops → live EB arrivals at Westheimer @ Montrose | yes | **9** | 8 | 18 | The only stop list is a raw timetable, with no search and no jump to now. The 9-action path depends on a lucky fling. |
| F6 | Is there an alert on Route 82? | partial | **6** | 5 | 11 | Alerts open in an external browser. "No alerts for 82" is never stated. |
| F7 | Northwest TC: which bay for Route 58, next departure | yes | **2** | 3 | 14 | No departures-by-bay view. The bay only appears at the last step. |
| F8 | Start live trip tracking (from launch) | partial | **9** | 9 | 10 | The only feedback is a small bell icon: no guidance, no notification, no "tracking" status. |
| F9 | Reach the ticket / fare screen | no (login wall) | 1 | 2 | 2 | Out of scope (login and payment). No fare table or reduced-fare info is shown in the app. |
| F11 | Landmark (HMNS) → closest stop → next arrivals | partial | **6** | 5 | 7 | Never says which stop is closest or how far it is. Arrivals are shown for one route only. |

## Redesign targets

Targets count expert actions from launch. Every target flow must fully reach its goal, with the missing information above on screen.

| Flow | Baseline | Target | How |
|---|---|---|---|
| F10 | 14 | ≤ 3 | One welcome screen and location permission only. Notifications are asked when tracking starts. No coach marks. |
| F1 | 2 (4 first-timer) | ≤ 1 | The home sheet lists the nearest stops by walk time, with direction and next buses per route. |
| F2 | 3 | 0 (after saving once) | Saved stops with live times sit at the top of the home sheet. |
| F3 | 10 | ≤ 4 | "Where to?" → pick → choose an itinerary. The boarding stop ID, direction, side and headsign are in the itinerary. |
| F4 | impossible | ≤ 2 | A "Walk here" button on every stop card, with a street-routed path and US-unit steps. |
| F5 | 9 (18) | ≤ 4 | A route page with a searchable ordered stop list and live times per stop. |
| F6 | 6, partial | ≤ 2 | Alerts in the app on the route, stop and itinerary, including an explicit "No alerts for Route 82". |
| F7 | 2 (14) | ≤ 2 | Transit Center view with departures grouped by bay. |
| F8 | 9, partial | ≤ 5 | "Start trip" on the itinerary, with a live step card and stops remaining. |
| F9 | 1 (wall) | 1 | Stub ticket screen plus a fare table, including reduced fares. |
| F11 | 6, partial | ≤ 3 | Search the landmark → stops near it sorted by walk time, with all routes. |
