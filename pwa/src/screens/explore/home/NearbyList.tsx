import { Fragment, type ReactNode, type RefObject } from "react";
import { useNavigate } from "react-router";
import { useNearby } from "../../../api/hooks.ts";
import type { LatLon, NearbyResponse, NearbyStop, TransitCenterDetail } from "../../../api/types.ts";
import type { Lang } from "../../../i18n/index.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { directionWord, upcoming } from "../../../lib/format.ts";
import { errorText } from "../../../lib/i18nServer.ts";
import { walkMinutes } from "../../../lib/walk.ts";
import { useNow } from "../../../state/clock.ts";
import { usePrefs } from "../../../state/prefs.ts";
import { Button } from "../../../ui/Button.tsx";
import { EmptyState } from "../../../ui/EmptyState.tsx";
import { Skeleton } from "../../../ui/Skeleton.tsx";
import type { Place } from "./anchor.ts";
import styles from "./Home.module.css";
import { NearbyCard } from "./NearbyCard.tsx";
import { NearbyTcCard } from "./NearbyTcCard.tsx";

const MAX_CARDS = 8;
const FAR_RADIUS_M = 2000;
const FAR_CARDS = 3;
/** A transit center further than this walk is not "nearby" for most riders: it goes last, under "Farther away". */
const NEAR_TC_MIN = 10;

/**
 * Two cards with the same stop name (the two sides of Main St @ Remington Ln) get the direction
 * their buses go on the title line, when all of a card's routes go one way.
 */
function directionSuffixes(stops: NearbyStop[], lang: Lang): Map<string, string> {
  const count = new Map<string, number>();
  for (const s of stops) count.set(s.stop.name, (count.get(s.stop.name) ?? 0) + 1);
  const out = new Map<string, string>();
  for (const s of stops) {
    if ((count.get(s.stop.name) ?? 0) < 2) continue;
    const labels = new Set(s.routes.map((r) => r.directionLabel).filter(Boolean));
    if (labels.size === 1) out.set(s.stop.id, directionWord([...labels][0], lang));
  }
  return out;
}

interface CardsProps {
  data: NearbyResponse;
  origin: LatLon;
  place?: Place;
  tcDetail?: TransitCenterDetail;
  max: number;
  firstRow?: RefObject<HTMLLIElement | null>;
  /** Rendered right after card #1 (the route chips, when the sheet is too short for them above it). */
  afterFirst?: ReactNode;
}

function Cards({ data, origin, place, tcDetail, max, firstRow, afterFirst }: CardsProps) {
  const t = useT();
  const lang = useLang();
  const suffixes = directionSuffixes(data.stops.slice(0, max), lang);
  const { walkPace } = usePrefs();
  const tc = data.transitCenters[0];
  const tcCard = tc && <NearbyTcCard tc={tc} detail={tcDetail?.id === tc.id ? tcDetail : undefined} origin={origin} place={place} />;
  const tcFar = tc && walkMinutes(tc.walkDistanceM, walkPace) > NEAR_TC_MIN;
  return (
    <>
      {data.stops.slice(0, max).map((item, i) => (
        <Fragment key={item.stop.id}>
          <NearbyCard item={item} origin={origin} place={place} firstRowRef={i === 0 ? firstRow : undefined} titleSuffix={suffixes.get(item.stop.id)} />
          {i === 0 && afterFirst}
          {i === 0 && !tcFar && tcCard}
        </Fragment>
      ))}
      {tcFar && (
        <>
          <h2 className={styles.subhead}>{t("home.fartherAway")}</h2>
          {tcCard}
        </>
      )}
    </>
  );
}

/** No stop within 500 m: the nearest 3 within 2 km, labelled with their walk times. */
function FarStops({ origin, place }: { origin: LatLon; place?: Place }) {
  const t = useT();
  const navigate = useNavigate();
  const far = useNearby(origin, { radius: FAR_RADIUS_M, precise: true });
  const data = far.data;
  return (
    <>
      <p className={styles.notice}>{t("home.noneWithin")}</p>
      {data?.stops.length ? <p className={styles.info}>{t("home.nearestFar")}</p> : null}
      {far.isPending && <Skeleton variant="stop-card" />}
      {data && <Cards data={data} origin={origin} place={place} max={FAR_CARDS} />}
      <Button variant="tonal" icon="route_plan" label={t("home.planTrip")} onPress={() => navigate("/explore/plan")} />
    </>
  );
}

interface NearbyListProps {
  nearby: ReturnType<typeof useNearby>;
  data?: NearbyResponse;
  origin: LatLon;
  place?: Place;
  tcDetail?: TransitCenterDetail;
  /** Wraps the first card: its first route row is the fold target (M2, M3). */
  firstRow: RefObject<HTMLLIElement | null>;
  afterFirst?: ReactNode;
}

/** D2 items 6–7 and their states: loading, error, nothing within 500 m, late night. */
export function NearbyList({ nearby, data, origin, place, tcDetail, firstRow, afterFirst }: NearbyListProps) {
  const t = useT();
  const lang = useLang();
  const now = useNow();

  if (!data) {
    if (nearby.isError)
      return (
        <EmptyState
          icon="error"
          title={t("home.loadError")}
          body={errorText(nearby.error, undefined, lang)}
          action={{ label: t("common.tryAgain"), onPress: () => void nearby.refetch(), variant: "primary" }}
        />
      );
    return <LoadingCards />;
  }
  if (!data.stops.length) return <FarStops origin={origin} place={place} />;

  const shown = data.stops.slice(0, MAX_CARDS);
  const quiet = shown.every((s) => s.routes.every((r) => !upcoming(r.departures, now).length));
  return (
    <>
      {quiet && <p className={styles.info}>{t("home.lateNight")}</p>}
      <Cards data={data} origin={origin} place={place} tcDetail={tcDetail} max={MAX_CARDS} firstRow={firstRow} afterFirst={afterFirst} />
    </>
  );
}

export function LoadingCards() {
  return (
    <>
      <Skeleton variant="stop-card" />
      <Skeleton variant="stop-card" />
      <Skeleton variant="stop-card" />
    </>
  );
}
