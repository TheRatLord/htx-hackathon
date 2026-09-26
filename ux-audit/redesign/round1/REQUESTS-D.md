# Round 1, fixer D: shared-layer requests

Screens: welcome, alerts, recent, fares, more. These items need a change outside those folders.

1. **Spanish alert effect word (45-alerts-es):** `src/i18n/strings/common.ts` line ~413 `STOP_MOVED: "Parada cambiada de lugar"` wraps as a bold label. Use "Parada movida".
2. **Unused string:** Settings no longer shows the "Coming soon: Tiếng Việt · 中文 · العربية" line (34), so `common.comingSoon` (en and es) has no users. Delete it.
3. **Alert headline repeats the chip (28):** the demo alert headers start with "Route 5 Southmore…" / "Route 82 Westheimer:" under the [5] / [82] chip. The judges want a short headline ("Route 5 detour at Scott St"). That text comes from the demo alert fixtures (`server/`), so it needs a server change.
4. **E2E F10 at 412 fails on a home string (not mine):** `flows.spec.ts:106` still expects "Your route? Tap it:", but the current home screen doesn't show it. Update the goal text to whatever the home fixer picked.
5. **E2E F9 goal text:** Fares now shows the unconfirmed note once, under the title: "Prices to be confirmed by METRO." The F9 goal `"To be confirmed by METRO"` still matches, because `getByText` does a case-insensitive substring match. Tighten it if you want an exact match.
