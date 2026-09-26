import { NavigationType } from "react-router";
import { describe, expect, it } from "vitest";
import { markTabTap, openedByTab, recordEntry } from "./tabEntries.ts";

describe("tabEntries", () => {
  it("marks the entry a BottomNav tap pushes, and keeps it through replaces", () => {
    recordEntry(1, NavigationType.Push); // More › Settings
    markTabTap();
    recordEntry(2, NavigationType.Push); // Explore tab reopens Select Itinerary
    expect(openedByTab(1)).toBe(false);
    expect(openedByTab(2)).toBe(true);
    recordEntry(2, NavigationType.Replace); // a sort change on the same screen
    expect(openedByTab(2)).toBe(true);
    recordEntry(3, NavigationType.Push);
    expect(openedByTab(3)).toBe(false);
  });

  it("forgets marks that a new push drops from history", () => {
    markTabTap();
    recordEntry(5, NavigationType.Push);
    recordEntry(4, NavigationType.Pop);
    recordEntry(5, NavigationType.Push);
    expect(openedByTab(5)).toBe(false);
  });
});
