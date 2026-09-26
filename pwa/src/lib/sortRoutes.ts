import type { NearbyStop, NearbyTransitCenter, RouteRef } from "../api/types.ts";
import { toRouteRef } from "./routes.ts";

/** METRORail lines in METRO's own order; other names sort alphabetically after them. */
const RAIL_ORDER = ["red", "green", "purple"];

/** Numeric route numbers first ("6" < "11" < "137"), then rail lines. */
export function compareRouteNames(a: string, b: string): number {
  const na = /^\d+$/.test(a) ? Number(a) : NaN;
  const nb = /^\d+$/.test(b) ? Number(b) : NaN;
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  if (!Number.isNaN(na)) return -1;
  if (!Number.isNaN(nb)) return 1;
  const ra = RAIL_ORDER.indexOf(a.toLowerCase());
  const rb = RAIL_ORDER.indexOf(b.toLowerCase());
  if (ra !== rb) return (ra < 0 ? RAIL_ORDER.length : ra) - (rb < 0 ? RAIL_ORDER.length : rb);
  return a.localeCompare(b);
}

/**
 * The home chip row: every route serving the returned stops (from `stop.routes`, so a route with
 * no bus in the window keeps its chip) plus nearby transit centers' routes, nearest first, then by
 * number with rail after bus. `bucket` coarsens the distance before comparing (e.g. to walk
 * minutes, so routes a few steps apart fall back to the numeric order riders scan).
 */
export function sortRouteChips(
  stops: NearbyStop[],
  tcs: { tc: NearbyTransitCenter; routes: RouteRef[] }[] = [],
  bucket: (distanceM: number) => number = (m) => m,
): RouteRef[] {
  const best = new Map<string, { route: RouteRef; distanceM: number }>();
  const offer = (route: RouteRef, walkDistanceM: number) => {
    const distanceM = bucket(walkDistanceM);
    const prev = best.get(route.id);
    if (!prev || distanceM < prev.distanceM) best.set(route.id, { route, distanceM });
  };
  for (const s of stops) for (const r of s.stop.routes) offer(toRouteRef(r), s.walkDistanceM);
  for (const { tc, routes } of tcs) for (const r of routes) offer(r, tc.walkDistanceM);
  return [...best.values()]
    .sort(
      (a, b) =>
        a.distanceM - b.distanceM ||
        Number(a.route.mode === "rail") - Number(b.route.mode === "rail") ||
        compareRouteNames(a.route.name, b.route.name),
    )
    .map((x) => x.route);
}
