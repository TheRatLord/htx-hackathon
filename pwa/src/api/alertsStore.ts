// The one source of "is there an alert?" for every screen (spec C.11, G.4).

import { useQuery } from "@tanstack/react-query";
import { alertsForItinerary, alertsForRoute, alertsForStop } from "../lib/alerts.ts";
import { apiGet } from "./client.ts";
import { keys } from "./keys.ts";
import type { Alert, AlertsResult, Itinerary } from "./types.ts";

const ALERTS_POLL_MS = 120_000;

export interface AlertsStore {
  status: "loading" | "ok" | "error";
  source?: AlertsResult["source"];
  alerts: Alert[];
  /** When the last answer arrived (ms), for "Updated 1 min ago". */
  updatedAt?: number;
  forRoute(routeId: string): Alert[];
  forStop(stopId: string, routeIds: string[]): Alert[];
  forItinerary(it: Itinerary): Alert[];
  retry(): void;
}

export function useAlerts(): AlertsStore {
  // A newly mounted AlertStatusLine must not retry a failed fetch by itself (that resets the
  // store to "loading" and unmounts it again); its "Try again" calls retry().
  const q = useQuery({ queryKey: keys.alerts(), queryFn: () => apiGet<AlertsResult>("/alerts"), refetchInterval: ALERTS_POLL_MS, retryOnMount: false });
  const alerts = q.data?.alerts ?? [];
  return {
    status: q.data ? "ok" : q.isError ? "error" : "loading",
    source: q.data?.source,
    alerts,
    updatedAt: q.data ? q.dataUpdatedAt : undefined,
    forRoute: (routeId) => alertsForRoute(alerts, routeId),
    forStop: (stopId, routeIds) => alertsForStop(alerts, stopId, routeIds),
    forItinerary: (it) => alertsForItinerary(alerts, it),
    retry: () => void q.refetch(),
  };
}
