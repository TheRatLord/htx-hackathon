import type { Arrival } from "../../../api/types.ts";
import { toRouteRef } from "../../../lib/routes.ts";
import type { SavedStopRoute } from "../../../ui/types.ts";

/** A saved stop's arrivals as SavedStopRow routes: one per route, direction and headsign, in arrival order. */
export function savedRoutes(arrivals: Arrival[]): SavedStopRoute[] {
  const byKey = new Map<string, SavedStopRoute>();
  for (const a of arrivals) {
    const key = `${a.routeId}|${a.directionLabel}|${a.headsign}`;
    let entry = byKey.get(key);
    if (!entry) {
      const route = toRouteRef({ id: a.routeId, name: a.routeShortName, color: a.routeColor, textColor: a.routeTextColor });
      entry = { route, directionLabel: a.directionLabel, headsign: a.headsign, deps: [] };
      byKey.set(key, entry);
    }
    entry.deps.push(a);
  }
  return [...byKey.values()];
}
