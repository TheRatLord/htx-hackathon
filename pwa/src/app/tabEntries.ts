// History entries the BottomNav opened. "‹ Back" on one of them goes up to the screen's parent
// instead of back into the tab the rider came from (the Explore tab reopens the last trip screen
// as a new entry, so history.back() from there landed on Settings, Fares or Recent).

import type { NavigationType } from "react-router";

let tabTap = false;
const opened = new Set<number>();

/** Called from a BottomNav tap, just before it navigates. */
export const markTabTap = () => {
  tabTap = true;
};

/** Called once per location change with react-router's history index. */
export function recordEntry(idx: number, type: NavigationType) {
  if (type === "PUSH") {
    // A push drops every entry after it from history.
    for (const i of opened) if (i >= idx) opened.delete(i);
    if (tabTap) opened.add(idx);
  }
  // REPLACE keeps the entry (and its mark); POP moves between entries already recorded.
  tabTap = false;
}

export const openedByTab = (idx: number) => opened.has(idx);
