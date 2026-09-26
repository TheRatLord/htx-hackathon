// Type-only re-exports so the UI matches the server exactly (spec G.4).
import type { DataSource } from "../../shared/types.ts";


export type { Arrival, ClientStop, ClientRoute, DataSource, LatLon, Cardinal } from "../../shared/types.ts";
export type { NearbyStop, NearbyRoute, NearbyTransitCenter } from "../../server/services/nearby.ts";
export type { StopSummary } from "../../server/services/present.ts";
export type { Alert, AlertsResult } from "../../server/services/alerts.ts";
export type { SearchResult, SearchResponse } from "../../server/services/search.ts";
export type { PlanResponse, Itinerary, Leg, WalkLeg, TransitLeg, PlanStop } from "../../server/services/plan.ts";
export type { WalkRoute, WalkStep } from "../../server/services/walk.ts";
export type { Vehicle } from "../../server/services/vehicles.ts";
export type { TransitCenter } from "../../server/services/transitCenters.ts";
export type { ArrivalsResult } from "../../server/services/arrivals.ts";
export type { RouteNext } from "../../server/services/routeNext.ts";
export type { StopSchedule } from "../../server/services/stopSchedule.ts";

export type NearbyResponse = Awaited<ReturnType<typeof import("../../server/services/nearby.ts").getNearby>>;
export type StopDetail = Awaited<ReturnType<typeof import("../../server/services/stopDetail.ts").getStopDetail>>;
export type TransitCenterDetail = Awaited<ReturnType<typeof import("../../server/services/stopDetail.ts").getTransitCenterDetail>>;
export type RouteDetail = Awaited<ReturnType<typeof import("../../server/services/routeDetail.ts").getRouteDetail>>;
export type TripDetail = ReturnType<typeof import("../../server/services/trips.ts").getTrip>;
export type TransitCenterSummary = Omit<import("../../server/services/transitCenters.ts").TransitCenter, "bays"> & { bayCount: number };

export type Health = ReturnType<typeof import("../../server/services/health.ts").getHealth>;

/** How a departure time is displayed (C.2). "simulated" renders as "Live (demo)". */
export type Status = "live" | "scheduled" | "canceled" | "simulated";

/** The departure fields the UI uses; `minutesAway` is never displayed (times come from `departureTime`). */
export interface Dep {
  departureTime: string;
  isRealtime: boolean;
  canceled: boolean;
  source: DataSource;
  tripId: string;
}

export interface RouteRef {
  id: string;
  name: string;
  color: string;
  textColor: string;
  mode: "bus" | "rail";
}
