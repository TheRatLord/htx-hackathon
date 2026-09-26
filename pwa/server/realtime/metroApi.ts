// METRO "Transit Data API" (OData, JSON): per-stop arrivals and live vehicles.

import { config } from "../config.ts";
import { TtlCache } from "../lib/cache.ts";
import { fetchUpstream, metroKeyHeader } from "../lib/upstream.ts";

const BASE = "https://api.ridemetro.org/data";
/** METRO's agency/feed prefix on every OData id. */
export const ODATA_PREFIX = "Ho414_4620_";

export interface ODataArrival {
  IsRealTime: boolean;
  TripId: string;
  StopId: string;
  RouteName: string;
  DirectionText: string;
  UtcDepartureTime: string;
  ScheduledTime: string;
  DelaySeconds: number;
  IsCanceled: boolean;
}

export interface ODataVehicle {
  VehicleId: string;
  RouteName: string;
  TripId: string;
  DirectionName: string | null;
  DestinationName: string | null;
  Delayseconds: number;
  VehicleReportTime: string;
  Latitude: number;
  Longitude: number;
}

const arrivalsCache = new TtlCache<ODataArrival[]>(20_000);
const vehiclesCache = new TtlCache<ODataVehicle[]>(15_000, 1);

/** Live-only: recorded arrivals would be stale, so OFFLINE mode uses the schedule instead. */
export const hasTransitApi = () => Boolean(config.metroTransitApiKey) && !config.offline;

async function get<T>(path: string, fixtureKey: string): Promise<T[]> {
  const { body } = await fetchUpstream<{ value: T[] }>({
    service: "metro-odata",
    url: `${BASE}${path}`,
    headers: metroKeyHeader(config.metroTransitApiKey),
    fixtureKey,
    timeoutMs: 6000,
  });
  return body.value;
}

export function stopArrivals(stopId: string): Promise<ODataArrival[]> {
  return arrivalsCache.get(stopId, () => get<ODataArrival>(`/Stops('${ODATA_PREFIX}${stopId}')/Arrivals`, `arrivals/${stopId}`));
}

export function vehicles(): Promise<ODataVehicle[]> {
  return vehiclesCache.get("all", () => get<ODataVehicle>("/Vehicles", "vehicles"));
}

/** "Ho414_4620_79_K" -> { stopId: "79", bay: "K" } */
export function parseODataStopId(id: string): { stopId: string; bay?: string } {
  const [stopId, bay] = id.replace(ODATA_PREFIX, "").split("_");
  return { stopId, bay };
}
