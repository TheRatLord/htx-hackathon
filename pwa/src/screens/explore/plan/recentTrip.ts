// The query kept in recent trips (C.17: D11 is the writer).

import { fromIsRider } from "../../../features/trip/origin.ts";
import type { PlanQuery } from "../../../lib/planQuery.ts";
import { chipFor } from "./timeChoice.ts";

/**
 * A recent trip replays as the rider meant it: from wherever they are then (not that day's fix)
 * and, unless they picked an exact time, leaving then (an "In 15 min" chip is not a date).
 */
export function recentTrip(q: PlanQuery): PlanQuery {
  const exact = chipFor(q) === "other";
  return {
    ...q,
    ...(fromIsRider(q) && { from: undefined, fromName: undefined }),
    ...(!exact && { time: undefined, arriveBy: undefined }),
  };
}

