import { describe, expect, it } from "vitest";
import type { PlanResponse, TransitLeg, WalkLeg } from "../../../api/types.ts";
import { HOBBY, itinerary, UH } from "../../../features/trip/testItinerary.ts";
import { shiftFixture } from "./shiftFixture.ts";
import { sortItineraries } from "./sortItineraries.ts";

const recorded: PlanResponse = { from: UH, to: HOBBY, itineraries: [itinerary], source: "offline-fixture", recordedAt: "2026-09-25T23:58:22.719Z" };

describe("shiftFixture", () => {
  it("moves every timestamp by whole minutes from recordedAt to now", () => {
    const now = Date.parse("2026-09-26T02:10:00Z");
    const shifted = shiftFixture(recorded, now);
    const ms = 132 * 60_000; // 2:11:37 rounds to 132 minutes
    const plus = (iso: string) => new Date(Date.parse(iso) + ms).toISOString();
    const it = shifted.itineraries[0];
    expect(it.startTime).toBe(plus(itinerary.startTime));
    expect(it.endTime).toBe(plus(itinerary.endTime));
    expect((it.legs[0] as WalkLeg).endTime).toBe(plus((itinerary.legs[0] as WalkLeg).endTime));
    const ride = it.legs[1] as TransitLeg;
    expect(ride.departureTime).toBe(plus((itinerary.legs[1] as TransitLeg).departureTime));
    expect(ride.arrivalTime).toBe(plus((itinerary.legs[1] as TransitLeg).arrivalTime));
  });

  it("leaves live plans alone", () => {
    const live = { ...recorded, source: "transitous" as const, recordedAt: undefined };
    expect(shiftFixture(live, Date.now())).toBe(live);
  });
});

describe("sortItineraries", () => {
  const a = { ...itinerary, id: "a", transfers: 1, walkDistanceM: 100, endTime: "2026-09-26T01:00:00Z" };
  const b = { ...itinerary, id: "b", transfers: 0, walkDistanceM: 900, endTime: "2026-09-26T01:10:00Z" };
  const c = { ...itinerary, id: "c", transfers: 0, walkDistanceM: 50, endTime: "2026-09-26T01:05:00Z" };

  it("keeps the API order for Soonest and each card's API index", () => {
    expect(sortItineraries([a, b, c]).map((x) => x.it.id)).toEqual(["a", "b", "c"]);
    expect(sortItineraries([a, b, c], "transfers").map((x) => [x.it.id, x.index])).toEqual([["c", 2], ["b", 1], ["a", 0]]);
    expect(sortItineraries([a, b, c], "walk").map((x) => x.it.id)).toEqual(["c", "a", "b"]);
  });
});
