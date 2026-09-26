import { useRef } from "react";
import { useNavigate } from "react-router";
import { useArrivals, useRoute } from "../../../api/hooks.ts";
import { useAlerts } from "../../../api/alertsStore.ts";
import type { LatLon, NearbyResponse, StopSummary, TransitCenterDetail } from "../../../api/types.ts";
import { useT } from "../../../i18n/index.ts";
import { upcoming } from "../../../lib/format.ts";
import { walkMinutes } from "../../../lib/walk.ts";
import { useMapScene, type MapScene } from "../../../map/scene.ts";
import { useNow } from "../../../state/clock.ts";
import { usePrefs } from "../../../state/prefs.ts";
import { AlertStatusLine } from "../../../ui/AlertStatusLine.tsx";
import { Button } from "../../../ui/Button.tsx";
import { ErrorState } from "../../../ui/ErrorState.tsx";
import { ScheduleCaption } from "../../../ui/ScheduleCaption.tsx";
import { refOfRoute } from "../stop/refs.ts";
import { walkUrl } from "../walk/walkUrl.ts";
import type { Place } from "./anchor.ts";
import { DirectionCard, StreetCard } from "./DirectionCard.tsx";
import { routeCap } from "./fold.ts";
import styles from "./Home.module.css";
import { LoadingCards } from "./NearbyList.tsx";
import { baysFor, boundsOf, nearestPerDirection, type RouteStop } from "./routeNear.ts";
import { useHalfUpTo } from "./useHalfUpTo.ts";

/** Beyond this the route is "not near you" (D3 Empty). */
const NEAR_MIN = 10;

/** A route's own stop entry as the summary the cards take; `side` is filled in by the card when needed. */
const asSummary = (s: RouteStop): StopSummary => ({ ...s, routes: [], subtitle: "" });

interface RouteNearYouProps {
  routeId: string;
  /** The rider or D4's place; without one (location off) the screen still offers the route and its alerts. */
  origin?: LatLon;
  finding: boolean;
  place?: Place;
  nearby?: NearbyResponse;
  /** The transit center within 1,000 m, if any. */
  tc?: TransitCenterDetail;
}

/** D3: the nearest stop of each direction of one route, transit-center bays first. */
export function RouteNearYou({ routeId, origin, finding, place, nearby, tc }: RouteNearYouProps) {
  const t = useT();
  const now = useNow();
  const navigate = useNavigate();
  const { walkPace } = usePrefs();
  const alerts = useAlerts();
  const route = useRoute(routeId);
  const secondCard = useRef<HTMLDivElement>(null);
  const data = route.data;
  const streets = data && origin ? nearestPerDirection(data, origin, nearby, walkPace) : [];
  const bays = data && tc ? baysFor(tc, data.id) : [];
  const tcStopIds = new Set(tc?.stopIds);
  // A direction whose nearest stop is a platform already shown as a bay card isn't repeated.
  const shownStreets = streets.filter((s) => !(tcStopIds.has(s.stop.id) && bays.some((b) => b.directionLabel === s.dir.label)));
  const tooFar = !bays.length && streets.length > 0 && streets.every((s) => walkMinutes(s.distanceM, walkPace) > NEAR_MIN);

  // A route has at most two directions, so the street cards' times are two fixed calls (D3 "Times per card").
  const [s0, s1] = shownStreets;
  const a0 = useArrivals(s0?.stop.id ?? "", { route: routeId, limit: 2, enabled: Boolean(s0) });
  const a1 = useArrivals(s1?.stop.id ?? "", { route: routeId, limit: 2, enabled: Boolean(s1) });
  const streetArrivals = [a0.data?.arrivals, a1.data?.arrivals];
  const bayDeps = bays.map((b) => tc!.bays.find((x) => x.bay === b.bay && x.stopId === b.stopId)!.departures.filter((d) => d.routeId === routeId));
  const cardDeps = [...bayDeps, ...streetArrivals.slice(0, shownStreets.length)];
  const lateNight = !tooFar && cardDeps.length > 0 && cardDeps.every((d) => d && !upcoming(d, now).length);

  const shape = data?.directions.flatMap((d) => d.shapePoints.map(([lat, lon]) => ({ lat, lon }))) ?? [];
  const scene: MapScene = data
    ? {
        legs: data.directions.map((d) => ({ coords: d.shapePoints.map(([lat, lon]) => [lon, lat] as [number, number]), kind: "ride", color: data.color })),
        markers: streets.map((s) => ({ id: s.stop.id, point: s.stop, kind: "board", label: s.stop.id })),
        focus: { kind: "bounds", bounds: boundsOf(origin ? [origin, ...streets.map((s) => s.stop)] : shape) },
      }
    : origin
      ? { focus: { kind: "point", point: origin } }
      : {};
  useMapScene(scene, [data, origin?.lat, origin?.lon, streets.map((s) => s.stop.id).join()]);
  useHalfUpTo(() => secondCard.current, routeCap, `${data?.id}|${bays.length}|${shownStreets.length}|${tooFar}|${lateNight}`);

  if (route.isError) return <ErrorState error={route.error} context={{ id: routeId }} onRetry={() => void route.refetch()} />;
  if (!data) return <LoadingCards />;

  const name = data.displayName;
  const ref = refOfRoute(data);
  const tcWalkM = tc && nearby?.transitCenters.find((c) => c.id === tc.id)?.walkDistanceM;
  const cards = [
    ...bays.map((b, i) => {
      const platform = data.directions.flatMap((d) => d.stops).find((s) => s.id === b.stopId);
      return (
        <DirectionCard
          key={`tc-${b.bay}-${b.directionLabel}`}
          route={ref}
          directionLabel={b.directionLabel}
          headsign={b.headsign}
          stop={platform ? asSummary(platform) : { id: b.stopId, name: tc!.name, lat: tc!.lat, lon: tc!.lon, kind: "transit-center", routes: [], subtitle: "" }}
          walkDistanceM={tcWalkM}
          deps={bayDeps[i]}
          loaded
          bay={b.bay}
          tcName={tc!.name}
          onOpen={() => navigate(`/explore/tc/${encodeURIComponent(tc!.id)}?route=${encodeURIComponent(data.id)}`)}
          onWalk={() => navigate(walkUrl(b.stopId, { d: tcWalkM, route: data.id, from: place?.param, fromName: place?.name }))}
        />
      );
    }),
    ...shownStreets.map((s, i) => (
      <StreetCard
        key={s.stop.id}
        route={ref}
        directionLabel={s.dir.label}
        headsign={s.dir.headsigns[0] ?? ""}
        stopId={s.stop.id}
        summary={s.fromNearby?.stop}
        origin={origin!}
        place={place}
        seed={{ distanceM: s.distanceM, source: s.fromNearby?.walkSource ?? "estimate" }}
        arrivals={streetArrivals[i]}
      />
    )),
  ];

  return (
    <>
      {lateNight && <p className={styles.info}>{t("home.lateNight")}</p>}
      {tooFar ? (
        <p className={styles.notice}>
          {t("home.route.notClose", {
            name,
            stop: t("stopLine.title", { name: streets[0].stop.name, id: streets[0].stop.id }),
            min: walkMinutes(streets[0].distanceM, walkPace),
          })}
        </p>
      ) : (
        cards.map((card, i) => (
          <div key={card.key} ref={i === Math.min(1, cards.length - 1) ? secondCard : undefined}>
            {card}
          </div>
        ))
      )}
      {finding && <LoadingCards />}
      <Button variant="text" label={t("home.route.seeAll", { name })} onPress={() => navigate(`/explore/route/${encodeURIComponent(data.id)}`)} />
      <AlertStatusLine scope="route" name={t("routeName.a11y", { name })} alerts={alerts.forRoute(data.id)} />
      <div className={styles.footer}>
        <ScheduleCaption />
      </div>
    </>
  );
}
