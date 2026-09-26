# RideMETRO Redesign Concept (app)

A runnable mobile-web version of the RideMETRO redesign from the Houston Hackathon 2026 prototype: a map-first home screen that asks "Where to?", all route options on the map at once, and honest Live / Scheduled / Tracking lost labels on every time.

**This is a concept with sample data.** Nothing here talks to METRO, and no account, key or backend is needed.

Built with Vite, React, TypeScript and MapLibre GL. Best viewed at phone size (390 x 844). On a desktop the app shows as a centred phone-sized column.

## Run it

Requires Node.js 20 or newer.

```bash
cd app
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173). In Chrome DevTools, switch on device mode (iPhone 12/13/14, 390 x 844) to try pinch zoom and sheet dragging with touch.

## Check it

```bash
npm run typecheck   # TypeScript, no emit
npm test            # Vitest unit and component tests
npm run build       # production build into dist/
npm run test:e2e    # Playwright smoke test at 390 x 844 (builds and serves dist/ itself)
npm run screenshots # rewrites screenshots/ (every screen, light and dark)
```

Playwright uses the Chromium at `/opt/pw-browsers` when it exists. Elsewhere, run `npx playwright install chromium` once.

## Deploy as a static site

`npm run build` writes a self-contained static site to `app/dist/`. It uses relative asset paths and hash URLs (`#/fares`), so it works from any host and any sub-path with no server rewrites:

- **Netlify / Cloudflare Pages / Vercel:** base directory `app`, build command `npm run build`, output directory `dist`.
- **GitHub Pages:** build, then publish the contents of `app/dist/` (for example with the `actions/upload-pages-artifact` and `actions/deploy-pages` actions, or by pushing `dist/` to a `gh-pages` branch).
- **Anywhere else:** copy `dist/` to any static file host or bucket. `npm run preview` serves it locally the same way.

The map needs no tile server, so the deployed site also works offline once loaded.

## Screens

| Screen | URL | What to try |
|---|---|---|
| Home | `#/` | Map with the sheet tucked away, "Where to?", Home and Work chips. Drag the map, pinch/scroll/+/- to zoom. |
| Nearby stops | `#/nearby` | Pull the sheet up. Pins 1, 2, 3 are numbered by distance and match the cards. |
| Search | `#/search` | Type "zoo", or tap Home or Work. |
| Route options | `#/routes/houston-zoo` | Three routes on the map. Sort by Fastest or Least walking. Tap a card, a letter badge or a line. |
| Trip steps | `#/trip/houston-zoo/A` | Start trip, Save trip, End trip. |
| Stop | `#/stop/wheeler-bay-f` | Live and Scheduled labels, the familiar timetable. |
| Tracking lost | `#/stop/fannin-alabama` | Pick the 65 tab, tap Report a problem. |
| Fares | `#/fares` | Sample boarding code, "Trouble scanning? Enlarge code". |
| Recent / More | `#/recent`, `#/more` | Saved places and trips, appearance (System, Light, Dark). |

## What is faked

- **All data is sample data.** Places, stops, routes, times, timetables and fares are made up, except the Wheeler Transit Center Bay F stop name and the "5 Eastbound to Richey St" route, which come from screenshots of the current app.
- **The clock is frozen at 4:19 PM**, so every run looks the same.
- **The map is a hand-drawn stand-in.** It is a real MapLibre map (pan, pinch, scroll and button zoom), but its streets, parks, water and freeway are a simplified grid of Midtown and Museum Park generated in `src/map/basemap.ts`. It is not real map data and not to scale street by street.
- **"You are here" is fixed**; there is no GPS.
- **Trip planning is simulated.** The Houston Zoo trip is hand-made to match the storyboard; other destinations get three generated options.
- **Live / Scheduled / Tracking lost** are sample labels; no bus is tracked. There are no moving buses.
- **Report a problem** goes nowhere; it only shows "Reported. Thank you."
- **The boarding code is a sample QR code**, not a valid fare. "Screen brightness is set to full", Face ID and "Add to Wallet" are described, not implemented.
- **Loading states are simulated** with a short delay so they can be seen.
- **Saved places, saved trips, recents and the theme choice** are kept in this browser's local storage only. There are no accounts.
- The line "Route and arrival data provided by permission of METRO" is intentionally not shown, because no METRO data is used. Every screen shows "Concept with sample data" instead.

## Project layout

```
src/
  app/          App shell, hash router, rider state (store), hooks
  components/   Bottom sheet, tab bar, page layout, icons, shared UI
  map/          MapView, offline basemap and style, pins, controls, scene API
  data/         Sample data and types
  lib/          Trip planning, sorting, formatting, geo helpers
  screens/      One folder per screen
  styles/       Design tokens (8px grid, type scale, colours, motion) and globals
e2e/            Playwright smoke and screenshot specs
screenshots/    Every screen in light and dark mode at 390 x 844
```

Screens never talk to MapLibre directly: they describe what the map should show with `useMapScene()` and the one shared `MapView` draws it.

## Accessibility and motion

- Atkinson Hyperlegible throughout, one type scale, large tap targets (48 px minimum), strong contrast in light and dark mode.
- Dark mode follows the system setting, or pick one under More > Appearance.
- `prefers-reduced-motion` turns off transitions, sheet animation and camera animation.
