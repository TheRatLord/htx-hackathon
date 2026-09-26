// Street directions for the last walk of a trip (J3.7). useWalk() only targets stops, and a trip
// usually ends at a place, so this asks /api/walk for the leg's own endpoints until useWalk takes a
// place (requests.md "useWalk: accept a place as the destination"). A "lat,lon" never clashes with a
// stop id in the shared walk key.

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../api/client.ts";
import { keys } from "../../api/keys.ts";
import type { WalkLeg, WalkRoute } from "../../api/types.ts";
import { formatLatLon } from "../../lib/geo.ts";

/** Below this there is nothing to explain: the place is at the stop. */
const MIN_DIRECTIONS_M = 30;

export function useFinalWalk(leg: WalkLeg) {
  const from = formatLatLon(leg.from);
  const to = formatLatLon(leg.to);
  return useQuery({
    queryKey: keys.walk(from, to),
    queryFn: () => apiGet<WalkRoute>("/walk", { from, to }),
    enabled: leg.distanceM >= MIN_DIRECTIONS_M,
    staleTime: 60 * 60_000,
  });
}
