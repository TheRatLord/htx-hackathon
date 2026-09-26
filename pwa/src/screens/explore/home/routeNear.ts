// D3's choices, as pure functions: which stop of each direction is nearest, and which bays of a
// nearby transit center serve the route.

import type { LatLon, NearbyResponse, RouteDetail, TransitCenterDetail } from "../../../api/types.ts";
import { haversineM } from "../../../lib/geo.ts";
import { estimateWalk, type WalkPace } from "../../../lib/walk.ts";

export type RouteDirection = RouteDetail["directions"][number];
export type RouteStop = RouteDirection["stops"][number];

export interface Street {
  dir: RouteDirection;
  stop: RouteStop;
  distanceM: number;
  fromNearby?: NearbyResponse["stops"][number];
}

/**
 * Each direction's nearest stop, closest first, from the route's full stop list (not /nearby's 15).
 * The distance is /nearby's when the stop is in it, so the card matches D2.
 */
export function nearestPerDirection(route: RouteDetail, origin: LatLon, nearby: NearbyResponse | undefined, pace: WalkPace): Street[] {
  const away = (s: LatLon) => haversineM(origin.lat, origin.lon, s.lat, s.lon);
  return route.directions
    .flatMap((dir): Street[] => {
      const nearest = dir.stops.reduce<RouteStop | undefined>((best, s) => (!best || away(s) < away(best) ? s : best), undefined);
      if (!nearest) return [];
      const fromNearby = nearby?.stops.find((s) => s.stop.id === nearest.id);
      return [{ dir, stop: nearest, fromNearby, distanceM: fromNearby?.walkDistanceM ?? estimateWalk(origin, nearest, pace).distanceM }];
    })
    .sort((a, b) => a.distanceM - b.distanceM);
}

export interface TcBay {
  bay: string;
  stopId: string;
  directionLabel: string;
  headsign: string;
}

/** Every bay of the transit center where the route stops, one entry per direction. */
export function baysFor(tc: TransitCenterDetail, routeId: string): TcBay[] {
  return tc.bays.flatMap((b) =>
    b.routes.filter((r) => r.routeId === routeId).map((r) => ({ bay: b.bay, stopId: b.stopId, directionLabel: r.directionLabel, headsign: r.headsign })),
  );
}
