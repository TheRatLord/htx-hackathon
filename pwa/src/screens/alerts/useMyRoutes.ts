// "My routes" for D14: routes of saved stops, saved routes, and routes in the last nearby payload.
// Read from local state and the query cache only, so opening Alerts starts no extra requests.

import { useQueryClient } from "@tanstack/react-query";
import { keys } from "../../api/keys.ts";
import type { ArrivalsResult, NearbyResponse, RouteRef } from "../../api/types.ts";
import { canonicalRouteId, routeRef, toRouteRef, useRoutesLoaded } from "../../lib/routes.ts";
import { compareRouteNames } from "../../lib/sortRoutes.ts";
import { useRecents } from "../../state/recents.ts";
import { useSaved } from "../../state/saved.ts";

const SAVED_ROW_LIMIT = 6;

export function useMyRoutes(): RouteRef[] {
  const qc = useQueryClient();
  const saved = useSaved();
  const recents = useRecents();
  useRoutesLoaded();

  const found = new Map<string, RouteRef>();
  const add = (id: string, fallback?: RouteRef) => {
    const ref = routeRef(id) ?? fallback;
    if (ref) found.set(canonicalRouteId(ref.id), ref);
  };

  for (const stop of saved.stops) {
    // A saved stop was opened in the Stop sheet, which records its routes as a recent stop.
    recents.stops.find((r) => r.id === stop.id)?.routes.forEach((id) => add(id));
    // The saved rows (Explore, Recent) cache each stop's arrivals under this key.
    qc.getQueryData<ArrivalsResult>(keys.arrivals(stop.id, undefined, SAVED_ROW_LIMIT))?.arrivals.forEach((a) =>
      add(a.routeId, toRouteRef({ id: a.routeId, name: a.routeShortName, color: a.routeColor, textColor: a.routeTextColor })),
    );
  }
  saved.routes.forEach((r) => add(r.id));

  const lastNearby = qc
    .getQueryCache()
    .findAll({ queryKey: ["nearby"] })
    .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt)[0]?.state.data as NearbyResponse | undefined;
  lastNearby?.stops.forEach((s) => s.stop.routes.forEach((r) => add(r.id, toRouteRef(r))));

  return [...found.values()].sort((a, b) => compareRouteNames(a.name, b.name));
}
