import type { Arrival, StopDetail } from "../../../api/types.ts";
import { upcoming } from "../../../lib/format.ts";

export type Serving = StopDetail["serving"][number];

export const servingKey = (s: Pick<Serving, "routeId" | "directionLabel" | "headsign">) => `${s.routeId}|${s.directionLabel}|${s.headsign}`;

/** This entry's departures among a stop's mixed arrivals. */
export const departuresOf = (s: Serving, arrivals: Arrival[]) => arrivals.filter((a) => servingKey(a) === servingKey(s));

/**
 * D6: the expanded route is `?route=` when given (its soonest pattern at this stop), otherwise the
 * pattern with the soonest upcoming departure, otherwise the busiest.
 */
export function pickExpanded(serving: Serving[], arrivals: Arrival[], now: number, routeId?: string): Serving | undefined {
  const candidates = routeId ? serving.filter((s) => s.routeId === routeId) : serving;
  const soonest = upcoming(arrivals, now).find((a) => !a.canceled && candidates.some((s) => servingKey(s) === servingKey(a)));
  return (soonest && candidates.find((s) => servingKey(s) === servingKey(soonest))) ?? candidates[0] ?? serving[0];
}
