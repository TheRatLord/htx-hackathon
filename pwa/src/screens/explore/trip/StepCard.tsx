// One Live trip step (spec D13): Walk, Wait, Ride, Final walk or Arrived. The headline is the
// only polite live region besides the get-off warnings, so a step change is announced once.

import { useArrivals } from "../../../api/hooks.ts";
import type { Dep, LatLon, TransitLeg, WalkLeg } from "../../../api/types.ts";
import type { RideStop } from "../../../features/trip/progress.ts";
import type { TripStep } from "../../../features/trip/steps.ts";
import { stopTitle } from "../../../features/trip/timeline.ts";
import { useFinalWalk } from "../../../features/trip/useFinalWalk.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { formatClock, sideLine } from "../../../lib/format.ts";
import { formatLatLon, haversineM } from "../../../lib/geo.ts";
import { walkStepText } from "../../../lib/i18nServer.ts";
import { toRouteRef } from "../../../lib/routes.ts";
import { canMakeIt, estimateWalk, walkMinutes } from "../../../lib/walk.ts";
import { useNow } from "../../../state/clock.ts";
import { usePrefs } from "../../../state/prefs.ts";
import { BayTag } from "../../../ui/BayTag.tsx";
import { Button } from "../../../ui/Button.tsx";
import { LiveStrip } from "../../../ui/LiveStrip.tsx";
import { RouteBadge } from "../../../ui/RouteBadge.tsx";
import styles from "./trip.module.css";

/** A fix this close to the walk's start still counts as "at the start": show the planned walk. */
const MOVED_M = 50;
const ARRIVALS_LIMIT = 4;

/** The bus the rider is catching: its live prediction when the stop reports this trip, else the plan's time. */
function useBoardDeparture(ride: TransitLeg): { dep: Dep; deps: Dep[]; loading: boolean } {
  const arrivals = useArrivals(ride.board.id ?? "", { route: ride.route.id, limit: ARRIVALS_LIMIT, enabled: Boolean(ride.board.id) });
  const deps = arrivals.data?.arrivals ?? [];
  const live = ride.tripId ? deps.find((d) => d.tripId === ride.tripId) : undefined;
  const dep: Dep = live ?? { departureTime: ride.departureTime, isRealtime: false, canceled: false, source: "schedule", tripId: ride.tripId ?? "" };
  return { dep, deps, loading: arrivals.isLoading };
}

function WalkCard({ leg, ride, fix, onDirections }: { leg: WalkLeg; ride: TransitLeg; fix?: LatLon; onDirections: () => void }) {
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const { walkPace } = usePrefs();
  const { dep } = useBoardDeparture(ride);
  const moved = fix && haversineM(fix.lat, fix.lon, leg.from.lat, leg.from.lon) > MOVED_M;
  const min = moved ? estimateWalk(fix, ride.board, walkPace).minutes : walkMinutes(leg.distanceM, walkPace);
  const verdict = canMakeIt(min, dep, now);
  const side = sideLine({ ...ride.board, kind: toRouteRef(ride.route).mode }, { withCompass: false, lang });
  return (
    <>
      <p className={styles.headline} aria-live="polite">
        {t("trip.walk.head", { min, stop: stopTitle(ride.board) })}
      </p>
      {side && <p className={styles.variant}>{side}</p>}
      <p>
        {t("trip.walk.next", { route: ride.route.name, time: formatClock(dep.departureTime, lang) })} ·{" "}
        <span className={verdict === "yes" ? styles.ok : styles.alert}>{t(`canMakeIt.${verdict}`)}</span>
      </p>
      <Button variant="tonal" icon="directions_walk" label={`${t("trip.walk.directions")} ›`} onPress={onDirections} />
    </>
  );
}

function WaitCard({ ride }: { ride: TransitLeg }) {
  const t = useT();
  const lang = useLang();
  const { deps, loading } = useBoardDeparture(ride);
  const route = toRouteRef(ride.route);
  const side = ride.board.side ? sideLine({ ...ride.board, kind: route.mode }, { withCompass: true, lang }) : "";
  return (
    <>
      <p className={styles.headline} aria-live="polite">
        {t("trip.wait.head", { id: ride.board.id ?? "" })}
      </p>
      {side && <p className={styles.variant}>{side}</p>}
      {ride.board.bay && <BayTag bay={ride.board.bay} />}
      <div className={styles.bleed}>
        <LiveStrip deps={deps} loading={loading} />
      </div>
      <p className={styles.board}>
        {t(route.mode === "rail" ? "trip.wait.boardTrain" : "trip.wait.boardBus")} <strong>{ride.headsign.toUpperCase()}</strong>
      </p>
    </>
  );
}

interface RideProps {
  ride: TransitLeg;
  stops: RideStop[];
  index: number;
  basis: string;
}

function RideCard({ ride, stops, index, basis }: RideProps) {
  const t = useT();
  const now = useNow();
  const route = toRouteRef(ride.route);
  const last = stops.length - 1;
  const left = Math.max(0, last - index);
  const about = Math.max(1, Math.round((stops[last].time - Math.max(now, stops[index].time)) / 60_000));
  const next = stops[Math.min(index + 1, last)];
  return (
    <>
      <p className={styles.headline} aria-live="polite">
        <span className={styles.rideHead}>
          {t("trip.ride.ride")} <RouteBadge route={route} size="sm" /> {t("headsign.to")} {ride.headsign.toUpperCase()}
        </span>
      </p>
      <p className={styles.getOff}>{t("trip.ride.getOff", { stop: stopTitle(ride.alight) })}</p>
      <GetOffWarning left={left} alight={ride.alight.id ? stopTitle(ride.alight) : ride.alight.name} />
      <div className={`${styles.bleed} ${styles.strip}`}>
        <span className={styles.stripDigits}>{left}</span>
        <span>
          {t("trip.ride.stopsLeft", { count: left })} · {t("trip.ride.about", { min: about })}
        </span>
      </div>
      {left > 0 && <p>{t("trip.ride.next", { stop: next.id ? `${next.name} (#${next.id})` : next.name })}</p>}
      <div
        className={styles.progress}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={last}
        aria-valuenow={index}
        aria-valuetext={t("trip.ride.progress", { done: index, total: last })}
      >
        <span style={{ width: `${last ? (index / last) * 100 : 100}%` }} />
      </div>
      <p className={styles.caption}>{basis}</p>
    </>
  );
}

/** The amber get-off warnings at 2 and 1 stops left (J3.2). */
function GetOffWarning({ left, alight }: { left: number; alight: string }) {
  const t = useT();
  const text = left === 2 ? t("trip.warn.ready", { count: 2, stop: alight }) : left === 1 ? t("trip.warn.next", { stop: alight }) : "";
  return (
    <p className={text ? styles.warn : styles.srOnly} aria-live="polite">
      {text}
    </p>
  );
}

function FinalCard({ leg, place }: { leg: WalkLeg; place: string }) {
  const t = useT();
  const lang = useLang();
  const { walkPace } = usePrefs();
  const directions = useFinalWalk(leg);
  return (
    <>
      <p className={styles.headline} aria-live="polite">
        {t("trip.final.head", { min: walkMinutes(leg.distanceM, walkPace), place })}
      </p>
      {directions.data && (
        <ol className={styles.walkSteps}>
          {directions.data.steps.map((s, i) => (
            <li key={i}>{walkStepText(s, lang)}</li>
          ))}
        </ol>
      )}
    </>
  );
}

interface StepCardProps {
  step: TripStep;
  fix?: LatLon;
  stops?: RideStop[];
  rideIndex: number;
  basis: string;
  destination: string;
  onWalkDirections: (leg: WalkLeg, ride: TransitLeg) => void;
  onDone: () => void;
}

export function StepCard({ step, fix, stops, rideIndex, basis, destination, onWalkDirections, onDone }: StepCardProps) {
  const t = useT();
  switch (step.kind) {
    case "walk":
      return <WalkCard leg={step.leg} ride={step.ride} fix={fix} onDirections={() => onWalkDirections(step.leg, step.ride)} />;
    case "wait":
      return <WaitCard ride={step.ride} />;
    case "ride":
      return stops ? <RideCard ride={step.ride} stops={stops} index={rideIndex} basis={basis} /> : null;
    case "final":
      return <FinalCard leg={step.leg} place={destination} />;
    case "arrived":
      return (
        <>
          <p className={styles.headline} aria-live="polite">
            {t("trip.arrived.head", { place: step.destination.name })}
          </p>
          <Button variant="primary" fullWidth label={t("common.done")} onPress={onDone} />
        </>
      );
  }
}

/**
 * D8 for the walk to the next stop, from where the rider is now. The planned distance seeds D8
 * only while the rider is still at the walk's start, so both screens show the same minutes.
 */
export function walkUrl(leg: WalkLeg, ride: TransitLeg, fix: LatLon | undefined, fromName: string): string {
  const moved = fix && haversineM(fix.lat, fix.lon, leg.from.lat, leg.from.lon) > MOVED_M;
  const q = new URLSearchParams({ from: formatLatLon(moved ? fix : leg.from), fromName, route: ride.route.id });
  if (!moved) q.set("d", String(leg.distanceM));
  return `/explore/stop/${encodeURIComponent(ride.board.id ?? "")}/walk?${q}`;
}
