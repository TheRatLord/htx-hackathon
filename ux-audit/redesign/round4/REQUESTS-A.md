# Round 4: requests from fixer A (home / stop / walk)

1. **QA (`tests/e2e/flows.spec.ts` F11):** the place screen now says "Walk times from the museum"
   under the place name (the pills say "4 min walk"). Match that line or `/4 min/` instead of
   `/walk from the museum/`, and "East side of Main St" instead of "On the east side of …".
2. **Shared `ui/NearbyStopCard` (07):** two cards share the name "Main St @ Remington Ln" (688, 2504).
   Their route rows already say NORTHBOUND / SOUTHBOUND and the side lines differ, but a direction
   on the title line ("… (688) · Northbound") would need a card prop, e.g. `titleSuffix`.
3. **Spec D3 order vs judge (06):** the judges ask to rank 8249 (2 min walk, bus in 2 min) above
   the Northwest TC card (11 min walk, 59 min). Spec D3 and decision #3 fix the TC card first, and
   F7 asserts it, so I left the order as it is. This needs a spec decision first.
4. **Shared `DepTimes` (06):** "59 min · 2:00 PM" mixes relative and clock time in one row. That
   comes from the shared rule that switches to a clock time after 60 min.
