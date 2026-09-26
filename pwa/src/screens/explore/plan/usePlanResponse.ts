// The planner's data (spec D11): /api/plan once both ends are set, with recorded plans shifted to
// now. Each successful plan is kept as the planned trip and added to recent trips (C writes those).

import { useEffect, useMemo } from "react";
import { usePlan } from "../../../api/hooks.ts";
import type { PlanResponse } from "../../../api/types.ts";
import type { PlanQuery } from "../../../lib/planQuery.ts";
import { recentsActions } from "../../../state/recents.ts";
import { tripActions, useTrip } from "../../../state/trip.ts";
import { shiftFixture } from "./shiftFixture.ts";

/** The part of the query that changes the answer (not the sort). */
export function planKey(q: PlanQuery): PlanQuery {
  return { from: q.from, fromName: q.fromName, to: q.to, toName: q.toName, time: q.time, arriveBy: q.arriveBy };
}

const sameTrip = (a: PlanQuery, b: PlanQuery) =>
  a.from === b.from && a.to === b.to && (a.time ?? "") === (b.time ?? "") && Boolean(a.arriveBy) === Boolean(b.arriveBy);

export const isReady = (q: PlanQuery) => Boolean(q.from && q.to);

/**
 * `reuse`: My Itinerary shows the stored plan when it answers the same query, so the card the
 * rider tapped is the one they see; a cold deep link plans again.
 */
export function usePlanResponse(query: PlanQuery, opts: { reuse?: boolean } = {}) {
  const { planned } = useTrip();
  const stored = opts.reuse && planned && sameTrip(planned.query, query) ? planned.response : undefined;
  const q = usePlan(isReady(query) && !stored ? query : null);
  const { data, dataUpdatedAt } = q;
  const fresh = useMemo(() => data && shiftFixture(data, dataUpdatedAt), [data, dataUpdatedAt]);

  const key = JSON.stringify(planKey(query));
  useEffect(() => {
    if (!fresh?.itineraries.length) return;
    const trip = JSON.parse(key) as PlanQuery;
    tripActions.setPlanned({ query: trip, response: fresh, chosen: null });
    recentsActions.addTrip(trip);
  }, [fresh, key]);

  const response: PlanResponse | undefined = stored ?? fresh;
  return { response, isLoading: !response && q.isFetching, error: response ? null : q.error, retry: () => void q.refetch() };
}
