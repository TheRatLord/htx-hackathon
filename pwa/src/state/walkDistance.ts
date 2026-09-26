// One walk distance per (origin, stop), shared by every screen (spec C.17), so a card,
// the Stop sheet and Walk always show the same minutes.

import { useEffect, useSyncExternalStore } from "react";
import type { LatLon } from "../api/types.ts";
import { roundedKey } from "../lib/geo.ts";

export type WalkDistanceSource = "osrm" | "estimate";

interface Entry {
  distanceM: number;
  source: WalkDistanceSource;
}

/** An OSRM answer replaces a shown estimate only when it differs by more than this. */
const REFINE_THRESHOLD = 0.1;

const cache = new Map<string, Entry>();
const listeners = new Set<() => void>();
const keyOf = (from: LatLon, stopId: string) => `${roundedKey(from)}|${stopId}`;

/** Records a distance; returns the entry now in effect. */
export function recordWalkDistance(from: LatLon, stopId: string, distanceM: number, source: WalkDistanceSource): Entry {
  const key = keyOf(from, stopId);
  const prev = cache.get(key);
  const replace =
    !prev ||
    (source === "osrm" && prev.source === "estimate" && Math.abs(distanceM - prev.distanceM) / prev.distanceM > REFINE_THRESHOLD);
  if (!replace) return prev;
  const entry = { distanceM, source };
  cache.set(key, entry);
  listeners.forEach((l) => l());
  return entry;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/**
 * The best-known distance. `seedM` (a card's /nearby distance, or Walk's `?d=`) is recorded as the
 * first value for this origin and stop, so screens opened from the card start from the same number.
 */
export function useWalkDistance(
  from: LatLon | undefined,
  stopId: string,
  seedM?: number,
  seedSource: WalkDistanceSource = "estimate",
): { distanceM?: number; source: WalkDistanceSource } {
  const key = from ? keyOf(from, stopId) : "";
  const entry = useSyncExternalStore(subscribe, () => cache.get(key));
  useEffect(() => {
    if (from && seedM !== undefined) recordWalkDistance(from, stopId, seedM, seedSource);
  }, [from, stopId, seedM, seedSource]);
  return entry ?? { distanceM: seedM, source: seedSource };
}
