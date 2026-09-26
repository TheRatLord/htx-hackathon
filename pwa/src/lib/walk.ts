// The one walk-time formula and the one "can I make it" rule (spec C.17).

import { WALK_DETOUR_FACTOR, WALK_SPEED_MPS } from "../../shared/walk.ts";
import type { LatLon } from "../api/types.ts";
import { haversineM } from "./geo.ts";

export type WalkPace = keyof typeof WALK_SPEED_MPS;

/** The only way a walk minute is computed for display. */
export function walkMinutes(distanceM: number, pace: WalkPace): number {
  return Math.max(1, Math.round(distanceM / WALK_SPEED_MPS[pace] / 60));
}

export function estimateWalk(from: LatLon, to: LatLon, pace: WalkPace): { distanceM: number; minutes: number } {
  const distanceM = Math.round(haversineM(from.lat, from.lon, to.lat, to.lon) * WALK_DETOUR_FACTOR);
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

/** Beyond this, a walk shows its distance instead of minutes (walk buttons, search rows, TC Walk). */
export const MAX_WALK_MINUTES = 20;
