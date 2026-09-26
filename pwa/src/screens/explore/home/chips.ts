import type { NearbyResponse, RouteRef, TransitCenterDetail } from "../../../api/types.ts";
import { sortRouteChips } from "../../../lib/sortRoutes.ts";
import { walkMinutes, type WalkPace } from "../../../lib/walk.ts";
import { tcRoutes } from "../tc/tcModel.ts";

/**
 * D2 item 4: one chip per route of the returned stops (and the transit center within 1,000 m),
 * nearest by walk minutes, then by number with rail after bus (6, 11, 40, 41 at the F1 GPS).
 */
export function homeChips(nearby: NearbyResponse, tc: TransitCenterDetail | undefined, pace: WalkPace): RouteRef[] {
  const nearTc = tc && nearby.transitCenters.find((c) => c.id === tc.id);
  return sortRouteChips(nearby.stops, nearTc ? [{ tc: nearTc, routes: tcRoutes(tc) }] : [], (m) => walkMinutes(m, pace));
}
