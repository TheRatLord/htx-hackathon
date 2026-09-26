import type { NearbyResponse, RouteRef, TransitCenterDetail } from "../../../api/types.ts";
import { routeRef, routeRefByName } from "../../../lib/routes.ts";
import { sortRouteChips } from "../../../lib/sortRoutes.ts";
import { walkMinutes, type WalkPace } from "../../../lib/walk.ts";

/** Every route that leaves from a transit center's bays, plus the ones it can't place in a bay. */
export function tcRoutes(tc: TransitCenterDetail): RouteRef[] {
  const refs = [...tc.bays.flatMap((b) => b.routes.map((r) => routeRef(r.routeId))), ...tc.unassignedRoutes.map(routeRefByName)];
  return refs.filter((r): r is RouteRef => Boolean(r));
}

/**
 * D2 item 4. Distances are compared in walk minutes so routes a minute apart fall back to numeric
 * order, which is what riders scan (6, 11, 40, 41 at the F1 GPS); metres would split them by
 * a few steps.
 */
export function homeChips(nearby: NearbyResponse, tc: TransitCenterDetail | undefined, pace: WalkPace): RouteRef[] {
  const inMinutes = <T extends { walkDistanceM: number }>(x: T): T => ({ ...x, walkDistanceM: walkMinutes(x.walkDistanceM, pace) });
  const nearTc = tc && nearby.transitCenters.find((c) => c.id === tc.id);
  return sortRouteChips(nearby.stops.map(inMinutes), nearTc ? [{ tc: inMinutes(nearTc), routes: tcRoutes(tc) }] : []);
}
