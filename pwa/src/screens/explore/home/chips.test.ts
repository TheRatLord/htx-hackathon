import { describe, expect, it } from "vitest";
import type { NearbyResponse, TransitCenterDetail } from "../../../api/types.ts";
import { homeChips } from "./chips.ts";

const bus = (name: string) => ({ id: name.padStart(3, "0"), name, color: "#004080", textColor: "#FFFFFF", mode: "bus" });
const rail = (name: string) => ({ id: name.toUpperCase(), name, color: "#EF0000", textColor: "#FFFFFF", mode: "rail" });
const at = (walkDistanceM: number, routes: object[]) => ({ walkDistanceM, stop: { routes } });

describe("homeChips", () => {
  it("sorts by walk minutes, then number, rail after bus (F1: [40] is 3rd)", () => {
    // 118 m and 177 m are both a 2-minute walk, so 6 and 40 are not pushed behind 11/51.
    const nearby = {
      stops: [at(118, [bus("11"), bus("51")]), at(158, [bus("6"), rail("Red")]), at(177, [bus("40"), bus("41")]), at(900, [bus("137")])],
      transitCenters: [],
    } as unknown as NearbyResponse;
    expect(homeChips(nearby, undefined, "normal").map((r) => r.name)).toEqual(["6", "11", "40", "41", "51", "Red", "137"]);
  });

  it("keeps a route at its nearest stop and adds the transit center's routes at its walk", () => {
    const nearby = {
      stops: [at(900, [bus("58")]), at(100, [bus("58")])],
      transitCenters: [{ id: "nwtc", walkDistanceM: 300 }],
    } as unknown as NearbyResponse;
    const tc = { id: "nwtc", bays: [], unassignedRoutes: [] } as unknown as TransitCenterDetail;
    expect(homeChips(nearby, tc, "normal").map((r) => r.name)).toEqual(["58"]);
  });
});

describe("homeChips with a chosen route (D3)", () => {
  it("puts the chosen chip first and the rest in number order (06: 58, 39, 66, 85, 89)", () => {
    const nearby = {
      stops: [at(100, [bus("58")]), at(200, [bus("66"), bus("85")]), at(250, [bus("89")]), at(700, [bus("39")])],
      transitCenters: [],
    } as unknown as NearbyResponse;
    expect(homeChips(nearby, undefined, "normal", "058").map((r) => r.name)).toEqual(["58", "39", "66", "85", "89"]);
  });
});
