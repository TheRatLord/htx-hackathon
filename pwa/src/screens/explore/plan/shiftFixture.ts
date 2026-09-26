// Offline demo plans are recordings: their times are moved to "now" so a sample trip reads as
// one you could take (spec D11). Every timestamp moves by the same whole number of minutes, and far
// enough that card 1's first bus is still catchable after the walk to it. The shift is rounded up
// to a 5-minute step, so the list, the itinerary, its map and the live trip (each maybe computed a
// minute apart) all show the same sample times. A sample trip never runs in the small hours: when
// "now" is between midnight and 6 AM in Houston, the trips move on to the morning's first service.

import type { Itinerary, Leg, PlanResponse } from "../../../api/types.ts";
import { TIME_ZONE } from "../../../lib/format.ts";
import { walkMinutes, type WalkPace } from "../../../lib/walk.ts";

const MINUTE = 60_000;
/** Minutes between reaching the stop and the bus leaving: one more than canMakeIt's "tight" margin. */
const LEAD_MIN = 3;
/** The shift is a whole number of these, so a minute's difference between screens never shows. */
const STEP_MS = 5 * MINUTE;

const stepUp = (ms: number) => Math.ceil(ms / STEP_MS) * STEP_MS;

/** No sample bus leaves before this, in minutes after Houston midnight (route 80's first bus is 5:47 AM). */
const SERVICE_START_MIN = 6 * 60;

const houstonClock = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric", minute: "numeric", hourCycle: "h23" });

/** Minutes after midnight in Houston. */
function houstonMinutes(ms: number): number {
  const parts = houstonClock.formatToParts(new Date(ms));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

/** Extra shift so a first bus that would leave between midnight and 6 AM leaves at 6 AM instead. */
function serviceHoursShift(departureMs: number): number {
  const m = houstonMinutes(departureMs);
  return m < SERVICE_START_MIN ? (SERVICE_START_MIN - m) * MINUTE : 0;
}

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
  const catchable = base + (first ? catchableShift(shiftItinerary(first, base), now, pace) : 0);
  const ride = first && shiftItinerary(first, catchable).legs.find((l) => l.type === "transit");
  const ms = stepUp(catchable + (ride?.type === "transit" ? serviceHoursShift(Date.parse(ride.departureTime)) : 0));
  return { ...response, itineraries: response.itineraries.map((it) => shiftItinerary(it, ms)) };
}

/** A sample trip started later than it was planned moves forward again, so it never starts in the past. */
export function startableFixture(it: Itinerary, now: number, pace: WalkPace): Itinerary {
  const ms = catchableShift(it, now, pace);
  return ms ? shiftItinerary(it, stepUp(ms)) : it;
}
