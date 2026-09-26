import { useNavigate } from "react-router";
import { useArrivals, useStop } from "../../../api/hooks.ts";
import type { LatLon, RouteRef, StopSummary } from "../../../api/types.ts";
import { useWalkDistance, type WalkDistanceSource } from "../../../state/walkDistance.ts";
import { RouteDirectionCard } from "../../../ui/RouteDirectionCard.tsx";
import { Skeleton } from "../../../ui/Skeleton.tsx";
import { walkUrl } from "../walk/walkUrl.ts";
import type { Place } from "./anchor.ts";

export interface StreetCardProps {
  route: RouteRef;
  directionLabel: string;
  headsign: string;
  stopId: string;
  origin: LatLon;
  place?: Place;
  /** The distance to show until a better one is known (/nearby's when the stop is in it). */
  seed: { distanceM: number; source: WalkDistanceSource };
}

function Card({ summary, ...p }: StreetCardProps & { summary: StopSummary }) {
  const navigate = useNavigate();
  // Real time for this stop whatever its rank in /nearby (D3 "Times per card").
  const arrivals = useArrivals(p.stopId, { route: p.route.id, limit: 2 });
  const { distanceM } = useWalkDistance(p.origin, p.stopId, p.seed.distanceM, p.seed.source);
  const headsign = arrivals.data?.arrivals[0]?.headsign ?? p.headsign;
  return (
    <RouteDirectionCard
      route={p.route}
      directionLabel={p.directionLabel}
      headsign={headsign}
      stop={summary}
      walkDistanceM={distanceM}
      deps={arrivals.data?.arrivals ?? []}
      onOpen={() => navigate(`/explore/stop/${encodeURIComponent(p.stopId)}?route=${encodeURIComponent(p.route.id)}`)}
      onWalk={() => navigate(walkUrl(p.stopId, { d: distanceM, route: p.route.id, from: p.place?.param, fromName: p.place?.name }))}
    />
  );
}

/** A stop outside /nearby's list: its side of the street comes from the stop itself. */
function CardWithDetail(p: StreetCardProps) {
  const stop = useStop(p.stopId);
  return stop.data ? <Card {...p} summary={stop.data.stop} /> : <Skeleton variant="stop-card" />;
}

/** D3: the nearest stop of one direction of the route. */
export function StreetCard(p: StreetCardProps & { summary?: StopSummary }) {
  return p.summary ? <Card {...p} summary={p.summary} /> : <CardWithDetail {...p} />;
}
