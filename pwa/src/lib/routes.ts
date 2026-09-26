// Route lookups from the static /data/routes.json (cached by the service worker).

import { useSyncExternalStore } from "react";
import { ApiError } from "../api/client.ts";
import type { ClientRoute, RouteRef } from "../api/types.ts";

let all: ClientRoute[] = [];
let byId = new Map<string, RouteRef>();
let byName = new Map<string, RouteRef>();
let stopDirections: Map<string, StopDirection[]> | null = null;
let loading: Promise<void> | null = null;
/** Why the last load failed, until the next one starts. */
let failure: ApiError | undefined;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export interface StopDirection {
  /** The GTFS route id ("082"). */
  routeId: string;
  directionLabel: string;
  headsign: string;
}

const toRef = (r: ClientRoute): RouteRef => ({ id: r.id, name: r.displayName, color: r.color, textColor: r.textColor, mode: r.type });

/** Installs the route table (called by loadRoutes; tests call it with the file contents). */
export function primeRoutes(routes: ClientRoute[]) {
  all = routes;
  byId = new Map(routes.map((r) => [r.id, toRef(r)]));
  byName = new Map(routes.map((r) => [r.displayName.toLowerCase(), toRef(r)]));
  stopDirections = null;
  notify();
}

/** One fetch per session; a failed one is retried by the next caller. */
export function loadRoutes(): Promise<void> {
  if (!loading && failure) {
    failure = undefined;
    notify();
  }
  loading ??= fetch("/data/routes.json")
    .then((res) => {
      if (!res.ok) throw new Error(`routes.json: ${res.status}`);
      return res.json() as Promise<ClientRoute[]>;
    })
    .then(primeRoutes)
    .catch(() => {
      loading = null;
      failure = new ApiError("network", 0, "The route list could not be loaded.");
      notify();
    });
  return loading;
}

/** GTFS bus ids are zero-padded ("080"); URLs and riders say "80". */
const padded = (id: string) => id.padStart(3, "0");

/** Accepts "080", "80" or "Red", like the server. */
export function routeRef(id: string): RouteRef | undefined {
  return byId.get(id) ?? byId.get(padded(id)) ?? byName.get(id.toLowerCase());
}

/** The GTFS id for "80", "080" or "Red", so two spellings of one route compare equal (even before routes.json loads). */
export function canonicalRouteId(id: string): string {
  return routeRef(id)?.id ?? padded(id);
}

/** For transit-center `unassignedRoutes`, which carry short names such as "219". */
export function routeRefByName(shortName: string): RouteRef | undefined {
  return byName.get(shortName.toLowerCase()) ?? byId.get(padded(shortName));
}

/** A RouteRef for a route as the API describes it; `mode` comes from routes.json when loaded. */
export function toRouteRef(r: { id: string; name: string; color: string; textColor: string }): RouteRef {
  return { ...r, mode: routeRef(r.id)?.mode ?? "bus" };
}

/** METRO's bus navy (119 of 120 routes), for a route the caller knows only by id and name. */
const BUS_NAVY = "#004080";

/** routes.json's entry for the route, else a bus badge from what the caller has (saved routes, GTFS-RT alert routes). */
export function routeRefOrFallback(id: string, name: string, color = BUS_NAVY): RouteRef {
  return routeRef(id) ?? toRouteRef({ id, name, color, textColor: "#FFFFFF" });
}

/**
 * The direction of `routeId` that serves `stopId` (its first such direction), for a route with no
 * departure to describe it. Undefined until routes.json has loaded.
 */
export function stopDirection(routeId: string, stopId: string): StopDirection | undefined {
  if (!stopDirections) {
    if (!all.length) return undefined;
    stopDirections = new Map();
    for (const route of all) {
      for (const dir of route.directions) {
        for (const id of dir.stopIds) {
          const list = stopDirections.get(id) ?? [];
          if (list.some((d) => d.routeId === route.id)) continue;
          list.push({ routeId: route.id, directionLabel: dir.label, headsign: dir.headsigns[0] ?? "" });
          stopDirections.set(id, list);
        }
      }
    }
  }
  const id = canonicalRouteId(routeId);
  return stopDirections.get(stopId)?.find((d) => d.routeId === id);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  void loadRoutes();
  return () => listeners.delete(l);
};
const size = () => byId.size;

/** Re-renders the caller once routes.json has loaded, so routeRef() lookups fill in. */
export function useRoutesLoaded(): boolean {
  return useSyncExternalStore(subscribe, size, size) > 0;
}

const allRoutes = () => all;
const lastFailure = () => failure;

/** Every route (D20); `routes` is empty while loading or after `error`. */
export function useAllRoutes(): { routes: ClientRoute[]; error?: ApiError; retry: () => void } {
  const routes = useSyncExternalStore(subscribe, allRoutes, allRoutes);
  const error = useSyncExternalStore(subscribe, lastFailure, lastFailure);
  return { routes, error, retry: () => void loadRoutes() };
}
