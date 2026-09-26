# Round 4, fixer B (search, route, TC, route list): requests outside my files

1. **QA, `tests/e2e/flows.spec.ts` F5 goal (line ~244):** the Route page's expanded-stop walk button
   now reads "Walk 2 min" (18 asked for the minutes, like every other walk button). Change the goal
   `/^Walk$/` to `/^Walk \d+ min$/`. Without it F5 fails on wording only (1 action count unchanged: 4/<=4).
2. **FYI, F7 (not mine):** with the home fixer's new "earliest catchable bus" ranking in
   `RouteNearYou.tsx`, 8249 now comes before the Northwest TC card, so F7's
   `getByRole('button', { name: /^Route 58 / }).first()` expects the TC and fails. The F7 goal needs
   updating to the new order (or to find the TC card by name).
3. **FYI, D12 rubric (not mine):** during my run the itinerary logged "Explore hooks must be used
   inside ExploreLayout" (plan/trip owner, probably mid-edit by another fixer).
