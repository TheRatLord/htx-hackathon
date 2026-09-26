// D10's view of a transit center: its route chips, where a route leaves from, and its departures
// grouped by bay. Pure functions over the /api/transit-centers/:id answer.

import type { Arrival, RouteRef, TransitCenterDetail } from "../../../api/types.ts";
import { canonicalRouteId, routeRef, routeRefByName, toRouteRef } from "../../../lib/routes.ts";
import { compareRouteNames } from "../../../lib/sortRoutes.ts";

export type Bay = TransitCenterDetail["bays"][number];

export interface DepartureRow {
  route: RouteRef;
  directionLabel: string;
  headsign: string;
  deps: Arrival[];
}

const refFor = (id: string, name: string, color = "var(--c-brand-navy)"): RouteRef =>
  routeRef(id) ?? toRouteRef({ id, name, color, textColor: "#FFFFFF" });

/** Every route at the center: bay routes plus the ones METRO publishes without a bay, in route-number order. */
export function tcRoutes(tc: Pick<TransitCenterDetail, "bays" | "unassignedRoutes">): RouteRef[] {
  const refs = new Map<string, RouteRef>();
  for (const b of tc.bays) for (const r of b.routes) refs.set(canonicalRouteId(r.routeId), refFor(r.routeId, r.route));
  for (const name of tc.unassignedRoutes) {
    const ref = routeRefByName(name);
    if (ref) refs.set(ref.id, ref);
  }
  return [...refs.values()].sort((a, b) => compareRouteNames(a.name, b.name));
}

export const servesRoute = (bay: Pick<Bay, "routes">, routeId: string) =>
  bay.routes.some((r) => canonicalRouteId(r.routeId) === canonicalRouteId(routeId));

/** Departures as rows of one route, direction and headsign, in the order they leave. */
export function departureRows(deps: Arrival[], routeId?: string): DepartureRow[] {
  const rows = new Map<string, DepartureRow>();
  for (const d of deps) {
    if (routeId && canonicalRouteId(d.routeId) !== canonicalRouteId(routeId)) continue;
    const key = `${d.routeId}|${d.directionLabel}|${d.headsign}`;
    let row = rows.get(key);
    if (!row) {
      row = { route: refFor(d.routeId, d.routeShortName, d.routeColor), directionLabel: d.directionLabel, headsign: d.headsign, deps: [] };
      rows.set(key, row);
    }
    row.deps.push(d);
  }
  return [...rows.values()];
}

/** One diagram block per platform stop, bays in letter order; platforms in name order ("Platform 1" first). */
export function platformsOf(tc: Pick<TransitCenterDetail, "bays" | "stopIds">, names: Map<string, string>): { stopId: string; name?: string; bays: Bay[] }[] {
  return tc.stopIds
    .map((stopId) => ({
      stopId,
      name: names.get(stopId),
      bays: tc.bays.filter((b) => b.stopId === stopId).sort((a, b) => a.bay.localeCompare(b.bay)),
    }))
    .filter((p) => p.bays.length > 0)
    .sort((a, b) => (a.name ?? a.stopId).localeCompare(b.name ?? b.stopId, "en", { numeric: true }));
}
