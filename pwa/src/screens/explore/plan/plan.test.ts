import { describe, expect, it, vi } from "vitest";
import type { Itinerary, PlanResponse, TransitLeg, WalkLeg } from "../../../api/types.ts";
import { HOBBY, itinerary, UH } from "../../../features/trip/testItinerary.ts";
import { canMakeIt, walkMinutes } from "../../../lib/walk.ts";
import { shiftFixture, startableFixture } from "./shiftFixture.ts";
import { sortItineraries } from "./sortItineraries.ts";
import { relativeTime } from "./timeChoice.ts";
import { recentTrip } from "./recentTrip.ts";

const recorded: PlanResponse = { from: UH, to: HOBBY, itineraries: [itinerary], source: "offline-fixture", recordedAt: "2026-09-25T23:58:22.719Z" };

describe("shiftFixture", () => {
  const plus = (iso: string, min: number) => new Date(Date.parse(iso) + min * 60_000).toISOString();
  const ride = (it: Itinerary) => it.legs[1] as TransitLeg;

  it("moves every timestamp by the same whole minutes, at least from recordedAt to now", () => {
    const now = Date.parse("2026-09-26T01:49:00Z"); // 1:50:38 after recordedAt: 111 min
    const it = shiftFixture(recorded, now, "normal").itineraries[0];
    const min = (Date.parse(it.startTime) - Date.parse(itinerary.startTime)) / 60_000;
    expect(Number.isInteger(min)).toBe(true);
    expect(min).toBeGreaterThanOrEqual(111);
    expect(it.endTime).toBe(plus(itinerary.endTime, min));
    expect((it.legs[0] as WalkLeg).endTime).toBe(plus((itinerary.legs[0] as WalkLeg).endTime, min));
    expect(ride(it).departureTime).toBe(plus(ride(itinerary).departureTime, min));
    expect(ride(it).arrivalTime).toBe(plus(ride(itinerary).arrivalTime, min));
  });

  it("moves later still so card 1's first bus leaves 3 min after the walk (F8 ends on You have time)", () => {
    // 2:11:37 rounds to 132 min, which would leave the 80 only 7 min away; walk 5 + 3 needs 8.
    const now = Date.parse("2026-09-26T02:10:00Z");
    const it = shiftFixture(recorded, now, "normal").itineraries[0];
    // 133 min, rounded up to the 5-minute step.
    expect(ride(it).departureTime).toBe(plus(ride(itinerary).departureTime, 135));
    expect(canMakeIt(walkMinutes(407, "normal"), ride(it), now)).toBe("yes");
    const slower = shiftFixture(recorded, now, "slower").itineraries[0];
    expect(canMakeIt(walkMinutes(407, "slower"), ride(slower), now)).toBe("yes");
  });

  it("moves a sample trip forward again when it is started later", () => {
    const shifted = shiftFixture(recorded, Date.parse("2026-09-26T01:49:00Z"), "normal").itineraries[0];
    const later = Date.parse("2026-09-26T02:30:00Z");
    expect(canMakeIt(5, ride(startableFixture(shifted, later, "normal")), later)).toBe("yes");
    expect(startableFixture(shifted, Date.parse("2026-09-26T01:49:00Z"), "normal")).toBe(shifted);
  });

  it("gives the same times to screens computed a minute or two apart", () => {
    const at = (iso: string) => ride(shiftFixture(recorded, Date.parse(iso), "normal").itineraries[0]).departureTime;
    expect(at("2026-09-26T01:43:00Z")).toBe(at("2026-09-26T01:47:00Z"));
  });

  it("never shows a sample bus between midnight and 6 AM (Houston): it moves to the morning", () => {
    const now = Date.parse("2026-09-26T08:39:00Z"); // 3:39 AM CDT
    const dep = Date.parse(ride(shiftFixture(recorded, now, "normal").itineraries[0]).departureTime);
    expect(dep).toBeGreaterThanOrEqual(Date.parse("2026-09-26T11:00:00Z")); // 6:00 AM CDT
    expect(dep).toBeLessThan(Date.parse("2026-09-26T11:05:00Z"));
  });

  it("leaves live plans alone", () => {
    const live = { ...recorded, source: "transitous" as const, recordedAt: undefined };
    expect(shiftFixture(live, Date.now(), "normal")).toBe(live);
  });
});

describe("recentTrip", () => {
  const to = { to: "landmark:hobby-airport", toName: "Hobby Airport" };

  it("replays from wherever the rider is then", () => {
    expect(recentTrip({ from: "29.71990,-95.34220", ...to })).toEqual({ from: undefined, fromName: undefined, ...to });
    expect(recentTrip({ from: "29.71990,-95.34220", fromName: "Mi ubicación actual", ...to }).from).toBeUndefined();
    expect(recentTrip({ from: "11424", fromName: "M L King Blvd @ UH University Dr", ...to }).from).toBe("11424");
  });

  it("keeps only an exact time, never one from a relative chip", () => {
    const session = new Map<string, string>();
    vi.stubGlobal("sessionStorage", { getItem: (k: string) => session.get(k) ?? null, setItem: (k: string, v: string) => session.set(k, v), removeItem: (k: string) => session.delete(k) });
    const soon = relativeTime(to, "in15", 15, Date.parse("2026-09-26T02:00:00Z"));
    expect(recentTrip(soon).time).toBeUndefined();
    const exact = { ...to, time: "2026-09-27T13:30:00.000Z", arriveBy: true };
    expect(recentTrip(exact)).toMatchObject({ time: exact.time, arriveBy: true });
    vi.unstubAllGlobals();
  });
});

describe("sortItineraries", () => {
  const a = { ...itinerary, id: "a", transfers: 1, walkDistanceM: 100, endTime: "2026-09-26T01:00:00Z" };
  const b = { ...itinerary, id: "b", transfers: 0, walkDistanceM: 900, endTime: "2026-09-26T01:10:00Z" };
  const c = { ...itinerary, id: "c", transfers: 0, walkDistanceM: 50, endTime: "2026-09-26T01:05:00Z" };

  it("puts the first arrival first for Fastest, and keeps each card's API index", () => {
    expect(sortItineraries([a, b, c]).map((x) => [x.it.id, x.index])).toEqual([["a", 0], ["c", 2], ["b", 1]]);
    expect(sortItineraries([a, b, c], "transfers").map((x) => [x.it.id, x.index])).toEqual([["c", 2], ["b", 1], ["a", 0]]);
    expect(sortItineraries([a, b, c], "walk").map((x) => x.it.id)).toEqual(["c", "a", "b"]);
  });
});
