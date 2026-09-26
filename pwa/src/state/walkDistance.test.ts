import { describe, expect, it } from "vitest";
import { recordWalkDistance } from "./walkDistance.ts";

describe("recordWalkDistance", () => {
  const from = { lat: 29.7563, lon: -95.3639 };

  it("keeps the first distance unless OSRM differs from an estimate by more than 10%", () => {
    expect(recordWalkDistance(from, "342", 200, "estimate")).toEqual({ distanceM: 200, source: "estimate" });
    // Within 10%: every screen keeps showing the number it already showed.
    expect(recordWalkDistance(from, "342", 215, "osrm")).toEqual({ distanceM: 200, source: "estimate" });
    expect(recordWalkDistance(from, "342", 260, "osrm")).toEqual({ distanceM: 260, source: "osrm" });
    // Once OSRM answered, nothing replaces it.
    expect(recordWalkDistance(from, "342", 400, "osrm")).toEqual({ distanceM: 260, source: "osrm" });
    expect(recordWalkDistance(from, "342", 100, "estimate")).toEqual({ distanceM: 260, source: "osrm" });
  });
});
