import { useRef } from "react";
import { useNavigate } from "react-router";
import { useRoute } from "../../../api/hooks.ts";
import { useAlerts } from "../../../api/alertsStore.ts";
import type { LatLon, NearbyResponse, RouteDetail, RouteRef, StopSummary, TransitCenterDetail } from "../../../api/types.ts";
import { useT } from "../../../i18n/index.ts";
import { haversineM } from "../../../lib/geo.ts";
import { toRouteRef } from "../../../lib/routes.ts";
import { estimateWalk, walkMinutes } from "../../../lib/walk.ts";
import { useMapScene } from "../../../map/scene.ts";
import { usePrefs } from "../../../state/prefs.ts";
import { AlertStatusLine } from "../../../ui/AlertStatusLine.tsx";
import { Button } from "../../../ui/Button.tsx";
import { RouteDirectionCard } from "../../../ui/RouteDirectionCard.tsx";
import { ScheduleCaption } from "../../../ui/ScheduleCaption.tsx";
import type { Place } from "./anchor.ts";
import { StreetCard } from "./DirectionCard.tsx";
import styles from "./Home.module.css";
import { LoadingCards } from "./NearbyList.tsx";
import { useHalfUpTo } from "./useHalfUpTo.ts";
import { walkUrl } from "../walk/walkUrl.ts";

/** Beyond this the route is "not near you" (D3 Empty). */
const NEAR_MIN = 10;

type RouteStop = RouteDetail["directions"][number]["stops"][number];

/** A route's own stop entry as the summary the cards take; `side` is filled in by the card when needed. */
const asSummary = (s: RouteStop): StopSummary => ({ ...s, routes: [], subtitle: "" });

interface Street {
  dir: RouteDetail["directions"][number];
  stop: RouteStop;
  distanceM: number;
  fromNearby?: NearbyResponse["stops"][number];
}

/** Each direction's nearest stop, closest first (from the route's full stop list, not /nearby's 15). */
function nearestPerDirection(route: RouteDetail, origin: LatLon, nearby: NearbyResponse | undefined, pace: "normal" | "slower"): Street[] {
  return route.directions
    .flatMap((dir): Street[] => {
      const nearest = [...dir.stops].sort((a, b) => haversineM(origin.lat, origin.lon, a.lat, a.lon) - haversineM(origin.lat, origin.lon, b.lat, b.lon))[0];
      if (!nearest) return [];
      const fromNearby = nearby?.stops.find((s) => s.stop.id === nearest.id);
      return [{ dir, stop: nearest, fromNearby, distanceM: fromNearby?.walkDistanceM ?? estimateWalk(origin, nearest, pace).distanceM }];
    })
    .sort((a, b) => a.distanceM - b.distanceM);
}

interface TcBay {
  bay: string;
  stopId: string;
  directionLabel: string;
  headsign: string;
}

function baysFor(tc: TransitCenterDetail, routeId: string): TcBay[] {
  return tc.bays.flatMap((b) => b.routes.filter((r) => r.routeId === routeId).map((r) => ({ bay: b.bay, stopId: b.stopId, directionLabel: r.directionLabel, headsign: r.headsign })));
}

interface RouteNearYouProps {
  routeId: string;
  origin: LatLon;
  place?: Place;
  nearby?: NearbyResponse;
  /** The transit center within 1,000 m, if any. */
  tc?: TransitCenterDetail;
}

/** D3: the nearest stop of each direction of one route, transit-center bays first. */
export function RouteNearYou({ routeId, origin, place, nearby, tc }: RouteNearYouProps) {
  const t = useT();
  const navigate = useNavigate();
  const { walkPace } = usePrefs();
  const alerts = useAlerts();
  const route = useRoute(routeId);
  const secondCard = useRef<HTMLDivElement>(null);
  const data = route.data;
  const ref: RouteRef | undefined = data && toRouteRef({ id: data.id, name: data.displayName, color: data.color, textColor: data.textColor });
  const streets = data ? nearestPerDirection(data, origin, nearby, walkPace) : [];
  const bays = data && tc ? baysFor(tc, data.id) : [];
  const tcStopIds = new Set(tc?.stopIds);
  // A direction whose nearest stop is a platform already shown as a bay card isn't repeated.
  const shownStreets = streets.filter((s) => !(tcStopIds.has(s.stop.id) && bays.some((b) => b.directionLabel === s.dir.label)));
  const tooFar = !bays.length && streets.length > 0 && streets.every((s) => walkMinutes(s.distanceM, walkPace) > NEAR_MIN);

  useMapScene(
    data
      ? {
          legs: data.directions.map((d) => ({ coords: d.shapePoints.map(([lat, lon]) => [lon, lat] as [number, number]), kind: "ride", color: data.color })),
          markers: streets.map((s) => ({ id: s.stop.id, point: s.stop, kind: "board", label: s.stop.id })),
          focus: { kind: "bounds", bounds: boundsOf([origin, ...streets.map((s) => s.stop)]) },
        }
      : { focus: { kind: "point", point: origin } },
    [data, origin.lat, origin.lon, streets.map((s) => s.stop.id).join()],
  );
  useHalfUpTo(() => secondCard.current, (vh) => 0.75 * vh, `${data?.id}|${bays.length}|${shownStreets.length}|${tooFar}`);

  if (route.isError) return <p className={styles.notice}>{t("home.loadError")}</p>;
  if (!data || !ref) return <LoadingCards />;

  const name = data.displayName;
  const cards = [
    ...bays.map((b) => {
      const platform = data.directions.flatMap((d) => d.stops).find((s) => s.id === b.stopId);
      const deps = tc!.bays.find((x) => x.bay === b.bay && x.stopId === b.stopId)!.departures.filter((d) => d.routeId === data.id);
      const walkDistanceM = nearby?.transitCenters.find((c) => c.id === tc!.id)?.walkDistanceM;
      return (
        <RouteDirectionCard
          key={`tc-${b.bay}-${b.directionLabel}`}
          route={ref}
          directionLabel={b.directionLabel}
          headsign={b.headsign}
          stop={platform ? asSummary(platform) : { id: b.stopId, name: tc!.name, lat: tc!.lat, lon: tc!.lon, kind: "transit-center", routes: [], subtitle: "" }}
          walkDistanceM={walkDistanceM}
          deps={deps}
          bay={b.bay}
          tcName={tc!.name}
          onOpen={() => navigate(`/explore/tc/${encodeURIComponent(tc!.id)}?route=${encodeURIComponent(data.id)}`)}
          onWalk={() => navigate(walkUrl(b.stopId, { d: walkDistanceM, route: data.id, from: place?.param, fromName: place?.name }))}
        />
      );
    }),
    ...shownStreets.map((s) => (
      <StreetCard
        key={s.stop.id}
        route={ref}
        directionLabel={s.dir.label}
        headsign={s.dir.headsigns[0] ?? ""}
        stopId={s.stop.id}
        summary={s.fromNearby?.stop}
        origin={origin}
        place={place}
        seed={{ distanceM: s.distanceM, source: s.fromNearby?.walkSource ?? "estimate" }}
      />
    )),
  ];

  return (
    <>
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
      <Button variant="text" label={`${t("home.route.seeAll", { name })} ›`} onPress={() => navigate(`/explore/route/${encodeURIComponent(data.id)}`)} />
      <AlertStatusLine scope="route" name={t("routeName.a11y", { name })} alerts={alerts.forRoute(data.id)} />
      <div className={styles.footer}>
        <ScheduleCaption />
      </div>
    </>
  );
}

function boundsOf(points: LatLon[]): [LatLon, LatLon] {
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  return [
    { lat: Math.min(...lats), lon: Math.min(...lons) },
    { lat: Math.max(...lats), lon: Math.max(...lons) },
  ];
}
