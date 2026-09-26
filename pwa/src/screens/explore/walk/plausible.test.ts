import { describe, expect, it } from "vitest";
import type { NearbyResponse, WalkRoute } from "../../../api/types.ts";
import { plausibleWalk, plausibleWalkM, withPlausibleWalks } from "./plausible.ts";

const from = { lat: 29.7563, lon: -95.3639 };
const s342 = { id: "342", name: "Lamar St @ Main St", lat: 29.7575, lon: -95.3632 };

describe("plausibleWalkM", () => {
  it("accepts a street detour and rejects the tunnel answer (945 m for a ~180 m walk)", () => {
    expect(plausibleWalkM(250, from, s342)).toBe(true);
    expect(plausibleWalkM(945, from, s342)).toBe(false);
  });
});

describe("withPlausibleWalks", () => {
  it("replaces an implausible OSRM distance by the estimate and re-sorts", () => {
    const data = {
      stops: [
        { stop: { id: "246", lat: 29.7566, lon: -95.3645 }, walkDistanceM: 60, walkSource: "osrm" },
        { stop: s342, walkDistanceM: 945, walkSource: "osrm" },
        { stop: { id: "259", lat: 29.7585, lon: -95.362 }, walkDistanceM: 400, walkSource: "estimate" },
      ],
    } as unknown as NearbyResponse;
    const out = withPlausibleWalks(data, from);
    expect(out.stops.map((s) => [s.stop.id, s.walkSource])).toEqual([
      ["246", "osrm"],
      ["342", "estimate"],
      ["259", "estimate"],
    ]);
    expect(out.stops[1].walkDistanceM).toBeLessThan(250);
  });

  it("returns the same object when every distance is plausible", () => {
    const data = { stops: [{ stop: s342, walkDistanceM: 200, walkSource: "osrm" }] } as unknown as NearbyResponse;
    expect(withPlausibleWalks(data, from)).toBe(data);
  });
});

describe("plausibleWalk", () => {
  it("turns an implausible OSRM walk into the one-step straight-line state", () => {
    const osrm = { source: "osrm", distanceM: 945, steps: [{}, {}, {}], geometry: { type: "LineString", coordinates: [] } } as unknown as WalkRoute;
    const walk = plausibleWalk(osrm, from, s342);
    expect(walk.source).toBe("straight-line-estimate");
    expect(walk.steps).toHaveLength(1);
    expect(walk.steps[0]).toMatchObject({ maneuver: "arrive", street: s342.name, distanceM: walk.distanceM });
  });
});
