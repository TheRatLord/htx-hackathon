// The next scheduled departure at every stop of one route direction, from the
// local schedule only (no upstream calls), for the Route page's right column.

import { findRoute } from "../gtfs/store.ts";
import { getArrivals } from "./arrivals.ts";
import { ApiError } from "./errors.ts";

export interface RouteNext {
  routeId: string;
  directionId: 0 | 1;
  generatedAt: string;
  stops: { stopId: string; next: { departureTime: string } | null }[];
}

export async function getRouteNext(routeId: string, directionId: 0 | 1, now = Date.now()): Promise<RouteNext> {
  const route = findRoute(routeId);
  if (!route) throw new ApiError(404, "ROUTE_NOT_FOUND", `Route ${routeId} doesn't exist. Try the number shown on the bus sign.`);
  const direction = route.directions.find((d) => d.directionId === directionId);
  if (!direction) throw new ApiError(404, "DIRECTION_NOT_FOUND", `Route ${route.displayName} has no direction ${directionId}.`);
  const stops = await Promise.all(
    direction.stopIds.map(async (stopId) => {
      const { arrivals } = await getArrivals(stopId, { routeId: route.id, limit: 1, realtime: false, horizonMin: 180, now });
      return { stopId, next: arrivals[0] ? { departureTime: arrivals[0].departureTime } : null };
    }),
  );
  return { routeId: route.id, directionId, generatedAt: new Date(now).toISOString(), stops };
}
