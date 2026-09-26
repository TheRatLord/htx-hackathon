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

/** "Northwest Transit Center" → "NW TC": the map tag beside the pin must stay on one line (06). */
export function shortTc(name: string): string {
  return name
    .replace(/\s*Transit Center$/i, " TC")
    .replace(/\b(North|South)(east|west)\b/gi, (_, a: string, b: string) => `${a[0]}${b[0]}`.toUpperCase())
    .trim();
}

/** The first bus the rider can still catch: the first departure at least `walkMin` away. */
export function catchableAt(deps: { departureTime: string }[], walkMin: number, now: number): number | undefined {
  const times = deps.map((d) => Date.parse(d.departureTime)).filter((at) => at - now >= walkMin * 60_000);
  return times.length ? Math.min(...times) : undefined;
}

/**
 * D3's card order: the earliest bus the rider can catch first, then the shorter walk (06: 8249's
 * 58 in 2 min no longer sits under the TC's 58 in 59 min). A card with nothing catchable goes last.
 * A `pinned` card (the transit center, spec D3 / F7) is never lower than second, so it stays inside
 * the half sheet. While any card's times are still loading the order stays as given, so cards
 * don't jump twice.
 */
export function rankByCatch<T>(cards: { item: T; deps: { departureTime: string }[] | undefined; walkMin: number; pinned?: boolean }[], now: number): T[] {
  if (cards.some((c) => !c.deps)) return cards.map((c) => c.item);
  const keyed = cards.map((c, i) => ({ c, i, at: catchableAt(c.deps!, c.walkMin, now) ?? Infinity }));
  keyed.sort((a, b) => a.at - b.at || a.c.walkMin - b.c.walkMin || a.i - b.i);
  const pin = keyed.findIndex((k) => k.c.pinned);
  if (pin > 1) keyed.splice(1, 0, ...keyed.splice(pin, 1));
  return keyed.map((k) => k.c.item);
}
