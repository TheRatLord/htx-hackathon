// Badges for routes the screen knows only by id and name (saved and recent routes, alert routes).

import type { Alert, RouteRef } from "../../api/types.ts";
import { routeRef, toRouteRef } from "../../lib/routes.ts";
import { compareRouteNames } from "../../lib/sortRoutes.ts";

/** METRO's bus colours (119 of 120 routes in routes.json), until routes.json has loaded. */
const BUS_COLOR = "#004080";
const BUS_TEXT_COLOR = "#FFFFFF";

/** routes.json's entry for the route, else a bus badge built from what the caller has. */
export function routeRefOr(id: string, name: string, color = BUS_COLOR): RouteRef {
  return routeRef(id) ?? toRouteRef({ id, name, color, textColor: BUS_TEXT_COLOR });
}

/** An alert's routes, sorted "2, 40, 82, Red" (GTFS-RT gives no text colour). */
export function alertRouteRefs(alert: Alert): RouteRef[] {
  return alert.routes.map((r) => routeRefOr(r.routeId, r.route, r.color)).sort((a, b) => compareRouteNames(a.name, b.name));
}
