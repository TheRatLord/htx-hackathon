// Offline demo plans are recordings: their times are moved to "now" so a sample trip reads as
// one you could take (spec D11). Every timestamp moves by the same whole number of minutes.

import type { Itinerary, Leg, PlanResponse } from "../../../api/types.ts";

const MINUTE = 60_000;

const shiftIso = (iso: string, ms: number) => new Date(Date.parse(iso) + ms).toISOString();

function shiftLeg(leg: Leg, ms: number): Leg {
  return leg.type === "transit"
    ? { ...leg, departureTime: shiftIso(leg.departureTime, ms), arrivalTime: shiftIso(leg.arrivalTime, ms) }
    : { ...leg, startTime: shiftIso(leg.startTime, ms), endTime: shiftIso(leg.endTime, ms) };
}

function shiftItinerary(it: Itinerary, ms: number): Itinerary {
  return { ...it, startTime: shiftIso(it.startTime, ms), endTime: shiftIso(it.endTime, ms), legs: it.legs.map((l) => shiftLeg(l, ms)) };
}

/** Returns live plans unchanged; a recorded plan comes back with every time shifted by `now − recordedAt`. */
export function shiftFixture(response: PlanResponse, now: number): PlanResponse {
  if (response.source !== "offline-fixture" || !response.recordedAt) return response;
  const ms = Math.round((now - Date.parse(response.recordedAt)) / MINUTE) * MINUTE;
  return { ...response, itineraries: response.itineraries.map((it) => shiftItinerary(it, ms)) };
}
