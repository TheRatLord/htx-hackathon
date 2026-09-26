import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { ClientRoute, NearbyStop, NearbyTransitCenter } from "../api/types.ts";
import { primeRoutes, routeRef } from "./routes.ts";
import { compareRouteNames, sortRouteChips } from "./sortRoutes.ts";

beforeAll(() => {
  primeRoutes(JSON.parse(readFileSync(join(import.meta.dirname, "../../public/data/routes.json"), "utf8")) as ClientRoute[]);
});

const r = (name: string) => {
  const ref = routeRef(name)!;
  return { id: ref.id, name: ref.name, color: ref.color, textColor: ref.textColor };
};
const stop = (walkDistanceM: number, routes: string[]) => ({ walkDistanceM, stop: { routes: routes.map(r) } }) as NearbyStop;

describe("compareRouteNames", () => {
  it("sorts numerically, rail after bus in METRO's line order", () => {
    expect(["137", "Purple", "6", "Red", "40", "11", "Green"].sort(compareRouteNames)).toEqual(["6", "11", "40", "137", "Red", "Green", "Purple"]);
  });
});

describe("sortRouteChips", () => {
  it("orders by the nearest stop serving each route, then by number, rail last", () => {
    const chips = sortRouteChips([stop(60, ["40", "Red", "6"]), stop(130, ["40", "11"]), stop(60, ["137"])]);
    expect(chips.map((c) => c.name)).toEqual(["6", "40", "137", "Red", "11"]);
  });

  it("includes transit center routes at the center's walk distance", () => {
    const tc = { walkDistanceM: 90 } as NearbyTransitCenter;
    const chips = sortRouteChips([stop(60, ["40"]), stop(130, ["11"])], [{ tc, routes: [routeRef("58")!] }]);
    expect(chips.map((c) => c.name)).toEqual(["40", "58", "11"]);
  });
});
