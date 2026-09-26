# RideMETRO PWA (redesign prototype)

A mobile web app for METRO Houston riders: a Hono API (`server/`) over the METRO GTFS feed and
real-time sources, and a Vite + React frontend (`src/`). The build spec is
[`docs/design/spec.md`](../docs/design/spec.md); it is the source of truth for every screen.

## Setup

```sh
cd pwa
npm install
npm run data:build        # once: generates server/data/generated/ from the METRO GTFS feed
```

API keys (optional) go in the repo-level `.env` (gitignored): `METRO_API_KEY` (GTFS-RT and alerts)
and `METRO_TRANSIT_API_KEY` (per-stop arrivals, vehicles). Without them the API serves the
schedule only. Never commit or print them.

## Running

| Command | What it does |
|---|---|
| `npm run dev` | API (`server:dev`, port `PORT`, default 8787) and web (`web:dev`, port `WEB_PORT`, default 5173) together |
| `npm run server:dev` | API only, with reload |
| `npm run web:dev` | Vite dev server; `/api` is proxied to `http://localhost:$API_PORT` (default: `PORT`, else 8787) |
| `npm run web:build` / `npm run web:preview` | Type-check and build the PWA into `dist/`, then serve it |
| `npm run typecheck` / `npm run typecheck:web` | Server and frontend type checks |
| `npm test` | Vitest: API tests (`tests/`) and frontend unit tests (`src/**/*.test.ts`), offline |

Useful env flags for the API: `OFFLINE=1` (recorded fixtures only, no network), `DEMO_REALTIME=1`
(simulated live times, shown as "Live (demo)"), `RECORD_FIXTURES=1`.

To run an isolated pair next to another checkout, pick free ports:

```sh
PORT=8790 npm run server:dev &
WEB_PORT=5180 API_PORT=8790 npm run web:dev
```

Open <http://localhost:5173/explore>. `?demoLoc=29.7563,-95.3639` pins a demo GPS fix for the
session (`?demoLoc=off` clears it). `/dev/ui` shows every shared component.

**Android emulator:** geolocation needs a secure context, so run `adb reverse tcp:5173 tcp:5173`,
open `http://localhost:5173` in Chrome on the emulator, and set the GPS with `adb emu geo fix <lon> <lat>`.

## Screenshots: `scripts/shoot.ts`

A Playwright (Chromium) CLI for checking screens without a device:

```sh
npx tsx scripts/shoot.ts --url http://localhost:5173/explore --out /tmp/explore.png \
  --w 360 --h 640 --lat 29.7563 --lon -95.3639 --wait-ms 2000
```

| Option | Default | Meaning |
|---|---|---|
| `--url`, `--out` | required | Page to load and PNG to write |
| `--w`, `--h` | 412, 800 | Viewport in CSS px (device scale 2, mobile, touch) |
| `--lat`, `--lon` | none | Grants geolocation with this fix |
| `--wait-ms` | 3000 | Wait after load and actions, before the shot |
| `--actions` | none | JSON list run in order: `{"click": target}`, `{"fill": [target, text]}`, `{"press": "Enter"}`, `{"wait": ms}`. A target is visible text, unless it starts with `css=`, `text=`, `xpath=` or `#` (then it is a selector, e.g. `css=button[aria-pressed]`) |
| `--storage` | `{"ridemetro.prefs":{"welcomed":true}}` | localStorage seed (JSON values); `'{}'` shows first launch |
| `--full` | off | Full-page shot (unrolls the app's scrolling `<main>`) |

Console errors, page errors and failed requests are printed. The Playwright version is pinned to
match the Chromium build installed under `~/.cache/ms-playwright`; if it is missing, run
`npx playwright install chromium`.

## Layout

```
server/        Hono API (see server/app.ts for endpoints)
shared/        types shared by the data build, the API and the UI
src/app/       router (URL contract, spec G.3), AppShell (persistent map, nav), layouts, ExploreChrome hooks
src/api/       fetch client, TanStack Query hooks, alerts store, types re-exported from the server
src/lib/       pure helpers (formatting, walk time, plan query, fares, alerts) with unit tests
src/state/     location, offline, preferences, saved stops, recents, trip, shared clock, install prompt
src/i18n/      t()/useT(); strings/common.ts is shared, each module adds its own strings file
src/map/       the single MapLibre map and the Scene API screens use to drive it
src/ui/        every shared component (spec section C); props in src/ui/types.ts
src/screens/   one folder per screen (module-owned); /dev/ui is the component gallery
```

Screens compose `src/ui` components and never restyle them. A module that needs a change to a
shared file (`src/ui`, `src/map`, `src/api`, `src/lib`, `src/state`, `src/app`) files a note in
[`docs/design/requests.md`](../docs/design/requests.md).

**Strings:** each file in `src/i18n/strings/` exports `{ en, es }`; nested keys flatten to
`"namespace.key"`. Use the file name as your top-level namespace (`home.*`, `stop.*`, …).
`common.ts` owns `common`, `nav`, `map`, `banner`, `time`, `status`, `schedule`, `strip`, `card`,
`routeName`, `headsign`, `dir`, `compassStop`, `side`, `sideOn`, `stopLine`, `units`, `walkStep`,
`compass`, `canMakeIt`, `legend`, `updated`, `alert`, `bay`, `chips`, `notify`, `error`, `fareLine`, `timeline`.
