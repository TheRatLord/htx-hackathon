import { describe, expect, it } from "vitest";
import type { TransitLeg, TripDetail } from "../../api/types.ts";
import { ridePosition, rideStops, stepDone } from "./progress.ts";
import { simPosition } from "./simulate.ts";
import { countedSteps, tripSteps } from "./steps.ts";
import { ALIGHT_80, BOARD_73, BOARD_80, HOBBY, itinerary } from "./testItinerary.ts";
import { itineraryTimeline, rowForStep } from "./timeline.ts";

const ride80 = itinerary.legs[1] as TransitLeg;
const t = (iso: string) => Date.parse(iso);

describe("tripSteps", () => {
  it("walks, waits and rides each leg, then a final walk and Arrived (step 1 of 7)", () => {
    const steps = tripSteps(itinerary, HOBBY);
    expect(steps.map((s) => s.kind)).toEqual(["walk", "wait", "ride", "walk", "wait", "ride", "final", "arrived"]);
    expect(countedSteps(steps)).toBe(7);
    expect(steps[3]).toMatchObject({ kind: "walk", ride: { board: BOARD_73 } });
  });

  it("starts with Wait when the trip starts at a stop", () => {
    const fromStop = { ...itinerary, legs: itinerary.legs.slice(1) };
    expect(tripSteps(fromStop, HOBBY)[0].kind).toBe("wait");
  });
});

describe("rideStops", () => {
  it("takes order from /trips and times from the itinerary", () => {
    const trip = {
      tripId: "trip-80",
      stops: [
        { id: BOARD_80.id, name: BOARD_80.name, lat: BOARD_80.lat, lon: BOARD_80.lon, scheduledTime: "2026-09-27T12:00:00Z", stopsAway: 0 },
        { id: "11474", name: "Wheeler", lat: 29.71, lon: -95.339, scheduledTime: "2026-09-27T12:04:00Z", stopsAway: 1 },
        { id: ALIGHT_80.id, name: ALIGHT_80.name, lat: ALIGHT_80.lat, lon: ALIGHT_80.lon, scheduledTime: "2026-09-27T12:20:00Z", stopsAway: 2 },
        { id: "9999", name: "Beyond", lat: 29.6, lon: -95.33, scheduledTime: "2026-09-27T12:30:00Z", stopsAway: 3 },
      ],
    } as TripDetail;
    const stops = rideStops(ride80, trip);
    expect(stops.map((s) => s.id)).toEqual(["11424", "11474", "3938"]);
    expect(stops[1].time).toBe(t("2026-09-26T00:09:00Z"));
  });

  it("falls back to the leg's own stops, spread evenly, without /trips", () => {
    const stops = rideStops(ride80);
    expect(stops).toHaveLength(5);
    expect(stops[0].point).toBeDefined();
    expect(stops[2].point).toBeUndefined();
    expect(stops[4].time).toBe(t(ride80.arrivalTime));
  });
});

describe("ridePosition", () => {
  const stops = rideStops(ride80);

  it("uses a fix near a stop, and never moves back", () => {
    expect(ridePosition(stops, 0, { fix: ALIGHT_80, now: 0, useClock: true })).toEqual({ index: 4, source: "location" });
    expect(ridePosition(stops, 4, { fix: BOARD_80, now: 0, useClock: true }).index).toBe(4);
  });

  it("falls back to the clock, but not for recorded trips", () => {
    const now = t("2026-09-26T00:16:00Z");
    expect(ridePosition(stops, 0, { now, useClock: true })).toEqual({ index: 2, source: "schedule" });
    expect(ridePosition(stops, 0, { now, useClock: false })).toEqual({ index: 0, source: "none" });
  });
});

describe("stepDone", () => {
  const steps = tripSteps(itinerary, HOBBY);
  const base = { now: t("2026-09-26T00:00:00Z"), useClock: true };

  it("ends a walk within 40 m of the stop", () => {
    expect(stepDone(steps[0], { ...base, fix: { lat: 29.7182, lon: -95.3396 } })).toBe(true);
    expect(stepDone(steps[0], { ...base, fix: { lat: 29.7199, lon: -95.3422 } })).toBe(false);
  });

  it("ends a wait when the bus has left, by the clock only for live trips", () => {
    const late = t("2026-09-26T00:07:00Z");
    expect(stepDone(steps[1], { ...base, now: late })).toBe(true);
    expect(stepDone(steps[1], { ...base, now: late, useClock: false })).toBe(false);
  });

  it("ends a ride at the alight stop", () => {
    expect(stepDone(steps[2], { ...base, rideIndex: 3, rideStopCount: 5 })).toBe(false);
    expect(stepDone(steps[2], { ...base, rideIndex: 4, rideStopCount: 5 })).toBe(true);
  });
});

describe("timeline", () => {
  const rows = itineraryTimeline(itinerary, { fromName: "My current location", toName: "Hobby Airport", pace: "normal", lang: "en" });

  it("has a row per walk, boarding, getting off and the arrival", () => {
    expect(rows.map((r) => r.role)).toEqual(["walk", "board", "alight", "walk", "board", "alight", "final", "arrive"]);
    expect(rows[1].step.title).toBe("Board to MLK & PARK VILLAGE");
    expect(rows[2].step.title).toBe("Get off at M L King Blvd @ Bellfort (#3938)");
    expect(rows[3].step.lines[0]).toContain("wait 9 min");
    expect(rows[0].href).toMatch(/^\/explore\/stop\/11424\/walk\?/);
  });

  it("marks the ride's boarding row as You are here", () => {
    const steps = tripSteps(itinerary, HOBBY);
    expect(rowForStep(rows, steps[2])).toBe(1);
    expect(rowForStep(rows, steps[7])).toBe(7);
  });
});

describe("simPosition", () => {
  const legs = [{ coords: [[-95.34, 29.72], [-95.34, 29.73]] as [number, number][], mps: 100 }];

  it("moves along the path and stops at its end", () => {
    const start = simPosition(legs, 0)!;
    const mid = simPosition(legs, 5)!;
    expect(start.lat).toBeCloseTo(29.72, 4);
    expect(mid.lat).toBeGreaterThan(29.724);
    expect(mid.lat).toBeLessThan(29.726);
    expect(simPosition(legs, 1000)!.lat).toBeCloseTo(29.73, 6);
  });
});
