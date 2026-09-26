import { useNavigate } from "react-router";
import { useSavedStopRoutes } from "../../../api/savedStop.ts";
import { useSaved } from "../../../state/saved.ts";
import { SavedStopRow } from "../../../ui/SavedStopRow.tsx";
import { Skeleton } from "../../../ui/Skeleton.tsx";

/** D2 item 5: the first saved stop, preferred route first. It never waits on location. */
export function SavedRow() {
  const navigate = useNavigate();
  const { stops } = useSaved();
  const first = stops[0];
  const { routes, preferredRouteId, arrivals } = useSavedStopRoutes(first);

  if (!first || (arrivals.isError && !arrivals.data)) return null;
  if (!routes) return <Skeleton variant="row" />;
  const more = stops.length - 1;
  return (
    <SavedStopRow
      stopId={first.id}
      name={first.name}
      preferredRouteId={preferredRouteId}
      routes={routes}
      onOpen={() => navigate(`/explore/stop/${encodeURIComponent(first.id)}${preferredRouteId ? `?route=${encodeURIComponent(preferredRouteId)}` : ""}`)}
      moreSaved={more > 0 ? { count: more, onPress: () => navigate("/recent") } : undefined}
    />
  );
}
