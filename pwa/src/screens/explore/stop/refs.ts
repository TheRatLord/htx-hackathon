// The RouteRef a badge needs, from each API shape that describes a route.

import type { Arrival, RouteDetail, RouteRef, StopDetail } from "../../../api/types.ts";
import { toRouteRef } from "../../../lib/routes.ts";

export const refOfArrival = (a: Pick<Arrival, "routeId" | "routeShortName" | "routeColor" | "routeTextColor">): RouteRef =>
  toRouteRef({ id: a.routeId, name: a.routeShortName, color: a.routeColor, textColor: a.routeTextColor });

export const refOfServing = (s: StopDetail["serving"][number]): RouteRef => toRouteRef({ id: s.routeId, name: s.name, color: s.color, textColor: s.textColor });

export const refOfRoute = (r: RouteDetail): RouteRef => toRouteRef({ id: r.id, name: r.displayName, color: r.color, textColor: r.textColor });

/** Short headsigns stay on one line ("N SHEPHERD P&R", not "N / SHEPHERD P&R"); long ones may wrap. */
const KEEP_MAX = 20;
export function keepHeadsign(headline: string, headsign: string): string {
  return headsign.length <= KEEP_MAX ? headline.replace(headsign, headsign.replace(/ /g, "\u00A0")) : headline;
}
