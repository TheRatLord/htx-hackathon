// Data hooks (spec G.4). Polling runs only while the page is visible (TanStack's default)
// and everything refetches when the page becomes visible again.

export { useAlerts } from "./alertsStore.ts";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { formatLatLon, haversineM, roundedKey } from "../lib/geo.ts";
import type { PlanQuery } from "../lib/planQuery.ts";
import { ApiError, apiGet } from "./client.ts";
import { keys } from "./keys.ts";
import type {
  ArrivalsResult,
  Health,
  LatLon,
  NearbyResponse,
  PlanResponse,
  RouteDetail,
  RouteNext,
  SearchResponse,
  StopDetail,
  StopSchedule,
  TransitCenterDetail,
  TransitCenterSummary,
  TripDetail,
  Vehicle,
  WalkRoute,
} from "./types.ts";

const LIVE_POLL_MS = 30_000;
const VEHICLE_POLL_MS = 15_000;

export function useHealth() {
  return useQuery({ queryKey: keys.health(), queryFn: () => apiGet<Health>("/health"), staleTime: 5 * 60_000 });
}

/** The nearby list re-anchors only once the rider has moved this far (GPS jitter and walking along a block don't). */
const REANCHOR_M = 75;

/**
 * `p`, held still until it moves more than REANCHOR_M. With a high-accuracy watch, every ~11 m
 * step would otherwise be a new query key: a new /nearby request (three OSRM walks with
 * `precise`) and a reshuffled list.
 */
function useStableAnchor(p: LatLon | undefined): LatLon | undefined {
  const [anchor, setAnchor] = useState(p);
  const moved = p ? !anchor || haversineM(anchor.lat, anchor.lon, p.lat, p.lon) > REANCHOR_M : anchor !== undefined;
  if (moved) setAnchor(p);
  return moved ? p : anchor;
}

export function useNearby(near?: LatLon, opts: { radius?: number; precise?: boolean } = {}) {
  const anchor = useStableAnchor(near);
  const at = anchor ? roundedKey(anchor) : "";
  return useQuery({
    queryKey: keys.nearby(at, opts.radius, opts.precise),
    queryFn: ({ signal }) =>
      apiGet<NearbyResponse>("/nearby", { lat: anchor!.lat, lon: anchor!.lon, radius: opts.radius, precise: opts.precise ? 1 : undefined }, signal),
    enabled: Boolean(anchor),
    refetchInterval: LIVE_POLL_MS,
    placeholderData: (prev) => prev,
  });
}

/** Polls by default; `refetchInterval: false` fetches once (D6 takes its times from /arrivals). */
export function useStop(id: string, opts: { enabled?: boolean; refetchInterval?: number | false } = {}) {
  return useQuery({
    queryKey: keys.stop(id),
    queryFn: () => apiGet<StopDetail>(`/stops/${encodeURIComponent(id)}`),
    enabled: opts.enabled ?? true,
    refetchInterval: opts.refetchInterval ?? LIVE_POLL_MS,
  });
}

export function useArrivals(stopId: string, opts: { route?: string; limit?: number; enabled?: boolean } = {}) {
  return useQuery({
    queryKey: keys.arrivals(stopId, opts.route, opts.limit),
    queryFn: ({ signal }) => apiGet<ArrivalsResult>("/arrivals", { stop: stopId, route: opts.route, limit: opts.limit }, signal),
    enabled: opts.enabled ?? true,
    refetchInterval: LIVE_POLL_MS,
  });
}

export function useSearch(q: string, near?: LatLon) {
  const query = q.trim();
  return useQuery({
    queryKey: keys.search(query, near && roundedKey(near)),
    queryFn: ({ signal }) => apiGet<SearchResponse>("/search", { q: query, lat: near?.lat, lon: near?.lon }, signal),
    enabled: query.length > 0,
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useRoute(id: string, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: keys.route(id),
    queryFn: () => apiGet<RouteDetail>(`/routes/${encodeURIComponent(id)}`),
    enabled: opts.enabled ?? true,
    staleTime: 5 * 60_000,
  });
}

export function useRouteNext(id: string, dir: 0 | 1) {
  return useQuery({
    queryKey: keys.routeNext(id, dir),
    queryFn: () => apiGet<RouteNext>(`/routes/${encodeURIComponent(id)}/next`, { dir }),
    refetchInterval: 60_000,
  });
}

/** Today's schedule, or with `date` ("20260926", a GTFS service date) that day's (D7 day tabs). */
export function useStopSchedule(stopId: string, routeId: string, opts: { enabled?: boolean; date?: string } = {}) {
  return useQuery({
    queryKey: keys.stopSchedule(stopId, routeId, opts.date),
    queryFn: () => apiGet<StopSchedule>(`/stops/${encodeURIComponent(stopId)}/schedule`, { route: routeId, ...(opts.date && { date: opts.date }) }),
    enabled: opts.enabled ?? true,
    staleTime: 5 * 60_000,
  });
}

export function useTransitCenters() {
  return useQuery({
    queryKey: keys.transitCenters(),
    queryFn: () => apiGet<{ transitCenters: TransitCenterSummary[] }>("/transit-centers"),
    staleTime: 60 * 60_000,
  });
}

export function useTransitCenter(id: string, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: keys.transitCenter(id),
    queryFn: () => apiGet<TransitCenterDetail>(`/transit-centers/${encodeURIComponent(id)}`),
    enabled: opts.enabled ?? true,
    refetchInterval: LIVE_POLL_MS,
  });
}

/** Runs when both ends are set. */
export function usePlan(query: PlanQuery | null) {
  return useQuery({
    queryKey: keys.plan(query ?? {}),
    queryFn: ({ signal }) =>
      apiGet<PlanResponse>("/plan", { from: query!.from, to: query!.to, time: query!.time, arriveBy: query!.arriveBy ? 1 : undefined }, signal),
    enabled: Boolean(query?.from && query?.to),
    staleTime: 60_000,
  });
}

/** To a stop id, or to a place (the last walk of a trip). */
export function useWalk(from?: LatLon, to?: string | LatLon, opts: { enabled?: boolean } = {}) {
  const at = from ? formatLatLon(from) : "";
  const toStop = typeof to === "string" ? to : undefined;
  const toPoint = typeof to === "object" ? formatLatLon(to) : undefined;
  return useQuery({
    // A "lat,lon" never clashes with a stop id.
    queryKey: keys.walk(at, toStop ?? toPoint ?? ""),
    queryFn: ({ signal }) => apiGet<WalkRoute>("/walk", { from: at, toStop, to: toPoint }, signal),
    enabled: Boolean(from && to) && (opts.enabled ?? true),
    staleTime: 60 * 60_000,
  });
}

export function useTripStops(tripId?: string, fromStop?: string) {
  return useQuery({
    queryKey: keys.tripStops(tripId ?? "", fromStop),
    queryFn: () => apiGet<TripDetail>(`/trips/${encodeURIComponent(tripId!)}`, { fromStop }),
    enabled: Boolean(tripId),
    staleTime: 5 * 60_000,
  });
}

export function useVehicles(routeId: string | undefined, opts: { enabled: boolean }) {
  return useQuery({
    queryKey: keys.vehicles(routeId),
    queryFn: async () => {
      const res = await apiGet<{ vehicles: Vehicle[]; available?: false }>("/vehicles", { route: routeId });
      // No key, or offline: the server says so with a 200 (no failed request in the console).
      if (res.available === false) throw new ApiError("realtime_unavailable", 503, "Live bus positions are unavailable.");
      return res;
    },
    enabled: opts.enabled,
    // Stop polling once the server has said live positions are unavailable.
    refetchInterval: (q) => (q.state.error instanceof ApiError && q.state.error.code === "realtime_unavailable" ? false : VEHICLE_POLL_MS),
    retry: false,
  });
}
