import { useNavigate } from "react-router";
import { useStop } from "../../../api/hooks.ts";
import type { Arrival, LatLon, RouteRef, StopSummary } from "../../../api/types.ts";
import { useT } from "../../../i18n/index.ts";
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
  /** This stop's next departures of the route; undefined while loading. */
  arrivals?: Arrival[];
}

function Card({ summary, ...p }: StreetCardProps & { summary: StopSummary }) {
  const t = useT();
  const navigate = useNavigate();
  const { distanceM } = useWalkDistance(p.origin, p.stopId, p.seed.distanceM, p.seed.source);
  return (
    <RouteDirectionCard
      route={p.route}
      directionLabel={p.directionLabel}
      headsign={p.arrivals?.[0]?.headsign ?? p.headsign}
      stop={summary}
      walkDistanceM={distanceM}
      deps={p.arrivals ?? []}
      noServiceText={p.arrivals && t("card.noBuses2h")}
      onOpen={() => navigate(`/explore/stop/${encodeURIComponent(p.stopId)}?route=${encodeURIComponent(p.route.id)}`)}
      onWalk={() => navigate(walkUrl(p.stopId, { d: distanceM, route: p.route.id, from: p.place?.param, fromName: p.place?.name }))}
    />
  );
}

/** D3: the nearest stop of one direction of the route. A stop outside /nearby's list gets its side of the street from the stop itself. */
export function StreetCard({ summary, ...p }: StreetCardProps & { summary?: StopSummary }) {
  const stop = useStop(p.stopId, { enabled: !summary });
  const known = summary ?? stop.data?.stop;
  return known ? <Card {...p} summary={known} /> : <Skeleton variant="stop-card" />;
}
