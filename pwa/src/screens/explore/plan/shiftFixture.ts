// Offline demo plans are recordings: their times are moved to "now" so a sample trip reads as
// one you could take (spec D11). Every timestamp moves by the same whole number of minutes, and far
// enough that card 1's first bus is still catchable after the walk to it.

import type { Itinerary, Leg, PlanResponse } from "../../../api/types.ts";
import { walkMinutes, type WalkPace } from "../../../lib/walk.ts";

const MINUTE = 60_000;
/** Minutes between reaching the stop and the bus leaving: one more than canMakeIt's "tight" margin. */
const LEAD_MIN = 3;

const shiftIso = (iso: string, ms: number) => new Date(Date.parse(iso) + ms).toISOString();

function shiftLeg(leg: Leg, ms: number): Leg {
  return leg.type === "transit"
    ? { ...leg, departureTime: shiftIso(leg.departureTime, ms), arrivalTime: shiftIso(leg.arrivalTime, ms) }
    : { ...leg, startTime: shiftIso(leg.startTime, ms), endTime: shiftIso(leg.endTime, ms) };
}

function shiftItinerary(it: Itinerary, ms: number): Itinerary {
  return { ...it, startTime: shiftIso(it.startTime, ms), endTime: shiftIso(it.endTime, ms), legs: it.legs.map((l) => shiftLeg(l, ms)) };
}

/** How much later (whole minutes, never earlier) the itinerary must be for "You have time" at its first bus. */
function catchableShift(it: Itinerary, now: number, pace: WalkPace): number {
  const first = it.legs.findIndex((l) => l.type === "transit");
  const ride = it.legs[first];
  if (ride?.type !== "transit") return 0;
  const walkM = it.legs.slice(0, first).reduce((m, l) => m + (l.type === "walk" ? l.distanceM : 0), 0);
  const leaveBy = now + (walkMinutes(walkM, pace) + LEAD_MIN) * MINUTE;
  return Math.max(0, Math.ceil((leaveBy - Date.parse(ride.departureTime)) / MINUTE) * MINUTE);
}

/** Returns live plans unchanged; a recorded plan comes back shifted to `now` (see the file comment). */
export function shiftFixture(response: PlanResponse, now: number, pace: WalkPace): PlanResponse {
  if (response.source !== "offline-fixture" || !response.recordedAt) return response;
  const base = Math.round((now - Date.parse(response.recordedAt)) / MINUTE) * MINUTE;
  const [first] = response.itineraries;
  const ms = base + (first ? catchableShift(shiftItinerary(first, base), now, pace) : 0);
  return { ...response, itineraries: response.itineraries.map((it) => shiftItinerary(it, ms)) };
}

/** A sample trip started later than it was planned moves forward again, so it never starts in the past. */
export function startableFixture(it: Itinerary, now: number, pace: WalkPace): Itinerary {
  const ms = catchableShift(it, now, pace);
  return ms ? shiftItinerary(it, ms) : it;
}
