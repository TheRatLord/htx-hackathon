import { findRoute, gtfs, tripInfo } from "../gtfs/store.ts";
import { ODATA_PREFIX, vehicles } from "../realtime/metroApi.ts";
import { ApiError } from "./errors.ts";

export interface Vehicle {
  vehicleId: string;
  routeId: string;
  route: string;
  tripId: string;
  directionLabel: string;
  headsign: string;
  lat: number;
  lon: number;
  delaySeconds: number;
  reportedAt: string;
  ageSeconds: number;
}

export async function getVehicles(routeFilter?: string, now = Date.now()): Promise<Vehicle[]> {
  const route = routeFilter ? findRoute(routeFilter) : undefined;
  if (routeFilter && !route) throw new ApiError(404, "ROUTE_NOT_FOUND", `Route ${routeFilter} doesn't exist.`);
  const list = await vehicles();
  return list.flatMap((v): Vehicle[] => {
    const tripId = v.TripId?.replace(ODATA_PREFIX, "") ?? "";
    const ti = gtfs().tripIndex.get(tripId);
    const info = ti !== undefined ? tripInfo(ti) : undefined;
    const r = info?.route ?? findRoute(v.RouteName);
    if (!r || (route && r.id !== route.id)) return [];
    return [
      {
        vehicleId: v.VehicleId,
        routeId: r.id,
        route: r.displayName,
        tripId,
        directionLabel: info?.directionLabel ?? v.DirectionName.split(", ")[1] ?? "",
        headsign: info?.headsign ?? v.DestinationName,
        lat: v.Latitude,
        lon: v.Longitude,
        delaySeconds: v.Delayseconds,
        reportedAt: v.VehicleReportTime,
        ageSeconds: Math.max(0, Math.round((now - Date.parse(v.VehicleReportTime)) / 1000)),
      },
    ];
  });
}
