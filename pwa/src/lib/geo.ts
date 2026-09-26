import type { LatLon } from "../api/types.ts";

export { haversineM } from "../../server/lib/geo.ts";

/** Where the map and "Showing Downtown Houston" fall back to without a fix. */
export const DOWNTOWN: LatLon = { lat: 29.7589, lon: -95.3677 };

export const formatLatLon = (p: LatLon) => `${p.lat.toFixed(5)},${p.lon.toFixed(5)}`;

/** Parses "29.7563,-95.3639"; undefined when malformed. */
export function parseLatLon(value: string | null | undefined): LatLon | undefined {
  const m = value?.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!m) return undefined;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : undefined;
}

/** ~11 m precision: enough to share caches between nearby fixes without refetching on GPS jitter. */
export const roundedKey = (p: LatLon) => `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`;
