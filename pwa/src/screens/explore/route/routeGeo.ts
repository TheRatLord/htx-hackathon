// Route-page helpers shared by D9 and the search results that open it (D5).

import type { LatLon, RouteDetail } from "../../../api/types.ts";
import { haversineM } from "../../../lib/geo.ts";

export type RouteDirectionDetail = RouteDetail["directions"][number];
export type RouteStop = RouteDirectionDetail["stops"][number];

/** "82 Westheimer" for a bus, "METRORail Red Line" for rail (as riders and the search results name them). */
export function routeTitle(route: Pick<RouteDetail, "displayName" | "longName" | "type">): string {
  return route.type === "rail" ? route.longName : `${route.displayName} ${route.longName}`;
}

/** The stop of one direction closest (straight line) to `from`. */
export function nearestStop(stops: RouteStop[], from: LatLon): RouteStop | undefined {
  let best: { stop: RouteStop; d: number } | undefined;
  for (const stop of stops) {
    const d = haversineM(from.lat, from.lon, stop.lat, stop.lon);
    if (!best || d < best.d) best = { stop, d };
  }
  return best?.stop;
}

/** The direction whose nearest stop is closest to `from`; the first direction without a fix. */
export function nearestDirection(route: Pick<RouteDetail, "directions">, from: LatLon | undefined): 0 | 1 {
  const [first] = route.directions;
  if (!from || !first) return first?.directionId ?? 0;
  const distance = (d: RouteDirectionDetail) => {
    const s = nearestStop(d.stops, from);
    return s ? haversineM(from.lat, from.lon, s.lat, s.lon) : Infinity;
  };
  return route.directions.reduce((a, b) => (distance(b) < distance(a) ? b : a)).directionId;
}
