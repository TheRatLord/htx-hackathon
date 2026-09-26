// Live OSRM snaps downtown origins to the closed pedestrian tunnels, so a 2-minute walk comes back
// as 13 minutes (requests.md "OSRM walks through the downtown tunnel network"). Until the server
// rejects those answers, the screens treat a walk far longer than the straight-line estimate as
// unknown and fall back to the estimate, so the card, the Stop sheet and Walk keep one number.

import type { LatLon, NearbyResponse, WalkRoute } from "../../../api/types.ts";
import { estimateWalk } from "../../../lib/walk.ts";

const MAX_FACTOR = 3;
/** Short walks may detour around a block or a freeway without being wrong. */
const MAX_EXTRA_M = 400;

const estimateM = (from: LatLon, to: LatLon) => estimateWalk(from, to, "normal").distanceM;

export function plausibleWalkM(distanceM: number, from: LatLon, to: LatLon): boolean {
  const est = estimateM(from, to);
  return distanceM <= Math.max(MAX_FACTOR * est, est + MAX_EXTRA_M);
}

/** /nearby with implausible OSRM distances replaced by the estimate, nearest first again. */
export function withPlausibleWalks(data: NearbyResponse, from: LatLon): NearbyResponse {
  const bad = (s: NearbyResponse["stops"][number]) => s.walkSource === "osrm" && !plausibleWalkM(s.walkDistanceM, from, s.stop);
  if (!data.stops.some(bad)) return data;
  const stops = data.stops
    .map((s) => (bad(s) ? { ...s, walkDistanceM: estimateM(from, s.stop), walkSource: "estimate" as const } : s))
    .sort((a, b) => a.walkDistanceM - b.walkDistanceM);
  return { ...data, stops };
}

/** An implausible OSRM walk shown the way the server shows a failed one: one straight-line step. */
export function plausibleWalk(walk: WalkRoute, from: LatLon, to: LatLon & { name: string }): WalkRoute {
  if (walk.source !== "osrm" || plausibleWalkM(walk.distanceM, from, to)) return walk;
  const distanceM = estimateM(from, to);
  return {
    ...walk,
    source: "straight-line-estimate",
    distanceM,
    geometry: {
      type: "LineString",
      coordinates: [
        [from.lon, from.lat],
        [to.lon, to.lat],
      ],
    },
    steps: [{ maneuver: "arrive", street: to.name, instruction: `Arrive at ${to.name}`, distanceM, distanceText: "", lat: from.lat, lon: from.lon }],
  };
}
