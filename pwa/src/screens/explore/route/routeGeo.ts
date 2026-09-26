// Route-page helpers shared by D9 and the search results that open it (D5).

import type { LatLon, RouteDetail } from "../../../api/types.ts";
import { haversineM } from "../../../lib/geo.ts";

export type RouteDirectionDetail = RouteDetail["directions"][number];
export type RouteStop = RouteDirectionDetail["stops"][number];

/** "82 Westheimer" for a bus, "METRORail Red Line" for rail (as riders and the search results name them). */
export function routeTitle(route: Pick<RouteDetail, "displayName" | "longName" | "type">): string {
  return route.type === "rail" ? route.longName : `${route.displayName} ${route.longName}`;
}

/** The position in `stops` of the stop closest (straight line) to `from`, and how far it is. */
export function nearestIndex(stops: LatLon[], from: LatLon): { index: number; distanceM: number } | undefined {
  let best: { index: number; distanceM: number } | undefined;
  stops.forEach((stop, index) => {
    const distanceM = haversineM(from.lat, from.lon, stop.lat, stop.lon);
    if (!best || distanceM < best.distanceM) best = { index, distanceM };
  });
  return best;
}

/** The stop of one direction closest (straight line) to `from`. */
export function nearestStop(stops: RouteStop[], from: LatLon): RouteStop | undefined {
  const best = nearestIndex(stops, from);
  return best && stops[best.index];
}

/** The direction whose nearest stop is closest to `from`; the first direction without a fix. */
export function nearestDirection(route: Pick<RouteDetail, "directions">, from: LatLon | undefined): 0 | 1 {
  const [first] = route.directions;
  if (!from || !first) return first?.directionId ?? 0;
  const distance = (d: RouteDirectionDetail) => nearestIndex(d.stops, from)?.distanceM ?? Infinity;
  return route.directions.reduce((a, b) => (distance(b) < distance(a) ? b : a)).directionId;
}

/**
 * METRO's page for the route's kind of service. Per-route pages exist, but their addresses are
 * hand-made slugs that can't be derived from the GTFS names (requests.md), so this links one level up.
 */
export function schedulesUrl(route: Pick<RouteDetail, "type" | "longName">): string {
  const service = route.type === "rail" ? "metrorail" : /\bP&R\b/.test(route.longName) ? "park-and-ride-bus" : "local-bus";
  return `https://www.ridemetro.org/riding-metro/transit-services/${service}`;
}

/** A bus farther than this from every stop is off the route (deadheading, detoured, bad fix). */
const ON_ROUTE_M = 300;

/**
 * Each bus of this direction, keyed by the stop it is heading to: it sits on the spine between
 * that stop and the one before (the row above). Buses more than 300 m from every stop are left out.
 */
export function placeVehicles<V extends LatLon & { directionLabel: string }>(vehicles: V[], direction: RouteDirectionDetail): Map<string, V> {
  const { stops } = direction;
  const at = new Map<string, V>();
  for (const v of vehicles) {
    if (v.directionLabel !== direction.label) continue;
    const near = nearestIndex(stops, v);
    if (!near || near.distanceM > ON_ROUTE_M) continue;
    const { index } = near;
    // How far out of its way the bus is on each neighbouring segment; ~0 means it is on it.
    const detour = (a: LatLon, b: LatLon) => haversineM(a.lat, a.lon, v.lat, v.lon) + haversineM(v.lat, v.lon, b.lat, b.lon) - haversineM(a.lat, a.lon, b.lat, b.lon);
    // Before the first stop there is no segment: a bus not on the first one is still approaching it.
    const before = index > 0 ? detour(stops[index - 1], stops[index]) : near.distanceM;
    const after = index < stops.length - 1 ? detour(stops[index], stops[index + 1]) : Infinity;
    const heading = before <= after ? stops[index] : stops[index + 1];
    if (!at.has(heading.id)) at.set(heading.id, v);
  }
  return at;
}
