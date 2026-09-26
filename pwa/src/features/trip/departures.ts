// The bus the rider is catching (spec D13 Walk and Wait): the stop's own prediction for the planned
// trip when /arrivals reports it, else the plan's time, which then leads the strip marked as planned.

import type { Dep, TransitLeg } from "../../api/types.ts";

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
