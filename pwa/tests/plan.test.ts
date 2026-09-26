import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizePlan, type TransitLeg, type TransitousPlan } from "../server/services/plan.ts";

const fixture = JSON.parse(readFileSync(join(import.meta.dirname, "fixtures/transitous-uh-to-hobby.json"), "utf8")) as TransitousPlan;
const req = { from: { name: "UH", lat: 29.7199, lon: -95.3422 }, to: { name: "Hobby Airport", lat: 29.6553, lon: -95.2758 } };

describe("plan normalization (recorded Transitous response UH -> Hobby)", () => {
  const res = normalizePlan(fixture, req);
  const first = res.itineraries[0];
  const rides = first.legs.filter((l): l is TransitLeg => l.type === "transit");

  it("keeps every itinerary", () => {
    expect(res.itineraries).toHaveLength(fixture.itineraries.length);
    expect(res.message).toBeUndefined();
  });

  it("names the boarding stop with id and direction, and the bus sign", () => {
    expect(rides[0]).toMatchObject({
      mode: "bus",
      route: { id: "080", name: "80" },
      headsign: "MLK & PARK VILLAGE",
      board: { id: "11424", directionLabel: "Southbound", side: "West side of M L King Blvd" },
    });
    expect(rides[0].numStops).toBe(rides[0].intermediateStops.length + 1);
    expect(rides[0].instruction).toContain('marked "MLK & PARK VILLAGE"');
    expect(rides[0].instruction).toContain("stop #11424, southbound");
  });

  it("computes transfer waits and flags tight connections", () => {
    const second = rides[1];
    const wait = (Date.parse(second.departureTime) - Date.parse(rides[0].arrivalTime)) / 60_000;
    expect(second.transfer).toEqual({ waitMin: Math.round(wait), tight: wait < 5, sameStop: false });
    expect(first.hasTightTransfer).toBe(rides.some((r) => r.transfer?.tight));
  });

  it("describes walking legs in US units with a link to turn-by-turn directions", () => {
    const walk = first.legs[0];
    expect(walk.type).toBe("walk");
    if (walk.type !== "walk") return;
    expect(walk.from.name).toBe("UH");
    expect(walk.distanceText).toMatch(/ft|mi/);
    expect(walk.walkDirectionsUrl).toMatch(/^\/api\/walk\?from=29\.71990,-95\.34220&to=.*&toStop=11424$/);
  });

  it("summarizes the trip", () => {
    expect(first.summary).toMatch(/^Leave \d+:\d\d [AP]M, arrive \d+:\d\d [AP]M · Route 80 → Route 73/);
  });

  it("explains an empty result instead of 'Cannot find any trips'", () => {
    const empty = normalizePlan({ itineraries: [], direct: [] }, req);
    expect(empty.itineraries).toEqual([]);
    expect(empty.message).toMatch(/No METRO trips found/);
  });
});
