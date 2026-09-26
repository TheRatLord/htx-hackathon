import { useNavigate } from "react-router";
import { useSavedStopRoutes } from "../../../api/savedStop.ts";
import type { LatLon } from "../../../api/types.ts";
import { useLang } from "../../../i18n/index.ts";
import { sideLine } from "../../../lib/format.ts";
import { useClientStop } from "../../../lib/stops.ts";
import { estimateWalk } from "../../../lib/walk.ts";
import { usePrefs } from "../../../state/prefs.ts";
import { useSaved } from "../../../state/saved.ts";
import { useWalkDistance } from "../../../state/walkDistance.ts";
import { SavedStopRow } from "../../../ui/SavedStopRow.tsx";
import { Skeleton } from "../../../ui/Skeleton.tsx";
import { walkUrl } from "../walk/walkUrl.ts";

/** Past this walk (about a mile) the saved stop is a short row: it isn't where the rider is (C.5b compact). */
const FAR_SAVED_M = 1600;

/**
 * D2 item 5: the first saved stop, preferred route first. It never waits on location; once the
 * rider's position is known it gains the nearby card's side line and walk pill.
 */
export function SavedRow({ origin }: { origin?: LatLon }) {
  const navigate = useNavigate();
  const lang = useLang();
  const { walkPace } = usePrefs();
  const { stops } = useSaved();
  const first = stops[0];
  const { routes, preferredRouteId, arrivals } = useSavedStopRoutes(first);
  const client = useClientStop(first?.id);
  const seed = origin && client ? estimateWalk(origin, client, walkPace).distanceM : undefined;
  const { distanceM } = useWalkDistance(origin, first?.id ?? "", seed);

  if (!first || (arrivals.isError && !arrivals.data)) return null;
  if (!routes) return <Skeleton variant="row" />;
  const more = stops.length - 1;
  const side = client ? sideLine(client, { withCompass: false, lang }) : undefined;
  const walkM = origin ? distanceM : undefined;
  return (
    <SavedStopRow
      stopId={first.id}
      name={first.name}
      preferredRouteId={preferredRouteId}
      routes={routes}
      side={side || undefined}
      walkDistanceM={walkM}
      compact={walkM !== undefined && walkM > FAR_SAVED_M}
      onWalk={walkM !== undefined ? () => navigate(walkUrl(first.id, { d: walkM, route: preferredRouteId })) : undefined}
      onOpen={() => navigate(`/explore/stop/${encodeURIComponent(first.id)}${preferredRouteId ? `?route=${encodeURIComponent(preferredRouteId)}` : ""}`)}
      moreSaved={more > 0 ? { count: more, onPress: () => navigate("/recent") } : undefined}
    />
  );
}
