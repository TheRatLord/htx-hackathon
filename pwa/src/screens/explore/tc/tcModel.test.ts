import { beforeAll, describe, expect, it } from "vitest";
import type { Arrival, ClientRoute } from "../../../api/types.ts";
import { primeRoutes } from "../../../lib/routes.ts";
import { departureRows, platformsOf, servesRoute, tcRoutes } from "./tcModel.ts";

const route = (id: string, displayName: string): ClientRoute => ({
  id,
  shortName: id,
  displayName,
  longName: "",
  color: "#004080",
  textColor: "#FFFFFF",
  type: "bus",
  directions: [],
});

const bayRoute = (routeId: string, route: string, directionLabel: string, headsign: string) => ({ routeId, route, directionId: 0 as const, directionLabel, headsign, source: "" });
const bay = (letter: string, stopId: string, routes: ReturnType<typeof bayRoute>[]) => ({ bay: letter, stopId, lat: 0, lon: 0, routes, departures: [] });

const arrival = (routeId: string, headsign: string, departureTime: string): Arrival => ({
  tripId: `${routeId}-${departureTime}`,
  routeId,
  routeShortName: routeId.replace(/^0+/, ""),
  routeColor: "#004080",
  routeTextColor: "#FFFFFF",
  headsign,
  directionLabel: "Westbound",
  scheduledTime: departureTime,
  departureTime,
  minutesAway: 0,
  isRealtime: false,
  source: "schedule",
  delaySeconds: 0,
  canceled: false,
});

const tc = {
  stopIds: ["79", "13170"],
  bays: [
    bay("M", "79", [bayRoute("058", "58", "Westbound", "WEST BELT")]),
    bay("K", "79", [bayRoute("066", "66", "Eastbound", "DENVER HARBOR TC")]),
    bay("D", "13170", [bayRoute("085", "85", "Southbound", "DOWNTOWN")]),
  ],
  unassignedRoutes: ["219", "999"],
};

beforeAll(() => primeRoutes([route("058", "58"), route("066", "66"), route("085", "85"), route("219", "219")]));

describe("tcRoutes", () => {
  it("lists bay and unassigned routes in number order, dropping unknown names", () => {
    expect(tcRoutes(tc).map((r) => r.name)).toEqual(["58", "66", "85", "219"]);
  });
});

describe("servesRoute", () => {
  it("accepts either spelling of the route id", () => {
    expect(servesRoute(tc.bays[0], "58")).toBe(true);
    expect(servesRoute(tc.bays[0], "058")).toBe(true);
    expect(servesRoute(tc.bays[0], "66")).toBe(false);
  });
});

describe("departureRows", () => {
  it("groups by route and headsign in departure order, optionally for one route", () => {
    const deps = [arrival("070", "BRITTMOORE", "2026-09-26T02:10:00Z"), arrival("072", "BRITTMOORE", "2026-09-26T02:15:00Z"), arrival("070", "BRITTMOORE", "2026-09-26T02:40:00Z")];
    expect(departureRows(deps).map((r) => [r.route.name, r.deps.length])).toEqual([
      ["70", 2],
      ["72", 1],
    ]);
    expect(departureRows(deps, "72").map((r) => r.route.name)).toEqual(["72"]);
  });
});

describe("platformsOf", () => {
  it("orders platforms by name and bays by letter", () => {
    const names = new Map([
      ["79", "Northwest Transit Center - Platform 2"],
      ["13170", "Northwest Transit Center - Platform 1"],
    ]);
    expect(platformsOf(tc, names).map((p) => [p.stopId, p.bays.map((b) => b.bay).join("")])).toEqual([
      ["13170", "D"],
      ["79", "KM"],
    ]);
  });
});
