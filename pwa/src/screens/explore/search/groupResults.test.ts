import { describe, expect, it } from "vitest";
import type { SearchResult, TransitCenterSummary } from "../../../api/types.ts";
import { groupResults, isRouteQuery, parseRouteStopQuery } from "./groupResults.ts";

const stop = (id: string, name: string, kind: "stop" | "transit-center" = "stop"): SearchResult => ({
  type: "stop",
  id,
  title: name,
  subtitle: "",
  stop: { id, name, lat: 0, lon: 0, kind, routes: [], subtitle: "" },
});
const route82: SearchResult = { type: "route", id: "082", title: "82 Westheimer", subtitle: "" };
const hobby: SearchResult = { type: "landmark", id: "hobby-airport", title: "Hobby Airport", subtitle: "" };
const place: SearchResult = { type: "place", id: "29.7,-95.3", title: "Hobby Center", subtitle: "" };
const nwtc: TransitCenterSummary = {
  id: "northwest-transit-center",
  name: "Northwest Transit Center",
  stopIds: ["79", "13170"],
  lat: 0,
  lon: 0,
  source: "metro-transit-data-api",
  unassignedRoutes: [],
  bayCount: 16,
};

const kinds = (sections: ReturnType<typeof groupResults>) => sections.map((s) => s.kind);

describe("groupResults", () => {
  it("puts routes first for a route number", () => {
    expect(kinds(groupResults([stop("82", "Monroe Park & Ride"), route82], [], "82"))).toEqual(["routes", "stops"]);
  });

  it("keeps a curated landmark above a transit center of the same name", () => {
    const hobbyTc = { ...nwtc, id: "hobby", name: "Hobby Airport", stopIds: ["10567"] };
    expect(kinds(groupResults([hobby, place], [hobbyTc], "hobby"))).toEqual(["places", "transitCenters"]);
  });

  it("orders places (landmarks first), stops, routes otherwise", () => {
    const sections = groupResults([place, stop("10567", "Hobby Airport"), route82, hobby], [], "hobby");
    expect(kinds(sections)).toEqual(["places", "stops", "routes"]);
    expect(sections[0].items.map((r) => ("title" in r ? r.title : ""))).toEqual(["Hobby Airport", "Hobby Center"]);
  });

  it("collapses a transit center's platform stops into one row", () => {
    const sections = groupResults(
      [stop("79", "Northwest Transit Center - Platform 2", "transit-center"), stop("13170", "Northwest Transit Center - Platform 1", "transit-center"), stop("8413", "W 18th St @ Northwest Freeway")],
      [nwtc],
      "northwest",
    );
    expect(kinds(sections)).toEqual(["transitCenters", "stops"]);
    expect(sections[0].items).toEqual([nwtc]);
    expect(sections[1].items.map((r) => ("id" in r ? r.id : ""))).toEqual(["8413"]);
  });

  it("adds transit centers whose name matches", () => {
    expect(kinds(groupResults([place], [nwtc], "northwest transit"))).toEqual(["transitCenters", "places"]);
    expect(groupResults([], [nwtc], "82")).toEqual([]);
  });
});

describe("route queries", () => {
  it("recognises a route on its own", () => {
    expect(isRouteQuery("82")).toBe(true);
    expect(isRouteQuery(" Red ")).toBe(true);
    expect(isRouteQuery("route 40")).toBe(true);
    expect(isRouteQuery("3422")).toBe(false);
    expect(isRouteQuery("hobby")).toBe(false);
  });

  it("splits the route + stop shortcut", () => {
    expect(parseRouteStopQuery("82 montrose")).toEqual({ route: "82", stop: "montrose" });
    expect(parseRouteStopQuery("red main st")).toEqual({ route: "red", stop: "main st" });
    expect(parseRouteStopQuery("82")).toBeUndefined();
    expect(parseRouteStopQuery("westheimer and kirby")).toBeUndefined();
  });
});
