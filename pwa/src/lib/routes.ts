// Route lookups from the static /data/routes.json (cached by the service worker).

import { useSyncExternalStore } from "react";
import type { ClientRoute, RouteRef } from "../api/types.ts";

let byId = new Map<string, RouteRef>();
let byName = new Map<string, RouteRef>();
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

const toRef = (r: ClientRoute): RouteRef => ({ id: r.id, name: r.displayName, color: r.color, textColor: r.textColor, mode: r.type });

/** Installs the route table (called by loadRoutes; tests call it with the file contents). */
export function primeRoutes(routes: ClientRoute[]) {
  byId = new Map(routes.map((r) => [r.id, toRef(r)]));
  byName = new Map(routes.map((r) => [r.displayName.toLowerCase(), toRef(r)]));
  listeners.forEach((l) => l());
}

export function loadRoutes(): Promise<void> {
  loading ??= fetch("/data/routes.json")
    .then((res) => res.json() as Promise<ClientRoute[]>)
    .then(primeRoutes)
    .catch(() => {
      loading = null;
    });
  return loading;
}

/** Accepts "080", "80" or "Red", like the server. */
export function routeRef(id: string): RouteRef | undefined {
  return byId.get(id) ?? byId.get(id.padStart(3, "0")) ?? byName.get(id.toLowerCase());
}

/** For transit-center `unassignedRoutes`, which carry short names such as "219". */
export function routeRefByName(shortName: string): RouteRef | undefined {
  return byName.get(shortName.toLowerCase()) ?? byId.get(shortName.padStart(3, "0"));
}

/** A RouteRef for a route as the API describes it; `mode` comes from routes.json when loaded. */
export function toRouteRef(r: { id: string; name: string; color: string; textColor: string }): RouteRef {
  return { ...r, mode: routeRef(r.id)?.mode ?? "bus" };
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
