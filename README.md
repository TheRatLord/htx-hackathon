# RideMETRO redesign: a reference app

This repository contains a working redesign of the RideMETRO app for METRO Houston. We
made it for Houston Hackathon 2026. We are not affiliated with or represent METRO.

The app is a **reference**. Use it to see how the rider experience can be improved. Open the
live app, do real rider tasks, and do the same tasks in the current app. The code is
available, but the code is not the main product.

**Open the live app:** <https://htx-ride-metro.vercel.app>

Use a phone. The app also works on a computer. It runs in the browser, so you do not
need an app store.

Not in Houston? Open the app with a demo location in downtown Houston:
<https://htx-ride-metro.vercel.app/explore?demoLoc=29.7563,-95.3639>

## What to try

Each task uses METRO's real stops, schedules, and live feeds.

| Task | How to do it |
|---|---|
| Find the next bus near you | Tap **Show stops near me**, then allow location. |
| Find a route near you | Tap a route number at the top of the map. |
| Plan a trip | Search for a place (for example, "hobby"), then tap **Directions**. Each option shows where to board. |
| Walk to a stop | Tap a stop pin, then tap **Walk here**. The app shows the stop ID and the side of the street. |
| Follow a trip | Plan a trip, then tap **Start trip**. Drag the sheet down to see the map. The app keeps the trip. |
| Check alerts | Search for a route number. The route page shows its alerts. |
| Change the language | Tap **More** > **Language**, then select **Español**. |
| Make the text larger | Tap **More** > **Text size**, then select **Extra large**. |

This app is a Progressive Web App, so to install the app on Android, open the Chrome menu and select **Install app**. On an
iPhone, tap **Share** in Safari, then select **Add to Home Screen**.

## Real Functionalities

| Part | Source |
|---|---|
| Stops, routes, schedules, transit center bays | METRO public GTFS feed |
| Live arrivals and alerts | METRO real-time feeds. If a time is not live, the app labels it "scheduled". |
| Trip planning | Transitous (public MOTIS), not METRO's planner |
| Walking directions | OSRM foot routing |
| Ticket | Stub. The app sends you to METRO to sign in. |
| Fares | Copied from METRO's public fare page. Not confirmed by METRO. |

## Results

We measured expert actions on a real phone. An action is considered as any tap, a typed field,
a swipe, a back press, or a system dialog.

| Task | RideMETRO v2.71 | Redesign |
|---|---|---|
| First launch to a usable map | 14 | 3 |
| Plan a trip and know where to board | 10 | 3 |
| Walking directions to a stop | Not possible | 2 |
| Live arrivals for a route at a stop | 9 | 4 |
| Start live trip tracking | 9 (partial) | 6 |

These counts are not a formal user study. We have not tested the redesign with riders yet.
For all results, see [`docs/results.md`](docs/results.md).

## What is in this repository

| Path | Contents |
|---|---|
| [`overview.md`](overview.md) | The project summary: problem, solution, and handoff |
| [`pwa/`](pwa/) | The app: a Vite and React frontend with a Hono API |
| [`docs/design/spec.md`](docs/design/spec.md) | The design spec for each screen |
| [`docs/results.md`](docs/results.md) | Before and after results |
| [`ux-audit/REPORT.md`](ux-audit/REPORT.md) | Our audit of RideMETRO v2.71, with screenshots |
| [`complaints.md`](complaints.md) | Rider complaints and store reviews |
| [`improvements.md`](improvements.md) | Design requirements and a comparison with New York City apps |
| [`rider-test-plan.md`](rider-test-plan.md) | A script for tests with riders |

## Run the app locally

You need Node.js 24 or later.

1. Install the dependencies:

   ```sh
   cd pwa
   npm install
   ```

2. Build the transit data from the METRO GTFS feed. Do this one time:

   ```sh
   npm run data:build
   ```

3. Start the API and the web app:

   ```sh
   npm run dev
   ```

4. Open <http://localhost:5173/explore>.

Without API keys, the app shows scheduled times only. To get live times, add
`METRO_API_KEY` and `METRO_TRANSIT_API_KEY` to a `.env` file at the repository root. Do not
commit this file.

For tests, deployment, and other commands, see [`pwa/README.md`](pwa/README.md).
