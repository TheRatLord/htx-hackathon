// The planner's data (spec D11): /api/plan once both ends are set, with recorded plans shifted to
// now. Each successful plan is kept as the planned trip and added to recent trips (C writes those).

import { useEffect, useMemo, useState } from "react";
import { usePlan } from "../../../api/hooks.ts";
import type { PlanResponse } from "../../../api/types.ts";
import type { PlanQuery } from "../../../lib/planQuery.ts";
import { usePrefs } from "../../../state/prefs.ts";
import { recentsActions } from "../../../state/recents.ts";
import { tripActions, useTrip } from "../../../state/trip.ts";
import { shiftFixture } from "./shiftFixture.ts";
import { recentTrip } from "./recentTrip.ts";

/** The part of the query that changes the answer (not the sort). */
export function planKey(q: PlanQuery): PlanQuery {
  return { from: q.from, fromName: q.fromName, to: q.to, toName: q.toName, time: q.time, arriveBy: q.arriveBy };
}

const sameTrip = (a: PlanQuery, b: PlanQuery) =>
  a.from === b.from && a.to === b.to && (a.time ?? "") === (b.time ?? "") && Boolean(a.arriveBy) === Boolean(b.arriveBy);

/** A stored plan is still true while none of its first buses has left. */
const stillAhead = (response: PlanResponse, now: number) =>
  response.itineraries.every((it) => it.legs.every((l) => l.type !== "transit" || Date.parse(l.departureTime) > now));

export const isReady = (q: PlanQuery) => Boolean(q.from && q.to);

/**
 * `reuse`: My Itinerary shows the stored plan when it answers the same query and none of its buses
 * has left yet, so the card the rider tapped is the one they see; otherwise it plans again.
 */
export function usePlanResponse(query: PlanQuery, opts: { reuse?: boolean } = {}) {
  const { planned } = useTrip();
  const { walkPace } = usePrefs();
  const [mayReuse] = useState(() => Boolean(opts.reuse && planned && stillAhead(planned.response, Date.now())));
  const stored = mayReuse && planned && sameTrip(planned.query, query) ? planned.response : undefined;
  const q = usePlan(isReady(query) && !stored ? query : null);
  const { data, dataUpdatedAt } = q;
  const fresh = useMemo(() => data && shiftFixture(data, dataUpdatedAt, walkPace), [data, dataUpdatedAt, walkPace]);

  const key = JSON.stringify(planKey(query));
  useEffect(() => {
    if (!fresh?.itineraries.length) return;
    const trip = JSON.parse(key) as PlanQuery;
    tripActions.setPlanned({ query: trip, response: fresh, chosen: null });
    recentsActions.addTrip(recentTrip(trip));
  }, [fresh, key]);

  const response: PlanResponse | undefined = stored ?? fresh;
  return { response, error: response ? null : q.error, retry: () => void q.refetch() };
}
