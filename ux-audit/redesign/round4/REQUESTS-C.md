# Round 4: requests from fixer C (plan, itinerary, live trip)

1. **QA (`tests/e2e/flows.spec.ts` line 319, F8):** the goal "On the west side of M L King Blvd"
   fails at 412x800 only on the shared "West side of …" wording change (SHARED-FIXES follow-up 1).
   F3 passes at both sizes with the new plain-text Board line ("Board 80 at #11424 · 12:10 PM").
2. **QA (screens.spec.ts):** 21-plan-form now shows "Popular places" (Hobby Airport, TMC Transit
   Center, Downtown TC) when the rider has no recent or saved places. No change needed; noted so
   the reviewers don't read it as seeded data.
3. **Map (optional):** at 360x640 the ride-leg chips ("80", "73") are dropped on 24-360 for lack of
   room. That is acceptable; if MapView can shrink the chips at low zoom, they would show there too.
