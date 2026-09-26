// "My routes" for D14: routes of saved stops, saved routes, and routes in the last nearby payload.
// Saved stops' routes come from /data/stops.json, so clearing recents never drops them.

import { useQueryClient } from "@tanstack/react-query";
import type { NearbyResponse, RouteRef } from "../../api/types.ts";
import { canonicalRouteId, routeRef, toRouteRef, useRoutesLoaded } from "../../lib/routes.ts";
import { compareRouteNames } from "../../lib/sortRoutes.ts";
import { useSaved } from "../../state/saved.ts";
import { useStops } from "./staticData.ts";

/** Undefined until routes.json (and stops.json, when stops are saved) have loaded. */
export function useMyRoutes(): RouteRef[] | undefined {
  const qc = useQueryClient();
  const saved = useSaved();
  const stops = useStops(saved.stops.length > 0);
  const routesLoaded = useRoutesLoaded();
  if (!routesLoaded || (saved.stops.length > 0 && !stops)) return undefined;

  const found = new Map<string, RouteRef>();
  const add = (id: string, fallback?: RouteRef) => {
    const ref = routeRef(id) ?? fallback;
    if (ref) found.set(canonicalRouteId(ref.id), ref);
  };

  saved.stops.forEach((s) => stops?.get(s.id)?.routes.forEach((name) => add(name)));
  saved.routes.forEach((r) => add(r.id));

  const lastNearby = qc
    .getQueryCache()
    .findAll({ queryKey: ["nearby"] })
    .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt)[0]?.state.data as NearbyResponse | undefined;
  lastNearby?.stops.forEach((s) => s.stop.routes.forEach((r) => add(r.id, toRouteRef(r))));

  return [...found.values()].sort((a, b) => compareRouteNames(a.name, b.name));
}
