// The routes of one saved-stop row (C.5b), shared by Explore's saved row (D2) and Recent (D16).

import { canonicalRouteId, routeRef, stopDirection, toRouteRef, useRoutesLoaded } from "../lib/routes.ts";
import type { SavedStop } from "../state/saved.ts";
import type { SavedStopRoute } from "../ui/types.ts";
import { useArrivals } from "./hooks.ts";
import { keys } from "./keys.ts";
import type { Arrival } from "./types.ts";

/** One call per saved stop: the next 6 buses of any route. */
const SAVED_ROW_LIMIT = 6;
export const savedRowKey = (stopId: string) => keys.arrivals(stopId, undefined, SAVED_ROW_LIMIT);

/** One entry per route (its first direction), in order of first departure, so "+1 route" counts routes. */
function savedStopRoutes(arrivals: Arrival[]): SavedStopRoute[] {
  const groups = new Map<string, SavedStopRoute>();
  for (const a of arrivals) {
    const key = canonicalRouteId(a.routeId);
    const group = groups.get(key);
    if (group) {
      if (group.directionLabel === a.directionLabel) group.deps.push(a);
      continue;
    }
    const route = routeRef(a.routeId) ?? toRouteRef({ id: a.routeId, name: a.routeShortName, color: a.routeColor, textColor: a.routeTextColor });
    groups.set(key, { route, directionLabel: a.directionLabel, headsign: a.headsign, deps: [a] });
  }
  return [...groups.values()];
}

/**
 * The row's routes, preferred route first. It always shows: when it is not among the stop's next
 * 6 buses it gets its own call, and when that is empty too its direction and headsign come from
 * routes.json (the row then reads "No buses in the next 3 hours"); so does a failed call for it
 * (`own.isError`, for a "Try again" line). `routes` is undefined while loading.
 */
export function useSavedStopRoutes(stop: SavedStop | undefined) {
  useRoutesLoaded();
  const stopId = stop?.id ?? "";
  const arrivals = useArrivals(stopId, { limit: SAVED_ROW_LIMIT, enabled: Boolean(stop) });
  const preferredRouteId = stop?.preferredRouteId ? canonicalRouteId(stop.preferredRouteId) : undefined;
  const rows = arrivals.data && savedStopRoutes(arrivals.data.arrivals);
  const missing = Boolean(preferredRouteId && rows && !rows.some((r) => r.route.id === preferredRouteId));
  const own = useArrivals(stopId, { route: preferredRouteId, limit: 2, enabled: missing });

  let routes: SavedStopRoute[] | undefined = rows;
  if (missing) {
    const found = own.data && savedStopRoutes(own.data.arrivals)[0];
    const dir = preferredRouteId && stopDirection(preferredRouteId, stopId);
    const ref = preferredRouteId && routeRef(preferredRouteId);
    const idle = ref && dir ? { route: ref, directionLabel: dir.directionLabel, headsign: dir.headsign, deps: [] } : undefined;
    const preferred = found ?? idle;
    // A failed call for the preferred route shows it from routes.json, as with no buses: the row
    // stayed a skeleton for good (Explore) or empty (Recent) when that call failed.
    const settled = own.data || own.isError;
    routes = !settled ? undefined : preferred ? [preferred, ...rows!] : rows;
  }
  return { routes, preferredRouteId, arrivals, own };
}
