import type { LatLon } from "../../../api/types.ts";
import { estimateWalk, walkMinutes } from "../../../lib/walk.ts";
import { useLocation } from "../../../state/location.tsx";
import { usePrefs } from "../../../state/prefs.ts";
import { useWalkDistance } from "../../../state/walkDistance.ts";

/**
 * The rider's walk to a stop (C.17): the shared best-known distance, seeded with the estimate, so
 * this page, the Stop sheet and Walk show the same minutes. Undefined without a fix.
 */
export function useStopWalk(stop: { id: string } & LatLon): { distanceM: number; minutes: number } | undefined {
  const { fix } = useLocation();
  const { walkPace } = usePrefs();
  const seed = fix ? estimateWalk(fix, stop, walkPace).distanceM : undefined;
  const { distanceM } = useWalkDistance(fix, stop.id, seed);
  return fix && distanceM !== undefined ? { distanceM, minutes: walkMinutes(distanceM, walkPace) } : undefined;
}
