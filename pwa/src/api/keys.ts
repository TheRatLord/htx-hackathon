// TanStack Query keys, in one place so screens can invalidate or prefetch consistently.

import type { PlanQuery } from "../lib/planQuery.ts";

export const keys = {
  health: () => ["health"] as const,
  nearby: (anchor: string, radius?: number, precise?: boolean) => ["nearby", anchor, radius ?? null, Boolean(precise)] as const,
  stop: (id: string) => ["stop", id] as const,
  arrivals: (stopId: string, route?: string, limit?: number) => ["arrivals", stopId, route ?? null, limit ?? null] as const,
  search: (q: string, near?: string) => ["search", q, near ?? null] as const,
  route: (id: string) => ["route", id] as const,
  routeNext: (id: string, dir: 0 | 1) => ["routeNext", id, dir] as const,
  stopSchedule: (stopId: string, routeId: string) => ["stopSchedule", stopId, routeId] as const,
  transitCenters: () => ["transitCenters"] as const,
  transitCenter: (id: string) => ["transitCenter", id] as const,
  plan: (q: PlanQuery) => ["plan", q.from ?? null, q.to ?? null, q.time ?? null, Boolean(q.arriveBy)] as const,
  walk: (from: string, toStop: string) => ["walk", from, toStop] as const,
  tripStops: (tripId: string, fromStop?: string) => ["tripStops", tripId, fromStop ?? null] as const,
  vehicles: (routeId?: string) => ["vehicles", routeId ?? null] as const,
  alerts: () => ["alerts"] as const,
};
