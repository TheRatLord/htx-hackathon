# Round 3, fixer B (search, route, TC, route list): requests outside my paths

1. **tests/e2e/flows.spec.ts:346 (F11), needs updating.** Search 10 now uses the same closest-stop sub-row as Hobby (08): "Closest stop: Main St @ Remington Ln (688)" / "Northbound · 4 min walk" is its own tappable button under the Directions / Stops near pills, not text inside the place button. The check should target the sub-row, for example:
   `await expect(page.getByRole("button", { name: /^Closest stop: Main St @ Remington Ln \(688\)/ })).toContainText(/Northbound/);`
   The flow is unchanged (3 actions: search bar, type, Stops near). Until then F11 fails at that line at both sizes.
2. **Search 09, the 'Demo' tag on the alert** (AlertStatusLine, shared): must go before release (judge note). Not changed.
3. **Home / RouteNearYou (05, 06, F1, F11 soft misses)** belong to the home owner, not me: the map tags (tagStopIds), the TC bay marker, the chip sort and the fold.
