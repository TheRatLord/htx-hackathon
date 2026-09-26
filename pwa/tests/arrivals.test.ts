import { afterEach, describe, expect, it } from "vitest";
import { config } from "../server/config.ts";
import { serviceDayStart } from "../server/lib/time.ts";
import { getArrivals } from "../server/services/arrivals.ts";

// Wednesday 2026-09-30, 5:00 PM in Houston (CDT, UTC-5).
const NOW = serviceDayStart("20260930") + 17 * 3600_000;

afterEach(() => {
  config.demoRealtime = false;
});

describe("arrivals", () => {
  it("returns scheduled departures in time order, never in the past", async () => {
    const res = await getArrivals("11424", { now: NOW, limit: 10 });
    expect(res.realtimeSources).toEqual([]);
    expect(res.arrivals.length).toBe(10);
    const times = res.arrivals.map((a) => Date.parse(a.departureTime));
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(times[0]).toBeGreaterThanOrEqual(NOW - 30_000);
    for (const a of res.arrivals) {
      expect(a).toMatchObject({ isRealtime: false, source: "schedule", delaySeconds: 0 });
      expect(["25", "80"]).toContain(a.routeShortName);
    }
  });

  it("filters by route", async () => {
    const res = await getArrivals("11424", { now: NOW, routeId: "80" });
    expect(res.arrivals.every((a) => a.routeShortName === "80" && a.directionLabel === "Southbound")).toBe(true);
  });

  it("keeps ordering by predicted time and flags simulated data", async () => {
    config.demoRealtime = true;
    const res = await getArrivals("342", { now: NOW, limit: 15 });
    expect(res.realtimeSources).toEqual(["simulated"]);
    const times = res.arrivals.map((a) => Date.parse(a.departureTime));
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(res.arrivals.some((a) => a.source === "simulated" && a.isRealtime)).toBe(true);
    const again = await getArrivals("342", { now: NOW, limit: 15 });
    expect(again.arrivals).toEqual(res.arrivals);
  });

  it("returns departures after midnight from the previous service day", async () => {
    const lateNight = serviceDayStart("20261001") + 30 * 60_000; // 12:30 AM
    const res = await getArrivals("25024", { now: lateNight, limit: 3 });
    expect(res.arrivals.length).toBeGreaterThan(0);
  });

  it("explains unknown stops", async () => {
    await expect(getArrivals("99999999")).rejects.toThrow(/couldn't find stop #99999999/);
  });
});
