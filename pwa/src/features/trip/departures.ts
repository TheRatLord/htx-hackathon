// The bus the rider is catching (spec D13 Walk and Wait): the stop's own prediction for the planned
// trip when /arrivals reports it, else the plan's time, which then leads the strip marked as planned.

import type { Dep, Itinerary, TransitLeg } from "../../api/types.ts";

/** Three minute values fit the strip at 360dp; clock times ("11:22 PM") are wider, so only soon buses follow. */
const MAX_STRIP = 3;
const SOON_MS = 60 * 60_000;
/** Another trip this close after the planned time is taken to be the same bus. */
const SAME_BUS_MS = 60_000;

export interface BoardDeparture {
  dep: Dep;
  /** True when `dep` is the stop's prediction for this very trip. */
  matched: boolean;
  /** `dep` first, then the next buses that fit without scrolling. */
  strip: Dep[];
}

export function boardDeparture(ride: TransitLeg, arrivals: Dep[], now: number): BoardDeparture {
  const live = ride.tripId ? arrivals.find((d) => d.tripId === ride.tripId) : undefined;
  const dep: Dep = live ?? { departureTime: ride.departureTime, isRealtime: false, canceled: false, source: "schedule", tripId: ride.tripId ?? "" };
  const after = Date.parse(dep.departureTime) + (live ? 0 : SAME_BUS_MS);
  const later = arrivals.filter((d) => {
    const at = Date.parse(d.departureTime);
    return d !== live && at > after && at - now < SOON_MS;
  });
  return { dep, matched: Boolean(live), strip: [dep, ...later].slice(0, MAX_STRIP) };
}

/** The same buses from the same stops: a later copy of a trip is the rider's backup (22, 27). */
export const tripShape = (it: Itinerary) =>
  it.legs
    .filter((l): l is TransitLeg => l.type === "transit")
    .map((l) => `${l.route.name}@${l.board.id ?? l.board.name}>${l.alight.id ?? l.alight.name}`)
    .join("|");

/**
 * The backup for `ride` on the Wait step: the same ride on the next later copy of the trip in the
 * planned list, the bus the list's "Also at 12:30 PM ›" names (it still makes every connection).
 * Undefined when the list has no later copy; the stop's own next bus is used then.
 */
export function nextChance(trip: Itinerary, ride: TransitLeg, planned: Itinerary[]): string | undefined {
  const shape = tripShape(trip);
  const at = trip.legs.findIndex((l) => l.type === "transit" && l.departureTime === ride.departureTime && l.route.name === ride.route.name);
  if (at < 0) return undefined;
  const mine = Date.parse(ride.departureTime);
  return planned
    .filter((it) => tripShape(it) === shape)
    .map((it) => it.legs[at])
    .filter((l): l is TransitLeg => l?.type === "transit" && Date.parse(l.departureTime) > mine + SAME_BUS_MS)
    .map((l) => l.departureTime)
    .sort((a, b) => Date.parse(a) - Date.parse(b))[0];
}
