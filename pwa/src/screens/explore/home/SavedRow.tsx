import { useNavigate } from "react-router";
import { useArrivals, useRoute } from "../../../api/hooks.ts";
import type { Arrival } from "../../../api/types.ts";
import { canonicalRouteId } from "../../../lib/routes.ts";
import { useSaved, type SavedStop } from "../../../state/saved.ts";
import { SavedStopRow } from "../../../ui/SavedStopRow.tsx";
import { Skeleton } from "../../../ui/Skeleton.tsx";
import type { SavedStopRoute } from "../../../ui/types.ts";
import { refOfArrival, refOfRoute } from "../stop/refs.ts";

/** One entry per route and direction, in arrival order. */
function byRoute(arrivals: Arrival[]): SavedStopRoute[] {
  const groups = new Map<string, SavedStopRoute>();
  for (const a of arrivals) {
    const key = `${a.routeId}|${a.directionLabel}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        route: refOfArrival(a),
        directionLabel: a.directionLabel,
        headsign: a.headsign,
        deps: [],
      };
      groups.set(key, g);
    }
    g.deps.push(a);
  }
  return [...groups.values()];
}

interface RowProps {
  stop: SavedStop;
  preferred?: string;
  routes: SavedStopRoute[];
  more: number;
}

function Row({ stop, preferred, routes, more }: RowProps) {
  const navigate = useNavigate();
  return (
    <SavedStopRow
      stopId={stop.id}
      name={stop.name}
      preferredRouteId={preferred}
      routes={routes}
      onOpen={() => navigate(`/explore/stop/${encodeURIComponent(stop.id)}${preferred ? `?route=${encodeURIComponent(preferred)}` : ""}`)}
      moreSaved={more > 0 ? { count: more, onPress: () => navigate("/recent") } : undefined}
    />
  );
}

/** The preferred route has no bus in the window: its direction comes from the route itself. */
function WithIdleRoute({ preferred, ...props }: RowProps & { preferred: string }) {
  const route = useRoute(preferred);
  const dir = route.data?.directions.find((d) => d.stopIds.includes(props.stop.id));
  const idle: SavedStopRoute[] =
    route.data && dir ? [{ route: refOfRoute(route.data), directionLabel: dir.label, headsign: dir.headsigns[0] ?? "", deps: [] }] : [];
  return <Row {...props} preferred={preferred} routes={[...idle, ...props.routes]} />;
}

/**
 * D2 item 5: the first saved stop, preferred route first. It never waits on location. When the
 * preferred route is not among the stop's next 6 departures, its own next times are fetched.
 */
export function SavedRow() {
  const { stops } = useSaved();
  const first = stops[0];
  const stopId = first?.id ?? "";
  const preferred = first?.preferredRouteId ? canonicalRouteId(first.preferredRouteId) : undefined;
  const mixed = useArrivals(stopId, { limit: 6, enabled: Boolean(first) });
  const routes = mixed.data ? byRoute(mixed.data.arrivals) : [];
  const missing = Boolean(preferred && mixed.data && !routes.some((r) => r.route.id === preferred));
  const own = useArrivals(stopId, { route: preferred, limit: 2, enabled: missing });

  if (!first || (mixed.isError && !mixed.data)) return null;
  if (!mixed.data || (missing && !own.data)) return <Skeleton variant="row" />;
  const props = { stop: first, preferred, more: stops.length - 1 };
  if (!missing) return <Row {...props} routes={routes} />;
  const ownRoutes = byRoute(own.data!.arrivals);
  if (!ownRoutes.length) return <WithIdleRoute {...props} preferred={preferred!} routes={routes} />;
  return <Row {...props} routes={[...ownRoutes, ...routes]} />;
}
