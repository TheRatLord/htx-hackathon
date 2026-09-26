import { describe, expect, it } from "vitest";
import { formatDistance } from "../server/lib/geo.ts";
import { describeSteps, type WalkModifier } from "../server/services/walk.ts";

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
      "stop #11424",
    );
    expect(steps.map((s) => s.instruction)).toEqual([
      "Head southeast on Calhoun Road, walk 850 ft",
      "Turn left onto Main Street, walk 350 ft",
      "Turn right, walk 0.4 mi",
      "Arrive at stop #11424 on your right",
    ]);
  });

  it("formats distances for US riders", () => {
    expect(formatDistance(10)).toBe("50 ft");
    expect(formatDistance(61)).toBe("200 ft");
    expect(formatDistance(1609.344)).toBe("1.0 mi");
  });
});
