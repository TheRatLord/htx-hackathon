// Saved stops and routes (spec C.17), in localStorage["ridemetro.saved"].

import { persistentStore } from "../lib/storage.ts";

export interface SavedStop {
  id: string;
  name: string;
  addedAt: number;
  /** The route that was expanded when the rider tapped Save; shown first on the saved row. */
  preferredRouteId?: string;
}

export interface SavedRoute {
  id: string;
  name: string;
}

interface Saved {
  stops: SavedStop[];
  routes: SavedRoute[];
}

const store = persistentStore<Saved>("ridemetro.saved", { stops: [], routes: [] }, (s) => ({ stops: s.stops ?? [], routes: s.routes ?? [] }));

const without = <T extends { id: string }>(list: T[], id: string) => list.filter((x) => x.id !== id);

export const savedActions = {
  add(stop: Omit<SavedStop, "addedAt">) {
    store.set((s) => ({ ...s, stops: [...without(s.stops, stop.id), { ...stop, addedAt: Date.now() }] }));
  },
  remove(id: string) {
    store.set((s) => ({ ...s, stops: without(s.stops, id) }));
  },
  /** Undo for remove: puts the stop back where it was. */
  restore(stop: SavedStop, index: number) {
    store.set((s) => {
      const stops = without(s.stops, stop.id);
      stops.splice(Math.min(index, stops.length), 0, stop);
      return { ...s, stops };
    });
  },
  move(id: string, dir: "up" | "down") {
    store.set((s) => {
      const i = s.stops.findIndex((x) => x.id === id);
      const j = dir === "up" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= s.stops.length) return s;
      const stops = [...s.stops];
      [stops[i], stops[j]] = [stops[j], stops[i]];
      return { ...s, stops };
    });
  },
  addRoute(route: SavedRoute) {
    store.set((s) => ({ ...s, routes: [...without(s.routes, route.id), route] }));
  },
  removeRoute(id: string) {
    store.set((s) => ({ ...s, routes: without(s.routes, id) }));
  },
};

export function useSaved() {
  const saved = store.use();
  return {
    ...saved,
    ...savedActions,
    isSaved: (stopId: string) => saved.stops.some((s) => s.id === stopId),
    isRouteSaved: (routeId: string) => saved.routes.some((r) => r.id === routeId),
  };
}
