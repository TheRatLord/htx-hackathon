# Claude Code Brief: Build the RideMETRO Concept (Polished, Bare Bones)

Paste the prompt below into Claude Code, opened in the `ride metro` folder.

---

## Prompt

Read `overview.md`, `improvements.md` (especially section 4) and look at the images in `demo/` (start with `storyboard.png`). They show a clickable RideMETRO redesign prototype I made in a design tool. Build it as a real, runnable mobile-web app that looks far more polished than those screenshots.

**Scope: bare-bones working concept.** Sample data only. No backend, no accounts, no real METRO data. It must run locally with one command and be deployable as a static site.

**Screens and behavior (match the storyboard):**
1. Home: full-screen map, a bottom sheet that starts tucked away, and a "Where to?" search bar. Home and Work shortcuts.
2. Nearby stops: pull the sheet up to see stops sorted by distance, numbered pins 1, 2, 3 on the map (numbers by distance, not real stop numbers).
3. Search: type "zoo" to get a result, or tap Home or Work.
4. Route options: three routes drawn on the map at once, cards below, sort by Fastest or Least walking, tap a card or pin to select.
5. Trip steps and Start trip, Save trip, End trip.
6. Stop screen: keep the original schedule format, restyled. Times are labeled Live, Scheduled, or Tracking lost. Tracking lost shows a Report button that answers "Reported. Thank you."
7. Fares tab: boarding code with "Trouble scanning? Enlarge code" toggle. The code is a sample.
8. Recent and More tabs, saved places and trips.
- Map supports drag to pan and pinch, scroll and +/- to zoom. Use a real tile map library with a muted, clean style. No moving buses.

**Visual direction (this is the main goal):**
- Keep RideMETRO's glassy, premium feel: translucent blurred panels, soft shadows, generous radius, refined spacing on an 8px grid.
- One consistent type scale and one accent color family. Use Atkinson Hyperlegible or a similarly legible font.
- Smooth, restrained motion: sheet drag with snap points, route card selection, screen transitions. Respect reduced-motion.
- Large tap targets, strong contrast, dark mode.
- Every state designed: empty, loading, tracking lost, reported.
- Show "Route and arrival data provided by permission of METRO" only if real data is ever added; for now show a small "Concept with sample data" label.

**Build approach:**
1. Propose the stack in two lines (suggest Vite + React + TypeScript + MapLibre), then build it.
2. Get home, map and sheet working and looking great first, then add screens one at a time, running the app and checking screenshots at phone size (390x844) after each.
3. Finish with a polish pass: alignment, spacing, contrast, transitions. Compare against `demo/` screenshots and improve on them.
4. Put everything in a new `app/` folder. Do not touch the existing `.md` files, `demo/`, `tools/` or `ux-audit/`. Add a short `app/README.md` with run and deploy steps.
5. Do not commit or push. I will do that.

Keep the final message short: how to run it, and what is faked.
