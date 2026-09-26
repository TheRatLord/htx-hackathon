// Types shared by the data build, the API server and the frontend.

export type Cardinal = "Northbound" | "Southbound" | "Eastbound" | "Westbound";
export type StopKind = "stop" | "transit-center" | "park-and-ride" | "rail";

/** One entry of public/data/stops.json. */
export interface ClientStop {
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** Direction buses travel when leaving this stop, derived from route shapes. */
  dir?: Cardinal;
  /** Travel bearing in degrees (0 = north). */
  bearing?: number;
  /** e.g. "East side of M L King Blvd" (only when direction is unambiguous). */
  side?: string;
  /** Display route names served (e.g. "80", "Red"). */
  routes: string[];
  kind: StopKind;
  wheelchair?: boolean;
}

export interface RouteDirection {
  directionId: 0 | 1;
  /** Route-level label from METRO (e.g. "Northbound", "Inbound"). */
  label: string;
  /** Most common first. */
  headsigns: string[];
  /** Stop ids of the most common trip pattern, in travel order. */
  stopIds: string[];
  /** Google encoded polyline (precision 5), simplified to ~5 m. */
  shape: string;
}

/** One entry of public/data/routes.json. */
export interface ClientRoute {
  id: string;
  /** GTFS short name, e.g. "080". */
  shortName: string;
  /** What riders call it, e.g. "80" or "Red". */
  displayName: string;
  longName: string;
  color: string;
  textColor: string;
  type: "bus" | "rail";
  directions: RouteDirection[];
}

export type DataSource =
  | "metro-arrivals-api"
  | "gtfs-rt"
  | "schedule"
  | "simulated";

export interface Arrival {
  tripId: string;
  routeId: string;
  routeShortName: string;
  routeColor: string;
  routeTextColor: string;
  headsign: string;
  directionLabel: string;
  /** Bay letter at a transit center, when known. */
  bay?: string;
  scheduledTime: string;
  departureTime: string;
  minutesAway: number;
  isRealtime: boolean;
  source: DataSource;
  delaySeconds: number;
  canceled: boolean;
}

export interface LatLon {
  lat: number;
  lon: number;
}
