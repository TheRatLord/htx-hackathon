// Stops and the directions serving them, read from the static /data files (the service worker
// precaches them). My routes, saved rows and affected stops use these so they never depend on
// recents (which Recent clears) or on one API call per stop.

import { useEffect, useState } from "react";
import type { ClientRoute, ClientStop } from "../../api/types.ts";

export interface StopDirection {
  /** The GTFS route id ("082"). */
  routeId: string;
  directionLabel: string;
  headsign: string;
}

/** One fetch per file per session; a failed fetch is retried by the next caller. */
function cached<T>(url: string, build: (json: unknown) => T): () => Promise<T> {
  let promise: Promise<T> | null = null;
  return () =>
    (promise ??= fetch(url)
      .then((res) => res.json())
      .then(build)
      .catch((err: unknown) => {
        promise = null;
        throw err;
      }));
}

const loadStops = cached("/data/stops.json", (json) => new Map((json as ClientStop[]).map((s) => [s.id, s])));

/** Stop id → one direction per route whose most common pattern stops there (the first such direction). */
const loadStopDirections = cached("/data/routes.json", (json) => {
  const byStop = new Map<string, StopDirection[]>();
  for (const route of json as ClientRoute[]) {
    for (const dir of route.directions) {
      for (const stopId of dir.stopIds) {
        const list = byStop.get(stopId) ?? [];
        if (list.some((r) => r.routeId === route.id)) continue;
        list.push({ routeId: route.id, directionLabel: dir.label, headsign: dir.headsigns[0] ?? "" });
        byStop.set(stopId, list);
      }
    }
  }
  return byStop;
});

function useLoaded<T>(load: () => Promise<T>, enabled: boolean): T | undefined {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    load().then(
      (v) => active && setValue(() => v),
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [load, enabled]);
  return value;
}

export const useStops = (enabled = true) => useLoaded(loadStops, enabled);
export const useStopDirections = (enabled = true) => useLoaded(loadStopDirections, enabled);
