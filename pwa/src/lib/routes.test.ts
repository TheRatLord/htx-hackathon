import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { ClientRoute } from "../api/types.ts";
import { primeRoutes, routeRefOrFallback, stopDirection } from "./routes.ts";

beforeAll(() => {
  primeRoutes(JSON.parse(readFileSync(join(import.meta.dirname, "../../public/data/routes.json"), "utf8")) as ClientRoute[]);
});

describe("route lookups", () => {
  it("finds the direction of a route that serves a stop", () => {
    expect(stopDirection("40", "342")).toMatchObject({ routeId: "040", directionLabel: expect.any(String) });
    expect(stopDirection("40", "no-such-stop")).toBeUndefined();
  });

  it("builds a bus badge for a route routes.json doesn't know", () => {
    expect(routeRefOrFallback("82", "82").id).toBe("082");
    expect(routeRefOrFallback("X9", "X9")).toEqual({ id: "X9", name: "X9", color: "#004080", textColor: "#FFFFFF", mode: "bus" });
  });
});
