import { describe, expect, it } from "vitest";
import { canMakeIt, estimateWalk, walkMinutes } from "./walk.ts";

describe("walkMinutes", () => {
  it("uses one formula per pace, never below 1", () => {
    expect(walkMinutes(10, "normal")).toBe(1);
    expect(walkMinutes(150, "normal")).toBe(2);
    expect(walkMinutes(825, "normal")).toBe(11);
    expect(walkMinutes(825, "slower")).toBe(15);
  });

  it("estimates from straight-line distance with the detour factor", () => {
    const w = estimateWalk({ lat: 29.7563, lon: -95.3639 }, { lat: 29.7563, lon: -95.3629 }, "normal");
    expect(w.distanceM).toBeGreaterThan(120);
    expect(w.distanceM).toBeLessThan(130);
    expect(w.minutes).toBe(2);
  });
});

describe("canMakeIt", () => {
  const now = Date.parse("2026-09-26T00:00:00Z");
  const dep = (min: number) => ({ departureTime: new Date(now + min * 60_000).toISOString() });
  it("is no when the bus leaves before you arrive, tight within 2 minutes, else yes", () => {
    expect(canMakeIt(1, dep(0.5), now)).toBe("no");
    expect(canMakeIt(3, dep(4.9), now)).toBe("tight");
    expect(canMakeIt(3, dep(5), now)).toBe("yes");
  });
});
