# Round 2: shared-layer requests from screen fixer A (Home, Stop, Walk)

1. **WalkButton (D4, 07):** from a place, the pill reads "4 min walk", and a visitor takes that to mean "from me". Add a visible `walkFrom.label` variant: "4 min from museum". Home passes `place.short`; a landmark short name would help, else "from there".
2. **SheetHeader overline (07):** "Near Houston Museum of Natural Science" wraps to 2 lines at 22sp. Add an optional `overline` prop ("Stops near") so the title can be the place name alone.
3. **SheetBanner location-off (36, 37):** the card takes about 380px. Add a compact one-row variant ("Location is off · Turn on") for use when a saved stop is shown above it. Home now puts the saved stop first and titles the sheet "Find your stop".
4. **ExploreSheet (36):** hide the ⌃ Show list chevron when the sheet has no list to expand (location off, no saved stop).
5. **Map scene label (16):** the Walk scene's selected-stop callout says "Lamar St". Riders asked for "Stop 342", as on the stop sheet. Walk passes `highlightStopId`, and the label is chosen in the shared map code.
6. **Map (36, 37):** the "Showing Downtown Houston" pill still sits over a rail icon.
7. **tests/e2e/flows.spec.ts F11** fails on the search result's "Closest stop … · Northbound" text. That is the search fixer's area, not A's.
