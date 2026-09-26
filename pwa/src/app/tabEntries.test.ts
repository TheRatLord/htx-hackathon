import { describe, expect, it } from "vitest";
import { markTabTap, openedByTab, recordEntry } from "./tabEntries.ts";

describe("tabEntries", () => {
  it("marks the entry a BottomNav tap pushes, and keeps it through replaces", () => {
    recordEntry(1, "PUSH"); // More › Settings
    markTabTap();
    recordEntry(2, "PUSH"); // Explore tab reopens Select Itinerary
    expect(openedByTab(1)).toBe(false);
    expect(openedByTab(2)).toBe(true);
    recordEntry(2, "REPLACE"); // a sort change on the same screen
    expect(openedByTab(2)).toBe(true);
    recordEntry(3, "PUSH");
    expect(openedByTab(3)).toBe(false);
  });

  it("forgets marks that a new push drops from history", () => {
    markTabTap();
    recordEntry(5, "PUSH");
    recordEntry(4, "POP");
    recordEntry(5, "PUSH");
    expect(openedByTab(5)).toBe(false);
  });
});
