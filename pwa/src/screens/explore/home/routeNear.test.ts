import { describe, expect, it } from "vitest";
import type { NearbyResponse, RouteDetail, TransitCenterDetail } from "../../../api/types.ts";
import { baysFor, nearestPerDirection, rankByCatch, shortTc } from "./routeNear.ts";

const origin = { lat: 29.7563, lon: -95.3639 };
const stop = (id: string, lat: number, lon: number) => ({ id, name: `Stop ${id}`, lat, lon, kind: "stop" });
// Route 40 at the F1 GPS: 567 (southbound) is closer than 342 (northbound).
const route = {
  id: "040",
  directions: [
    { label: "Northbound", headsigns: ["N SHEPHERD P&R"], stops: [stop("9001", 29.77, -95.37), stop("342", 29.7575, -95.3635)] },
    { label: "Southbound", headsigns: ["MONROE P&R"], stops: [stop("567", 29.7568, -95.3637), stop("9002", 29.74, -95.35)] },
  ],
} as unknown as RouteDetail;

describe("nearestPerDirection", () => {
  it("takes each direction's nearest stop from the route's own list, closest direction first", () => {
    const streets = nearestPerDirection(route, origin, undefined, "normal");
    expect(streets.map((s) => [s.dir.label, s.stop.id])).toEqual([
      ["Southbound", "567"],
      ["Northbound", "342"],
    ]);
  });

  it("uses /nearby's walk distance when the stop is in it, so the card matches D2", () => {
    const nearby = { stops: [{ stop: { id: "342" }, walkDistanceM: 20, walkSource: "osrm" }] } as unknown as NearbyResponse;
    const [first] = nearestPerDirection(route, origin, nearby, "normal");
    expect(first.stop.id).toBe("342");
    expect(first.distanceM).toBe(20);
    expect(first.fromNearby?.walkSource).toBe("osrm");
  });
});

describe("baysFor", () => {
  it("lists every bay that serves the route, one entry per direction", () => {
    const tc = {
      bays: [
        { bay: "M", stopId: "79", routes: [{ routeId: "058", directionLabel: "Westbound", headsign: "WEST BELT" }] },
        {
          bay: "L",
          stopId: "79",
          routes: [
            { routeId: "058", directionLabel: "Eastbound", headsign: "DOWNTOWN" },
            { routeId: "085", directionLabel: "Southbound", headsign: "DOWNTOWN" },
          ],
        },
        { bay: "D", stopId: "13170", routes: [{ routeId: "085", directionLabel: "Northbound", headsign: "SH 249" }] },
      ],
    } as unknown as TransitCenterDetail;
    expect(baysFor(tc, "058")).toEqual([
      { bay: "M", stopId: "79", directionLabel: "Westbound", headsign: "WEST BELT" },
      { bay: "L", stopId: "79", directionLabel: "Eastbound", headsign: "DOWNTOWN" },
    ]);
    expect(baysFor(tc, "999")).toEqual([]);
  });
});

describe("rankByCatch", () => {
  const now = Date.parse("2026-09-26T13:00:00Z");
  const at = (min: number) => ({ departureTime: new Date(now + min * 60_000).toISOString() });

  it("puts the earliest bus the rider can catch first (06: 8249 above the TC)", () => {
    const cards = [
      { item: "tc", deps: [at(59)], walkMin: 11 },
      { item: "8249", deps: [at(2), at(30)], walkMin: 2 },
    ];
    expect(rankByCatch(cards, now)).toEqual(["8249", "tc"]);
  });

  it("skips a bus that leaves before the rider can walk there", () => {
    const cards = [
      { item: "far", deps: [at(3), at(40)], walkMin: 8 },
      { item: "near", deps: [at(20)], walkMin: 2 },
    ];
    expect(rankByCatch(cards, now)).toEqual(["near", "far"]);
  });

  it("keeps a pinned card (the transit center) inside the first two", () => {
    const cards = [
      { item: "tc", deps: [at(59)], walkMin: 11, pinned: true },
      { item: "8249", deps: [at(2)], walkMin: 2 },
      { item: "8895", deps: [at(37)], walkMin: 3 },
    ];
    expect(rankByCatch(cards, now)).toEqual(["8249", "tc", "8895"]);
  });

  it("keeps the given order while any card is loading", () => {
    const cards = [
      { item: "a", deps: [at(50)], walkMin: 1 },
      { item: "b", deps: undefined, walkMin: 1 },
    ];
    expect(rankByCatch(cards, now)).toEqual(["a", "b"]);
  });
});

describe("shortTc", () => {
  it("keeps the TC tag to one short line", () => {
    expect(shortTc("Northwest Transit Center")).toBe("NW TC");
    expect(shortTc("Northline Transit Center")).toBe("Northline TC");
  });
});
