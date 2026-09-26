import type { NearbyResponse, RouteRef, TransitCenterDetail } from "../../../api/types.ts";
import { compareRouteNames, sortRouteChips } from "../../../lib/sortRoutes.ts";
import { walkMinutes, type WalkPace } from "../../../lib/walk.ts";
import { tcRoutes } from "../tc/tcModel.ts";

/**
 * D2 item 4: one chip per route of the returned stops (and the transit center within 1,000 m),
 * nearest by walk minutes, then by number with rail after bus (6, 11, 40, 41 at the F1 GPS).
 * D3 (`selectedId`): the chosen route first, then the rest in plain number order (58, 39, 66, 85, 89),
 * so the row reads as a list the rider can scan rather than a distance ranking.
 */
export function homeChips(nearby: NearbyResponse, tc: TransitCenterDetail | undefined, pace: WalkPace, selectedId?: string): RouteRef[] {
  const nearTc = tc && nearby.transitCenters.find((c) => c.id === tc.id);
  const chips = sortRouteChips(nearby.stops, nearTc ? [{ tc: nearTc, routes: tcRoutes(tc) }] : [], (m) => walkMinutes(m, pace));
  if (!selectedId) return chips;
  const selected = chips.filter((r) => r.id === selectedId);
  const rest = chips
    .filter((r) => r.id !== selectedId)
    .sort((a, b) => Number(a.mode === "rail") - Number(b.mode === "rail") || compareRouteNames(a.name, b.name));
  return [...selected, ...rest];
}
