// The one walk-time formula and the one "can I make it" rule (spec C.17).

import type { LatLon } from "../api/types.ts";
import { haversineM } from "./geo.ts";

export type WalkPace = "normal" | "slower";

/** m/s: about 2.8 mph (normal) and 2 mph (slower). */
const PACE_MPS: Record<WalkPace, number> = { normal: 1.25, slower: 0.9 };
/** Straight-line distance understates real walks by about this much in Houston's grid (same as the server). */
const DETOUR_FACTOR = 1.3;

/** The only way a walk minute is computed for display. */
export function walkMinutes(distanceM: number, pace: WalkPace): number {
  return Math.max(1, Math.round(distanceM / PACE_MPS[pace] / 60));
}

export function estimateWalk(from: LatLon, to: LatLon, pace: WalkPace): { distanceM: number; minutes: number } {
  const distanceM = Math.round(haversineM(from.lat, from.lon, to.lat, to.lon) * DETOUR_FACTOR);
  return { distanceM, minutes: walkMinutes(distanceM, pace) };
}

export type CanMakeIt = "yes" | "tight" | "no";

/** Used by the cards' "Leaves before you get there", Walk's verdict and Live trip's walk step. */
export function canMakeIt(walkMin: number, dep: { departureTime: string }, now: number): CanMakeIt {
  const left = (Date.parse(dep.departureTime) - now) / 60_000;
  if (left < walkMin) return "no";
  if (left < walkMin + 2) return "tight";
  return "yes";
}
