// Every stop, from the static /data/stops.json (about 1.6 MB, precached by the service worker).
// The map's pins, and screens that need a stop's name or routes without an API call, share it.

import { useEffect, useState } from "react";
import type { ClientStop } from "../api/types.ts";

let promise: Promise<Map<string, ClientStop>> | null = null;

/** Loaded once; a failed load is forgotten, so the next caller tries again. */
export function loadStops(): Promise<Map<string, ClientStop>> {
  promise ??= fetch("/data/stops.json")
    .then((r) => {
      if (!r.ok) throw new Error(`stops.json: ${r.status}`);
      return r.json() as Promise<ClientStop[]>;
    })
    .then((stops) => new Map(stops.map((s) => [s.id, s])))
    .catch((err: unknown) => {
      promise = null;
      throw err;
    });
  return promise;
}

/** Stop id → stop, once loaded (and only fetched while `enabled`). */
export function useStops(enabled = true): Map<string, ClientStop> | undefined {
  const [stops, setStops] = useState<Map<string, ClientStop>>();
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    loadStops().then(
      (m) => active && setStops(m),
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [enabled]);
  return stops;
}

export function useClientStop(id: string | undefined): ClientStop | undefined {
  return useStops(Boolean(id))?.get(id ?? "");
}
