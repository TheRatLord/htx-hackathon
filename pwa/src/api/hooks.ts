// Data hooks (spec G.4). Polling runs only while the page is visible (TanStack's default)
// and everything refetches when the page becomes visible again.

export { useAlerts } from "./alertsStore.ts";

import { useQuery } from "@tanstack/react-query";
import { formatLatLon, roundedKey } from "../lib/geo.ts";
import type { PlanQuery } from "../lib/planQuery.ts";
import { apiGet } from "./client.ts";
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

export function useNearby(anchor?: LatLon, opts: { radius?: number; precise?: boolean } = {}) {
  const at = anchor ? roundedKey(anchor) : "";
  return useQuery({
    queryKey: keys.nearby(at, opts.radius, opts.precise),
    queryFn: () =>
      apiGet<NearbyResponse>("/nearby", { lat: anchor!.lat, lon: anchor!.lon, radius: opts.radius, precise: opts.precise ? 1 : undefined }),
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
    queryFn: () => apiGet<ArrivalsResult>("/arrivals", { stop: stopId, route: opts.route, limit: opts.limit }),
    enabled: opts.enabled ?? true,
    refetchInterval: LIVE_POLL_MS,
  });
}

export function useSearch(q: string, near?: LatLon) {
  const query = q.trim();
  return useQuery({
    queryKey: keys.search(query, near && roundedKey(near)),
    queryFn: () => apiGet<SearchResponse>("/search", { q: query, lat: near?.lat, lon: near?.lon }),
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

export function useStopSchedule(stopId: string, routeId: string, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: keys.stopSchedule(stopId, routeId),
    queryFn: () => apiGet<StopSchedule>(`/stops/${encodeURIComponent(stopId)}/schedule`, { route: routeId }),
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
    queryFn: () =>
      apiGet<PlanResponse>("/plan", { from: query!.from, to: query!.to, time: query!.time, arriveBy: query!.arriveBy ? 1 : undefined }),
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
    queryFn: () => apiGet<WalkRoute>("/walk", { from: at, toStop, to: toPoint }),
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
    queryFn: () => apiGet<{ vehicles: Vehicle[] }>("/vehicles", { route: routeId }),
    enabled: opts.enabled,
    refetchInterval: VEHICLE_POLL_MS,
    retry: false,
  });
}
