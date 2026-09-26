import { describe, expect, it } from "vitest";
import { hourRows } from "./hours.ts";

// Houston is UTC-5 in September.
const dep = (utc: string) => ({ departureTime: `2026-09-${utc}Z` });

describe("hourRows", () => {
  it("groups by Houston clock hour", () => {
    const rows = hourRows([dep("26T00:05:00"), dep("26T00:35:00"), dep("26T01:10:00")], "en");
    expect(rows.map((r) => [r.label, r.minutes])).toEqual([
      ["7 PM", ["05", "35"]],
      ["8 PM", ["10"]],
    ]);
  });

  it("keeps service after midnight as its own rows at the end", () => {
    // 11:50 PM, then 12:20 AM and 12:40 AM the next calendar day: the 12 AM row is not merged with any earlier one.
    const rows = hourRows([dep("26T04:50:00"), dep("26T05:20:00"), dep("26T05:40:00")], "en");
    expect(rows.map((r) => [r.label, r.minutes])).toEqual([
      ["11 PM", ["50"]],
      ["12 AM", ["20", "40"]],
    ]);
    expect(new Set(rows.map((r) => r.key)).size).toBe(2);
  });
});
