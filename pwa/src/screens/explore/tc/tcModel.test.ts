import { beforeAll, describe, expect, it } from "vitest";
import type { Arrival, ClientRoute } from "../../../api/types.ts";
import { primeRoutes } from "../../../lib/routes.ts";
import { departureRows, foldQuietBays, platformsOf, routesByNextDeparture, servesRoute, tcRoutes } from "./tcModel.ts";

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

describe("routesByNextDeparture", () => {
  const now = Date.parse("2026-01-01T18:00:00Z");
  const dep = (routeId: string, time: string) => ({ ...arrival(routeId, "X", time), stopId: "79" });
  const withDeps = {
    ...tc,
    bays: [
      { ...tc.bays[0], departures: [dep("058", "2026-01-01T18:40:00Z")] },
      tc.bays[1],
      { ...tc.bays[2], departures: [dep("085", "2026-01-01T18:05:00Z")] },
    ],
    unassignedDepartures: [dep("219", "2026-01-01T18:20:00Z")],
  };
  it("puts the routes leaving soonest first, then the rest in number order", () => {
    expect(routesByNextDeparture(withDeps, now).map((r) => r.name)).toEqual(["85", "219", "58", "66"]);
  });
  it("leads with a chosen route", () => {
    expect(routesByNextDeparture(withDeps, now, "66").map((r) => r.name)).toEqual(["66", "85", "219", "58"]);
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
  const now = Date.parse("2026-09-26T02:00:00Z");

  it("groups by route and headsign in departure order, optionally for one route", () => {
    const deps = [arrival("070", "BRITTMOORE", "2026-09-26T02:10:00Z"), arrival("072", "BRITTMOORE", "2026-09-26T02:15:00Z"), arrival("070", "BRITTMOORE", "2026-09-26T02:40:00Z")];
    expect(departureRows(deps, now).map((r) => [r.route.name, r.deps.length])).toEqual([
      ["70", 2],
      ["72", 1],
    ]);
    expect(departureRows(deps, now, "72").map((r) => r.route.name)).toEqual(["72"]);
  });

  it("drops departures that have left", () => {
    const due = arrival("058", "WEST BELT", "2026-09-26T02:03:00Z");
    const gone = arrival("058", "WEST BELT", "2026-09-26T01:55:00Z");
    expect(departureRows([gone, due], now).map((r) => r.deps.length)).toEqual([1]);
    expect(departureRows([gone], now)).toEqual([]);
  });
});

describe("foldQuietBays", () => {
  it("folds runs of two or more empty bays into one line", () => {
    const [row] = departureRows([arrival("058", "WEST BELT", "2026-09-26T02:03:00Z")], Date.parse("2026-09-26T02:00:00Z"));
    const items = foldQuietBays([
      { bay: "H", rows: [row] },
      { bay: "I", rows: [] },
      { bay: "K", rows: [row] },
      { bay: "L", rows: [] },
      { bay: "M", rows: [] },
      { bay: "N", rows: [] },
    ]);
    expect(items.map((i) => (i.kind === "bay" ? `${i.bay}:${i.rows.length}` : i.bays.join("")))).toEqual(["H:1", "I:0", "K:1", "LMN"]);
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
