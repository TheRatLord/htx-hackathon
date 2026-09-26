import type { NearbyResponse, RouteRef, TransitCenterDetail } from "../../../api/types.ts";
import { routeRef, routeRefByName, toRouteRef } from "../../../lib/routes.ts";
import { compareRouteNames } from "../../../lib/sortRoutes.ts";
import { walkMinutes, type WalkPace } from "../../../lib/walk.ts";

/** Every route that leaves from a transit center's bays, plus the ones it can't place in a bay. */
export function tcRoutes(tc: TransitCenterDetail): RouteRef[] {
  const refs = [...tc.bays.flatMap((b) => b.routes.map((r) => routeRef(r.routeId))), ...tc.unassignedRoutes.map(routeRefByName)];
  return refs.filter((r): r is RouteRef => Boolean(r));
}

/**
 * D2 item 4: one chip per route of the returned stops (and the transit center within 1,000 m),
 * nearest first, then by number with rail after bus. "Nearest" compares walk minutes, not metres,
 * so routes a few steps apart fall back to numeric order, which is what riders scan (6, 11, 40, 41
 * at the F1 GPS). Local until `sortRouteChips` takes a distance bucket (requests.md).
 */
export function homeChips(nearby: NearbyResponse, tc: TransitCenterDetail | undefined, pace: WalkPace): RouteRef[] {
  const nearest = new Map<string, { route: RouteRef; walkMin: number }>();
  const offer = (route: RouteRef, distanceM: number) => {
    const walkMin = walkMinutes(distanceM, pace);
    const prev = nearest.get(route.id);
    if (!prev || walkMin < prev.walkMin) nearest.set(route.id, { route, walkMin });
  };
  for (const s of nearby.stops) for (const r of s.stop.routes) offer(toRouteRef(r), s.walkDistanceM);
  const nearTc = tc && nearby.transitCenters.find((c) => c.id === tc.id);
  if (nearTc) for (const r of tcRoutes(tc)) offer(r, nearTc.walkDistanceM);
  const byWalkThenNumber = (a: { route: RouteRef; walkMin: number }, b: { route: RouteRef; walkMin: number }) =>
    a.walkMin - b.walkMin || Number(a.route.mode === "rail") - Number(b.route.mode === "rail") || compareRouteNames(a.route.name, b.route.name);
  return [...nearest.values()].sort(byWalkThenNumber).map((x) => x.route);
}
