// Street directions for the last walk of a trip (J3.7). useWalk() only targets stops, and a trip
// usually ends at a place, so this asks /api/walk for the leg's own endpoints.

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../api/client.ts";
import type { WalkLeg, WalkRoute } from "../../api/types.ts";
import { formatLatLon } from "../../lib/geo.ts";

/** Below this there is nothing to explain: the place is at the stop. */
const MIN_DIRECTIONS_M = 30;

export function useFinalWalk(leg: WalkLeg | undefined) {
  const from = leg && formatLatLon(leg.from);
  const to = leg && formatLatLon(leg.to);
  return useQuery({
    queryKey: ["finalWalk", from, to],
    queryFn: () => apiGet<WalkRoute>("/walk", { from, to }),
    enabled: Boolean(leg && leg.distanceM >= MIN_DIRECTIONS_M),
    staleTime: 60 * 60_000,
  });
}
