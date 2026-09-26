import { decodePolyline } from "../lib/geo.ts";
import { findRoute, findStop } from "../gtfs/store.ts";
import { getAlerts } from "./alerts.ts";
import { ApiError } from "./errors.ts";

export async function getRouteDetail(id: string) {
  const r = findRoute(id);
  if (!r) throw new ApiError(404, "ROUTE_NOT_FOUND", `Route ${id} doesn't exist. Try the number shown on the bus sign.`);
  const alerts = await getAlerts({ routeId: r.id });
  return {
    ...r,
    directions: r.directions.map((d) => ({
      ...d,
      stops: d.stopIds.flatMap((sid, i) => {
        const s = findStop(sid);
        return s ? [{ sequence: i + 1, id: s.id, name: s.name, lat: s.lat, lon: s.lon, ...(s.dir && { directionLabel: s.dir }), kind: s.kind }] : [];
      }),
      /** Same shape as `shape`, decoded to [lat, lon] pairs for convenience. */
      shapePoints: decodePolyline(d.shape),
    })),
    alerts: alerts.alerts,
    alertsSource: alerts.source,
  };
}
