import { useRef } from "react";
import { useNavigate } from "react-router";
import { useArrivals, useRoute, useStableAnchor } from "../../../api/hooks.ts";
import { useAlerts } from "../../../api/alertsStore.ts";
import type { LatLon, NearbyResponse, StopSummary, TransitCenterDetail } from "../../../api/types.ts";
import { useT } from "../../../i18n/index.ts";
import { upcoming } from "../../../lib/format.ts";
import { boundsOf } from "../../../lib/geo.ts";
import { walkMinutes } from "../../../lib/walk.ts";
import { useMapScene, type MapScene } from "../../../map/scene.ts";
import { useNow } from "../../../state/clock.ts";
import { usePrefs } from "../../../state/prefs.ts";
import { AlertStatusLine } from "../../../ui/AlertStatusLine.tsx";
import { Button } from "../../../ui/Button.tsx";
import { ErrorState } from "../../../ui/ErrorState.tsx";
import { RouteDirectionCard } from "../../../ui/RouteDirectionCard.tsx";
import { ScheduleCaption } from "../../../ui/ScheduleCaption.tsx";
import { refOfRoute } from "../stop/refs.ts";
import { walkUrl } from "../walk/walkUrl.ts";
import type { Place } from "./anchor.ts";
import { StreetCard } from "./DirectionCard.tsx";
import { routeCap } from "./fold.ts";
import styles from "./Home.module.css";
import { LoadingCards } from "./NearbyList.tsx";
import { baysFor, nearestPerDirection, rankByCatch, shortTc, type RouteStop } from "./routeNear.ts";
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
  // The map is framed from a steady point: GPS jitter moves only the user dot, never the camera,
  // so the rider can pan (the raw fix re-fitted the bounds about once a second).
  const framed = useStableAnchor(origin);
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
  const bayDeps = bays.map((b) => tc?.bays.find((x) => x.bay === b.bay && x.stopId === b.stopId)?.departures.filter((d) => d.routeId === routeId) ?? []);
  const cardDeps = [...bayDeps, ...streetArrivals.slice(0, shownStreets.length)];
  const lateNight = !tooFar && cardDeps.length > 0 && cardDeps.every((d) => d && !upcoming(d, now).length);

  const shape = data?.directions.flatMap((d) => d.shapePoints.map(([lat, lon]) => ({ lat, lon }))) ?? [];
  // The rider and every card's stop (bays included), so the stop on screen is never cropped.
  const bayStops = bays.flatMap((b) => {
    const s = data?.directions.flatMap((d) => d.stops).find((x) => x.id === b.stopId);
    return s ? [s] : [];
  });
  const bounds = boundsOf(framed ? [framed, ...bayStops, ...shownStreets.map((s) => s.stop)] : shape);
  const scene: MapScene = data
    ? {
        legs: data.directions.map((d) => ({ coords: d.shapePoints.map(([lat, lon]) => [lon, lat] as [number, number]), kind: "ride", color: data.color })),
        // Every card's stop is marked: the street stops with their ID, and each bay with its TC and bay
        // (06: the TC is otherwise an unlabelled tile, as a scene with legs hides TC names).
        markers: [
          ...bays.flatMap((b) => {
            const s = bayStops.find((x) => x.id === b.stopId);
            return s ? [{ id: `bay-${b.bay}-${s.id}`, point: s, kind: "bay" as const, label: `${shortTc(tc?.name ?? "")} · ${t("stopLine.bay", { bay: b.bay })}` }] : [];
          }),
          ...streets.map((s) => ({ id: s.stop.id, point: s.stop, kind: "board" as const, label: s.stop.id })),
        ],
        tagStopIds: shownStreets.map((s) => s.stop.id),
        ...(bounds && { focus: { kind: "bounds", bounds } }),
      }
    : origin
      ? { focus: { kind: "point", point: origin } }
      : {};
  useMapScene(scene, [data, framed?.lat, framed?.lon, streets.map((s) => s.stop.id).join(), bayStops.map((s) => s.id).join(), bays.map((b) => b.bay).join(), t]);
  useHalfUpTo(() => secondCard.current, routeCap, `${data?.id}|${bays.length}|${shownStreets.length}|${tooFar}|${lateNight}`);

  if (route.isError) return <ErrorState error={route.error} context={{ id: routeId }} onRetry={() => void route.refetch()} />;
  if (!data) return <LoadingCards />;

  const name = data.displayName;
  const ref = refOfRoute(data);
  const tcWalkM = tc && nearby?.transitCenters.find((c) => c.id === tc.id)?.walkDistanceM;
  const tcName = tc?.name ?? "";
  const routeAlerts = alerts.forRoute(data.id);
  // Only route-wide alerts, or ones at these cards' stops, go first; one about a stop elsewhere on the route stays in the line at the end.
  const cardStops = new Set([...bays.map((b) => b.stopId), ...shownStreets.map((s) => s.stop.id)]);
  const nearAlerts = routeAlerts.filter((a) => !a.stopIds.length || a.stopIds.some((id) => cardStops.has(id)));
  const alertName = t("routeName.a11y", { name });
  const candidates = [
    ...bays.map((b, i) => {
      const platform = data.directions.flatMap((d) => d.stops).find((s) => s.id === b.stopId);
      const item = (
        <RouteDirectionCard
          key={`tc-${b.bay}-${b.directionLabel}`}
          route={ref}
          directionLabel={b.directionLabel}
          headsign={b.headsign}
          stop={platform ? asSummary(platform) : { id: b.stopId, name: tcName, lat: tc?.lat ?? 0, lon: tc?.lon ?? 0, kind: "transit-center", routes: [], subtitle: "" }}
          walkDistanceM={tcWalkM}
          deps={bayDeps[i]}
          noServiceText={t("card.noBuses90m")}
          bay={b.bay}
          tcName={tcName}
          onOpen={() => navigate(`/explore/tc/${encodeURIComponent(tc?.id ?? "")}?route=${encodeURIComponent(data.id)}`)}
          onWalk={() => navigate(walkUrl(b.stopId, { d: tcWalkM, route: data.id, from: place?.param, fromName: place?.name }))}
        />
      );
      return { item, deps: bayDeps[i], walkMin: tcWalkM !== undefined ? walkMinutes(tcWalkM, walkPace) : 0, pinned: true };
    }),
    ...shownStreets.map((s, i) => ({
      item: (
        <StreetCard
          key={s.stop.id}
          route={ref}
          directionLabel={s.dir.label}
          headsign={s.dir.headsigns[0] ?? ""}
          stopId={s.stop.id}
          summary={s.fromNearby?.stop}
          origin={origin ?? s.stop}
          place={place}
          seed={{ distanceM: s.distanceM, source: s.fromNearby?.walkSource ?? "estimate" }}
          arrivals={streetArrivals[i]}
        />
      ),
      deps: streetArrivals[i],
      walkMin: walkMinutes(s.distanceM, walkPace),
    })),
  ];
  // The earliest bus the rider can catch goes first (06); the transit center stays in the first two (F7).
  const cards = rankByCatch(candidates, now);

  return (
    <>
      {/* An alert goes right under the title, where the rider reads first (it used to be a FAB on the map). */}
      {nearAlerts.length > 0 && <AlertStatusLine scope="route" name={alertName} alerts={nearAlerts} />}
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
      {nearAlerts.length === 0 && <AlertStatusLine scope="route" name={alertName} alerts={routeAlerts} />}
      <div className={styles.footer}>
        <ScheduleCaption />
      </div>
    </>
  );
}
