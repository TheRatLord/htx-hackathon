// The next two scheduled departures at every stop of one route direction, from the local
// schedule only (no upstream calls), for the Route page's right column. The second one lets a
// stop whose next trip is due this minute show the trip after it (a schedule never says "Now").

import { findRoute } from "../gtfs/store.ts";
import { getArrivals } from "./arrivals.ts";
import { ApiError } from "./errors.ts";

export interface RouteNext {
  routeId: string;
  directionId: 0 | 1;
  generatedAt: string;
  stops: { stopId: string; next: { departureTime: string } | null; then: { departureTime: string } | null }[];
}

export async function getRouteNext(routeId: string, directionId: 0 | 1, now = Date.now()): Promise<RouteNext> {
  const route = findRoute(routeId);
  if (!route) throw new ApiError(404, "ROUTE_NOT_FOUND", `Route ${routeId} doesn't exist. Try the number shown on the bus sign.`);
  const direction = route.directions.find((d) => d.directionId === directionId);
  if (!direction) throw new ApiError(404, "DIRECTION_NOT_FOUND", `Route ${route.displayName} has no direction ${directionId}.`);
  const stops = await Promise.all(
    direction.stopIds.map(async (stopId) => {
      const { arrivals } = await getArrivals(stopId, { routeId: route.id, limit: 2, realtime: false, horizonMin: 180, now });
      const at = (i: number) => (arrivals[i] ? { departureTime: arrivals[i].departureTime } : null);
      return { stopId, next: at(0), then: at(1) };
    }),
  );
  return { routeId: route.id, directionId, generatedAt: new Date(now).toISOString(), stops };
}
