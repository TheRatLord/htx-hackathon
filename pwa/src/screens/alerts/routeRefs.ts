// Badges for an alert's routes.

import type { Alert, RouteRef } from "../../api/types.ts";
import { routeRefOrFallback } from "../../lib/routes.ts";
import { compareRouteNames } from "../../lib/sortRoutes.ts";

/** An alert's routes, sorted "2, 40, 82, Red" (GTFS-RT gives no text colour). */
export function alertRouteRefs(alert: Alert): RouteRef[] {
  return alert.routes.map((r) => routeRefOrFallback(r.routeId, r.route, r.color)).sort((a, b) => compareRouteNames(a.name, b.name));
}
