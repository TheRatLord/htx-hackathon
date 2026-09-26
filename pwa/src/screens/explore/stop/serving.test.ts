import { describe, expect, it } from "vitest";
import type { Arrival } from "../../../api/types.ts";
import { pickExpanded, type Serving } from "./serving.ts";

const entry = (routeId: string, directionLabel: string, headsign: string) => ({ routeId, directionLabel, headsign }) as Serving;
const now = Date.parse("2026-09-25T23:00:00Z");
const arrival = (routeId: string, directionLabel: string, headsign: string, inMin: number, canceled = false) =>
  ({ routeId, directionLabel, headsign, canceled, departureTime: new Date(now + inMin * 60_000).toISOString() }) as Arrival;

const serving = [entry("040", "Northbound", "N SHEPHERD P&R"), entry("041", "Westbound", "TMC TC")];

describe("pickExpanded", () => {
  it("expands ?route= when given", () => {
    expect(pickExpanded(serving, [arrival("040", "Northbound", "N SHEPHERD P&R", 12)], now, "041")?.routeId).toBe("041");
  });

  it("otherwise expands the soonest upcoming, skipping passed and canceled trips", () => {
    const arrivals = [
      arrival("040", "Northbound", "N SHEPHERD P&R", -5),
      arrival("040", "Northbound", "N SHEPHERD P&R", 3, true),
      arrival("041", "Westbound", "TMC TC", 9),
      arrival("040", "Northbound", "N SHEPHERD P&R", 16),
    ];
    expect(pickExpanded(serving, arrivals, now)?.routeId).toBe("041");
  });

  it("falls back to the busiest pattern late at night", () => {
    expect(pickExpanded(serving, [], now)?.routeId).toBe("040");
  });
});
