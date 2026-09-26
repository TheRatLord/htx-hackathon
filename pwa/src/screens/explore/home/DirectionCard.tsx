import { useNavigate } from "react-router";
import { useStop } from "../../../api/hooks.ts";
import type { Arrival, LatLon, RouteRef, StopSummary } from "../../../api/types.ts";
import { useT } from "../../../i18n/index.ts";
import { upcoming } from "../../../lib/format.ts";
import { useNow } from "../../../state/clock.ts";
import { useWalkDistance, type WalkDistanceSource } from "../../../state/walkDistance.ts";
import { RouteDirectionCard } from "../../../ui/RouteDirectionCard.tsx";
import { Skeleton } from "../../../ui/Skeleton.tsx";
import type { RouteDirectionCardProps } from "../../../ui/types.ts";
import { walkUrl } from "../walk/walkUrl.ts";
import type { Place } from "./anchor.ts";
import styles from "./Home.module.css";

/**
 * C.5c, plus "No buses in the next 2 hours" once the times have loaded and none is upcoming (the
 * shared card has no such line yet: requests.md).
 */
export function DirectionCard({ loaded, ...card }: RouteDirectionCardProps & { loaded: boolean }) {
  const t = useT();
  const now = useNow();
  if (!loaded || upcoming(card.deps, now).length) return <RouteDirectionCard {...card} />;
  return (
    <div className={styles.quietCard}>
      <RouteDirectionCard {...card} />
      <p className={styles.quietLine}>{t("card.noBuses2h")}</p>
    </div>
  );
}

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
  const navigate = useNavigate();
  const { distanceM } = useWalkDistance(p.origin, p.stopId, p.seed.distanceM, p.seed.source);
  return (
    <DirectionCard
      route={p.route}
      directionLabel={p.directionLabel}
      headsign={p.arrivals?.[0]?.headsign ?? p.headsign}
      stop={summary}
      walkDistanceM={distanceM}
      deps={p.arrivals ?? []}
      loaded={p.arrivals !== undefined}
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
