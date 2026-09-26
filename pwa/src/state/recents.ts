// Recently viewed stops, routes, searches and trips (spec C.17), in localStorage["ridemetro.recents"].
// Writers: stops ← D6 (A), routes ← D9 (B), searches ← D5 (B), trips ← D11 (C). D16 only reads and clears.

import type { PlanQuery } from "../lib/planQuery.ts";
import { persistentStore } from "../lib/storage.ts";

const MAX = 10;

export interface RecentStop {
  id: string;
  name: string;
  kind: string;
  directionLabel?: string;
  side?: string;
  routes: string[];
  at: number;
}

export interface RecentRoute {
  id: string;
  name: string;
  at: number;
}

interface RecentSearch {
  q: string;
  at: number;
}

interface RecentTrip {
  query: PlanQuery;
  at: number;
}

interface Recents {
  stops: RecentStop[];
  routes: RecentRoute[];
  searches: RecentSearch[];
  trips: RecentTrip[];
}

const empty: Recents = { stops: [], routes: [], searches: [], trips: [] };
const store = persistentStore<Recents>("ridemetro.recents", empty, (r) => ({ ...empty, ...r }));

function push<T>(list: T[], item: T, same: (a: T) => boolean): T[] {
  return [item, ...list.filter((x) => !same(x))].slice(0, MAX);
}

const tripKey = (q: PlanQuery) => `${q.from}|${q.to}`;

export const recentsActions = {
  addStop(stop: Omit<RecentStop, "at">) {
    store.set((r) => ({ ...r, stops: push(r.stops, { ...stop, at: Date.now() }, (x) => x.id === stop.id) }));
  },
  addRoute(route: Omit<RecentRoute, "at">) {
    store.set((r) => ({ ...r, routes: push(r.routes, { ...route, at: Date.now() }, (x) => x.id === route.id) }));
  },
  addSearch(q: string) {
    const query = q.trim();
    if (!query) return;
    store.set((r) => ({ ...r, searches: push(r.searches, { q: query, at: Date.now() }, (x) => x.q.toLowerCase() === query.toLowerCase()) }));
  },
  removeSearch(q: string) {
    store.set((r) => ({ ...r, searches: r.searches.filter((x) => x.q !== q) }));
  },
  addTrip(query: PlanQuery) {
    store.set((r) => ({ ...r, trips: push(r.trips, { query, at: Date.now() }, (x) => tripKey(x.query) === tripKey(query)) }));
  },
  clear() {
    store.set(empty);
  },
};

export function useRecents() {
  return { ...store.use(), ...recentsActions };
}
