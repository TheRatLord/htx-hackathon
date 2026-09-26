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

/** How long useStops waits before trying a failed stops.json load again. */
const RETRY_MS = 15_000;

/** Stop id → stop, once loaded (and only fetched while `enabled`). */
export function useStops(enabled = true): Map<string, ClientStop> | undefined {
  const [stops, setStops] = useState<Map<string, ClientStop>>();
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // A failed load is tried again when the phone comes back online, or after a pause: once the
    // screen had no side lines or walk seeds until it was left and reopened.
    const load = () => {
      clearTimeout(timer);
      loadStops().then(
        (m) => {
          if (!active) return;
          setStops(m);
          window.removeEventListener("online", load);
        },
        () => {
          if (active) timer = setTimeout(load, RETRY_MS);
        },
      );
    };
    window.addEventListener("online", load);
    load();
    return () => {
      active = false;
      clearTimeout(timer);
      window.removeEventListener("online", load);
    };
  }, [enabled]);
  return stops;
}

export function useClientStop(id: string | undefined): ClientStop | undefined {
  return useStops(Boolean(id))?.get(id ?? "");
}
