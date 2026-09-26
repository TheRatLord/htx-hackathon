// One Live trip step (spec D13): Walk, Wait, Ride, Final walk or Arrived. The headlines are plain
// text: LiveTrip announces each step once through its own live region.

import type { ReactNode } from "react";
import { useArrivals, useWalk } from "../../../api/hooks.ts";
import type { LatLon, TransitLeg, WalkLeg } from "../../../api/types.ts";
import { boardDeparture } from "../../../features/trip/departures.ts";
import { walkOrigin, type RideStop } from "../../../features/trip/progress.ts";
import type { TripStep } from "../../../features/trip/steps.ts";
import { shortSide, stopTitle } from "../../../features/trip/timeline.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { formatClock, sideLine } from "../../../lib/format.ts";
import { formatLatLon } from "../../../lib/geo.ts";
import { walkStepText } from "../../../lib/i18nServer.ts";
import { toRouteRef } from "../../../lib/routes.ts";
import { canMakeIt, estimateWalk, walkMinutes } from "../../../lib/walk.ts";
import { useNow } from "../../../state/clock.ts";
import { usePrefs } from "../../../state/prefs.ts";
import { useWalkDistance } from "../../../state/walkDistance.ts";
import { BayTag } from "../../../ui/BayTag.tsx";
import { Button } from "../../../ui/Button.tsx";
import { FactStrip, LiveStrip } from "../../../ui/LiveStrip.tsx";
import { RouteBadge } from "../../../ui/RouteBadge.tsx";
import styles from "./trip.module.css";

const ARRIVALS_LIMIT = 4;

/** The bus being caught. A recorded (fixture) trip has no real bus, so only its planned time shows. */
function useBoardDeparture(ride: TransitLeg, fixture: boolean) {
  const now = useNow();
  const arrivals = useArrivals(ride.board.id ?? "", { route: ride.route.id, limit: ARRIVALS_LIMIT, enabled: Boolean(ride.board.id) });
  const list = arrivals.data?.arrivals ?? [];
  // A sample trip's bus is never the stop's real one, but the real buses after it are still the
  // rider's fallback ("8 min · 38 min"), so only the match is skipped.
  return boardDeparture(fixture ? { ...ride, tripId: undefined } : ride, list, now);
}

interface WalkProps {
  leg: WalkLeg;
  ride: TransitLeg;
  fix?: LatLon;
  fixture: boolean;
  /** Where the planned walk starts, for D8's title. */
  fromName: string;
  onNavigate: (href: string) => void;
  actions?: ReactNode;
}

function WalkCard({ leg, ride, fix, fixture, fromName, onNavigate, actions }: WalkProps) {
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const { walkPace } = usePrefs();
  const { dep } = useBoardDeparture(ride, fixture);
  const stopId = ride.board.id ?? "";
  // On this walk: from the fix, through the shared distance cache (C.17). Anywhere else: the plan.
  const origin = walkOrigin(leg, fix);
  const shared = useWalkDistance(origin, stopId, origin && estimateWalk(origin, ride.board, walkPace).distanceM);
  const distanceM = origin && shared.distanceM !== undefined ? shared.distanceM : leg.distanceM;
  const min = walkMinutes(distanceM, walkPace);
  const verdict = canMakeIt(min, dep, now);
  const side = sideLine({ ...ride.board, kind: toRouteRef(ride.route).mode }, { withCompass: false, lang });
  const q = new URLSearchParams({
    from: formatLatLon(origin ?? leg.from),
    fromName: origin ? t("common.myLocation") : fromName,
    route: ride.route.id,
    d: String(distanceM),
  });
  return (
    <>
      <p className={styles.headline}>{t("trip.walk.head", { min, stop: stopTitle(ride.board, lang) })}</p>
      {side && <p className={styles.variant}>{side}</p>}
      <p>
        {t("trip.walk.next", { route: ride.route.name, time: formatClock(dep.departureTime, lang) })} ·{" "}
        <span className={verdict === "yes" ? styles.ok : styles.alert}>{t(`canMakeIt.${verdict}`)}</span>
      </p>
      <div className={styles.controls}>
        <Button
          variant="tonal"
          icon="directions_walk"
          label={`${t("trip.walk.directions")} ›`}
          onPress={() => onNavigate(`/explore/stop/${encodeURIComponent(stopId)}/walk?${q}`)}
        />
        {actions}
      </div>
    </>
  );
}

function WaitCard({ ride, fixture }: { ride: TransitLeg; fixture: boolean }) {
  const t = useT();
  const lang = useLang();
  const { matched, strip } = useBoardDeparture(ride, fixture);
  const route = toRouteRef(ride.route);
  const side = shortSide(ride.board, lang);
  const id = ride.board.id ?? "";
  const now = useNow();
  const time = formatClock(ride.departureTime, lang).replace(" ", "\u00a0");
  // "Your bus: 11 min (12:15 PM)": which of the strip's times is the rider's own (27).
  const min = Math.floor((Date.parse(ride.departureTime) - now) / 60_000);
  const yours = min >= 1 ? t("trip.wait.plannedFirst", { min, time }) : t("trip.wait.plannedNow", { time });
  const planned = strip.length > 1 ? yours : t("trip.wait.planned", { time });
  return (
    <>
      <p className={styles.headline}>{side ? t("trip.wait.headSide", { id, side }) : t("trip.wait.head", { id })}</p>
      {ride.board.bay && <BayTag bay={ride.board.bay} />}
      <div className={styles.bleed}>
        {/* Which of the strip's times is the planned bus, said inside the strip ("10:40 PM" on one line). */}
        <LiveStrip deps={strip} caption={matched ? undefined : planned} />
      </div>
      <p className={`${styles.board} ${styles.withChip}`}>
        {t(route.mode === "rail" ? "trip.wait.boardTrain" : "trip.wait.boardBus")} <RouteBadge route={route} size="sm" /> <strong>{ride.headsign.toUpperCase()}</strong>
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
  const lang = useLang();
  const now = useNow();
  const route = toRouteRef(ride.route);
  const last = stops.length - 1;
  const left = Math.max(0, last - index);
  const about = Math.max(1, Math.round((stops[last].time - Math.max(now, stops[index].time)) / 60_000));
  const next = stops[Math.min(index + 1, last)];
  return (
    <>
      <p className={`${styles.headline} ${styles.rideHead}`}>
        {t("trip.ride.ride")} <RouteBadge route={route} size="sm" /> {t("headsign.to")} {ride.headsign.toUpperCase()}
      </p>
      <p className={styles.getOff}>{t("trip.ride.getOff", { stop: stopTitle(ride.alight, lang) })}</p>
      <GetOffWarning left={left} alight={ride.alight.id ? stopTitle(ride.alight, lang) : ride.alight.name} />
      <div className={styles.bleed}>
        <FactStrip
          facts={[
            { value: left, unit: t("trip.ride.stopsLeft", { count: left }) },
            { lead: t("trip.ride.about"), value: about, unit: t("trip.ride.min") },
          ]}
        />
      </div>
      {left > 0 && <p>{t("trip.ride.next", { stop: stopTitle(next, lang) })}</p>}
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

/** The amber get-off warnings at 2 and 1 stops left (J3.2); the region stays mounted so each is announced. */
function GetOffWarning({ left, alight }: { left: number; alight: string }) {
  const t = useT();
  const text = left === 2 ? t("trip.warn.ready", { count: 2, stop: alight }) : left === 1 ? t("trip.warn.next", { stop: alight }) : "";
  return (
    <p className={text ? styles.warn : "visually-hidden"} aria-live="polite">
      {text}
    </p>
  );
}

/** Below this there is nothing to explain: the place is at the stop. */
const MIN_DIRECTIONS_M = 30;

function FinalCard({ leg, place }: { leg: WalkLeg; place: string }) {
  const t = useT();
  const lang = useLang();
  const { walkPace } = usePrefs();
  const directions = useWalk(leg.from, leg.to, { enabled: leg.distanceM >= MIN_DIRECTIONS_M });
  return (
    <>
      <p className={styles.headline}>{t("trip.final.head", { min: walkMinutes(leg.distanceM, walkPace), place })}</p>
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
  fixture: boolean;
  stops?: RideStop[];
  rideIndex: number;
  basis: string;
  destination: string;
  /** The name of where the trip starts, for the first walk's directions. */
  originName: string;
  onNavigate: (href: string) => void;
  onDone: () => void;
  /** Previous / Next: on the Walk step they share a row with Walking directions. */
  actions?: ReactNode;
}

export function StepCard(props: StepCardProps) {
  const { step, actions } = props;
  if (step.kind === "walk") return <StepBody {...props} />;
  return (
    <>
      <StepBody {...props} />
      {actions && <div className={styles.controls}>{actions}</div>}
    </>
  );
}

function StepBody({ step, fix, fixture, stops, rideIndex, basis, destination, originName, onNavigate, onDone, actions }: StepCardProps) {
  const t = useT();
  switch (step.kind) {
    case "walk":
      return (
        <WalkCard
          leg={step.leg}
          ride={step.ride}
          fix={fix}
          fixture={fixture}
          fromName={step.legIndex === 0 ? originName : step.leg.from.name}
          onNavigate={onNavigate}
          actions={actions}
        />
      );
    case "wait":
      return <WaitCard ride={step.ride} fixture={fixture} />;
    case "ride":
      return stops ? <RideCard ride={step.ride} stops={stops} index={rideIndex} basis={basis} /> : null;
    case "final":
      return <FinalCard leg={step.leg} place={destination} />;
    case "arrived":
      return (
        <>
          <p className={styles.headline}>{t("trip.arrived.head", { place: step.destination.name })}</p>
          <Button variant="primary" fullWidth label={t("common.done")} onPress={onDone} />
        </>
      );
  }
}
