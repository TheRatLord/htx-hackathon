import { describe, expect, it, vi } from "vitest";
import { formatDistance } from "../server/lib/geo.ts";
import { describeSteps, walkRoute, type WalkModifier } from "../server/services/walk.ts";
import { implausibleWalk } from "../shared/walk.ts";

// A downtown start snapped onto the pedestrian tunnels: 945 m routed for a 136 m walk to stop 342.
vi.mock("../server/lib/upstream.ts", async (importActual) => {
  const actual = await importActual<typeof import("../server/lib/upstream.ts")>();
  return {
    ...actual,
    fetchUpstream: vi.fn(() =>
      Promise.resolve({
        body: {
          code: "Ok",
          routes: [{ distance: 945, duration: 700, geometry: { coordinates: [] }, legs: [{ steps: [] }] }],
        },
      }),
    ),
  };
});

const step = (type: string, modifier: WalkModifier | undefined, name: string, distance: number, bearing = 0) => ({
  distance,
  name,
  maneuver: { type, modifier, bearing_after: bearing, location: [-95.34, 29.72] as [number, number] },
});

describe("walking steps", () => {
  it("produces short plain-English instructions in feet and miles", () => {
    const steps = describeSteps(
      [
        step("depart", undefined, "Calhoun Road", 260, 120),
        step("turn", "left", "Main Street", 100),
        step("new name", "straight", "Main Street", 3),
        step("turn", "right", "", 700),
        step("arrive", "right", "", 0),
      ],
      { label: "stop #11424", name: "M L King Blvd @ UH University Dr" },
    );
    expect(steps.map((s) => s.instruction)).toEqual([
      "Head southeast on Calhoun Road, walk 850 ft",
      "Turn left onto Main Street, walk 350 ft",
      "Turn right, walk 0.4 mi",
      "Arrive at stop #11424 on your right",
    ]);
    expect(steps[0]).toMatchObject({ maneuver: "depart", compass: "southeast", street: "Calhoun Road" });
    expect(steps.at(-1)).toMatchObject({ maneuver: "arrive", street: "M L King Blvd @ UH University Dr" });
  });

  it("formats distances for US riders", () => {
    expect(formatDistance(10)).toBe("50 ft");
    expect(formatDistance(61)).toBe("200 ft");
    expect(formatDistance(1609.344)).toBe("1.0 mi");
  });
});

describe("implausible street routes", () => {
  it("rejects a routed walk far longer than the straight line", () => {
    expect(implausibleWalk(136, 945)).toBe(true);
    expect(implausibleWalk(136, 250)).toBe(false);
    // Short walks may detour around a block.
    expect(implausibleWalk(20, 200)).toBe(false);
  });

  it("answers a tunnel route with the straight-line estimate", async () => {
    const walk = await walkRoute({ lat: 29.7563, lon: -95.3639 }, { lat: 29.75727, lon: -95.36464 });
    expect(walk.source).toBe("straight-line-estimate");
    expect(walk.distanceM).toBeLessThan(300);
  });
});
