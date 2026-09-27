// D13 Live trip: one step at a time, in the foreground. The screen stays awake while it is open;
// progress comes from the GPS fix when it is near the route, else the schedule, and Previous /
// Next always work (the only way to move a recorded sample trip without GPS).

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useVehicles } from "../../../api/hooks.ts";
import type { LatLon, PlanStop } from "../../../api/types.ts";
import { ExploreSheet, useExploreChrome, useSheet } from "../../../app/layouts/ExploreChrome.tsx";
import { useBack } from "../../../app/useBack.ts";
import { usePageTitle } from "../../../app/usePageTitle.ts";
import { fromLabel } from "../../../features/trip/origin.ts";
import type { RideStop } from "../../../features/trip/progress.ts";
import { itineraryLegs, itineraryMarkers } from "../../../features/trip/scene.ts";
import { simLegs, useSimulatedFix } from "../../../features/trip/simulate.ts";
import type { TripStep } from "../../../features/trip/steps.ts";
import { itineraryTimeline, rowForStep, stopTitle } from "../../../features/trip/timeline.ts";
import { destinationOf, useLiveTrip } from "../../../features/trip/useLiveTrip.ts";
import { useWakeLock } from "../../../features/trip/wakeLock.ts";
import { useLang, useT, type Lang } from "../../../i18n/index.ts";
import { ageMinutes, formatClock, STALE_VEHICLE_S } from "../../../lib/format.ts";
import { boundsOf, formatLatLon } from "../../../lib/geo.ts";
import { BUZZ, notify, notifyPermission, vibrate } from "../../../lib/notify.ts";
import { planUrl } from "../../../lib/planQuery.ts";
import { readJson, writeJson } from "../../../lib/storage.ts";
import { useMapScene, type MapScene } from "../../../map/scene.ts";
import { useLocation as useRider } from "../../../state/location.tsx";
import { usePrefs } from "../../../state/prefs.ts";
import { tripActions, useTrip, type ActiveTrip } from "../../../state/trip.ts";
import { Button } from "../../../ui/Button.tsx";
import { Dialog } from "../../../ui/Dialog.tsx";
import { EmptyState } from "../../../ui/EmptyState.tsx";
import { NotifyPermissionCard } from "../../../ui/NotifyPermissionCard.tsx";
import { StepList } from "../../../ui/StepList.tsx";
import { useToast } from "../../../ui/Toast.tsx";
import { PlanHeader } from "../plan/PlanHeader.tsx";
import { StepCard } from "./StepCard.tsx";
import styles from "./trip.module.css";

const RESUME_TOAST_AFTER_MS = 30_000;
/** Get-off warnings already given, so leaving D13 (for Walk) and coming back doesn't buzz again. */
const WARNED_KEY = "ridemetro.tripWarned";

function NoTrip() {
  const t = useT();
  const navigate = useNavigate();
  const onBack = useBack();
  useExploreChrome({ fabs: ["locate"], hideSearchBar: true });
  return (
    <ExploreSheet ariaLabel={t("trip.title")} onBack={onBack} header={<PlanHeader title={t("trip.title")} />}>
      <EmptyState icon="route_plan" title={t("trip.none.title")} body={t("trip.none.body")} action={{ label: t("trip.none.action"), onPress: () => navigate("/explore/plan") }} />
    </ExploreSheet>
  );
}

/** What the step asks of the rider, without its minutes, so it changes only when the step does. */
function stepSummary(step: TripStep, destination: string, t: ReturnType<typeof useT>, lang: Lang): string {
  switch (step.kind) {
    case "walk":
      return t("trip.say.walk", { stop: stopTitle(step.ride.board, lang) });
    case "wait":
      return t("trip.wait.head", { id: step.ride.board.id ?? "" });
    case "ride":
      return t("trip.say.ride", { route: step.ride.route.name, headsign: step.ride.headsign });
    case "final":
      return t("trip.say.walk", { stop: destination });
    case "arrived":
      return t("trip.arrived.head", { place: step.destination.name });
  }
}

/** The stop the current step is heading for, which the map enlarges and frames with the rider. */
function stepTarget(step: TripStep, stops: RideStop[] | undefined, rideIndex: number): { point: LatLon; stopId?: string } {
  switch (step.kind) {
    case "walk":
    case "wait":
      return { point: step.ride.board, stopId: step.ride.board.id };
    case "ride": {
      const next = stops?.[rideIndex + 1];
      return next?.point ? { point: next.point, stopId: next.id } : { point: step.ride.alight, stopId: step.ride.alight.id };
    }
    case "final":
      return { point: step.leg.to };
    case "arrived":
      return { point: step.destination };
  }
}

function Running({ active, destination }: { active: ActiveTrip; destination: PlanStop }) {
  const t = useT();
  const lang = useLang();
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const allSteps = params.get("view") === "steps";
  const rider = useRider();
  const { walkPace } = usePrefs();
  const { setSnap } = useSheet();
  const toast = useToast();
  const onBack = useBack();
  const stepsRef = useRef<HTMLElement>(null);
  const it = active.itinerary;

  // "Simulate moving": demo sessions only (a pinned ?demoLoc= or ?simulate=1).
  const simAllowed = rider.demo || params.has("simulate");
  const [simFrom, setSimFrom] = useState<number | null>(null);
  const sim = useMemo(() => (simFrom === null ? undefined : simLegs(it, simFrom)), [it, simFrom]);
  const simFix = useSimulatedFix(sim);
  const fix = simFix ?? rider.fix;

  const live = useLiveTrip(active, destination, fix);
  const { step, stepIndex, total, stops, rideIndex } = live;
  const n = Math.min(stepIndex + 1, total);
  useWakeLock(true);
  useExploreChrome({ fabs: ["locate"], hideSearchBar: true, tripBar: step.kind === "arrived" ? "complete" : undefined });

  // A new step starts at the top of the sheet, where its instruction is.
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    body.current?.parentElement?.scrollTo({ top: 0 });
  }, [stepIndex]);

  // A get-off warning buzzes once per step and trip; the last one also notifies if the rider allowed it.
  const left = step.kind === "ride" && stops ? stops.length - 1 - rideIndex : undefined;
  const alight = step.kind === "ride" ? stopTitle(step.ride.alight, lang) : "";
  useEffect(() => {
    if (left !== 1 && left !== 2) return;
    const key = `${active.startedAt}:${stepIndex}:${left}`;
    const warned = readJson<string[]>(WARNED_KEY, [], "session");
    if (warned.includes(key)) return;
    writeJson(WARNED_KEY, [...warned, key], "session");
    // A shown notification buzzes itself (and notify() buzzes when it can't show one): never twice.
    if (left === 1 && notifyPermission() === "granted") void notify(t("trip.warn.notifyTitle"), alight, `trip-${stepIndex}`);
    else vibrate(BUZZ);
  }, [left, alight, stepIndex, active.startedAt, t]);

  // Honest about the foreground limit: say so when the rider comes back after a while.
  useEffect(() => {
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > RESUME_TOAST_AFTER_MS) toast({ message: t("trip.resumed", { n, total }) });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [n, total, toast, t]);

  const ride = step.kind === "wait" || step.kind === "ride" ? step.ride : undefined;
  const vehicles = useVehicles(ride?.route.id, { enabled: Boolean(ride?.tripId) && !active.fixture });
  const vehicle = ride?.tripId ? vehicles.data?.vehicles.find((v) => v.tripId === ride.tripId) : undefined;

  const target = stepTarget(step, stops, rideIndex);
  const boarded = ride?.board.id;
  const legIndex = step.kind === "arrived" ? it.legs.length - 1 : step.legIndex;
  // The camera frames the rider and the step's target once per step (and once more when the first
  // fix arrives), never on each GPS update or bus poll: those only move the dot and the bus, so the
  // rider can pan and zoom during the ride. Locate brings the camera back.
  const hasFix = Boolean(fix);
  const focusKey = `${stepIndex}|${target.stopId ?? ""}|${target.point.lat},${target.point.lon}|${hasFix}`;
  const fixRef = useRef(fix);
  fixRef.current = fix;
  const focus = useMemo((): MapScene["focus"] => {
    const f = fixRef.current;
    const both = f && boundsOf([f, target.point]);
    const current = boundsOf((itineraryLegs(it)[legIndex]?.coords ?? []).map(([lon, lat]) => ({ lat, lon })));
    return both ? { kind: "bounds", bounds: both } : current && { kind: "bounds", bounds: current };
    // `focusKey` stands for the step, its target and whether there is a fix.
  }, [focusKey, it, legIndex]);
  const framed = useRef<MapScene["focus"]>(undefined);
  const scene = useMemo((): MapScene => {
    const legs = itineraryLegs(it);
    // Only a new framing moves the camera: a scene without `focus` redraws in place.
    const newFocus = framed.current !== focus;
    return {
      legs,
      markers: [
        // The enlarged stop has its own callout; on a ride, the stop just boarded is behind the rider.
        ...itineraryMarkers(it, lang, [target.stopId, boarded]),
        ...(simFix ? [{ id: "sim", point: simFix, kind: "origin" as const, label: t("trip.sim.you") }] : []),
      ],
      highlightStopId: target.stopId,
      vehicles: vehicle
        ? [
            {
              id: vehicle.vehicleId,
              point: vehicle,
              ageSeconds: vehicle.ageSeconds,
              label: vehicle.ageSeconds > STALE_VEHICLE_S ? t("trip.vehicleStale", { min: ageMinutes(0, vehicle.ageSeconds * 1000) }) : t("trip.vehicle", { route: vehicle.route }),
            },
          ]
        : [],
      ...(newFocus && { focus }),
    };
    // Rebuilt when what it shows changes (t follows lang); the rider's own dot is drawn by the map.
  }, [it, lang, focus, target.stopId, boarded, vehicle, simFix]);
  useMapScene(scene, [scene]);
  // Set after the scene is applied, so a render (or StrictMode's second call) never loses the framing.
  useEffect(() => {
    framed.current = focus;
  }, [focus]);

  const basis = simFix
    ? t("trip.basis.simulated")
    : live.source === "location"
      ? t("trip.basis.location")
      : t("trip.basis.schedule");

  const [confirmEnd, setConfirmEnd] = useState(false);
  const end = () => {
    tripActions.end();
    navigate("/explore", { replace: true });
  };
  // From the dialog: close it first so it drops its own history entry, then leave, so Back from
  // Explore doesn't return to an empty "No trip" screen.
  const endFromDialog = () => {
    setConfirmEnd(false);
    const go = () => {
      leaving.current?.();
      end();
    };
    window.addEventListener("popstate", go);
    // The dialog pops its entry on the next tick; if it had none to pop, leave anyway.
    const timer = window.setTimeout(go, 300);
    leaving.current = () => {
      window.removeEventListener("popstate", go);
      clearTimeout(timer);
      leaving.current = undefined;
    };
  };
  // Leaving another way first (the bottom nav) cancels it: no late end() or navigate().
  const leaving = useRef<() => void>(undefined);
  useEffect(() => () => leaving.current?.(), []);
  const originName = fromLabel(active.query, lang);

  if (allSteps) {
    const rows = itineraryTimeline(it, { fromName: originName, toName: destination.name, pace: walkPace, lang });
    const here = rider.fix;
    return (
      <ExploreSheet ariaLabel={t("trip.allSteps")} onBack={onBack} header={<PlanHeader title={t("trip.allSteps")} />}>
        <div className={styles.body}>
          <Button
            variant="tonal"
            icon="refresh"
            label={t("trip.planAgain")}
            disabled={!here}
            disabledReason={t("trip.planAgainOff")}
            onPress={() =>
              here && navigate(planUrl({ from: formatLatLon(here), to: active.query.to ?? formatLatLon(destination), toName: destination.name }))
            }
          />
          <StepList
            steps={rows.map((r) => r.step)}
            currentIndex={rowForStep(rows, step)}
            onStepPress={(_, i) => {
              const href = rows[i].href;
              if (href) navigate(href);
            }}
          />
        </div>
      </ExploreSheet>
    );
  }

  const summary = stepSummary(step, destination.name, t, lang);
  // Pulled all the way up, the sheet lists every step under the current one (as Google Maps does).
  const rows = itineraryTimeline(it, { fromName: originName, toName: destination.name, pace: walkPace, lang });
  const showAllSteps = () => {
    setSnap("full");
    requestAnimationFrame(() => stepsRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
  };
  return (
    <ExploreSheet
      ariaLabel={t("trip.title")}
      onBack={onBack}
      // Tucked away: when the rider arrives and what to do now, in two short lines.
      peek={
        <div className={styles.peek}>
          <p className={styles.peekTime}>
            {step.kind === "arrived" ? t("trip.complete") : t("trip.peekArrive", { time: formatClock(it.endTime, lang) })}
          </p>
          <p className={styles.peekStep}>{summary}</p>
        </div>
      }
      header={
        // The shared title row, so Back and the one chevron share a row and no "Show list" row is added.
        <PlanHeader
          title={step.kind === "arrived" ? t("trip.complete") : t("trip.stepOf", { n, total })}
          right={
            <Button
              variant="text"
              label={`${t("trip.allSteps")} ›`}
              onPress={showAllSteps}
            />
          }
        />
      }
    >
      <div ref={body} className={styles.body}>
        {/* The one announcement per step (L13): no minutes, so GPS and clock updates stay silent. */}
        <p className="visually-hidden" aria-live="polite">
          {step.kind === "arrived" ? `${t("trip.complete")}: ${summary}` : `${t("trip.stepOf", { n, total })}: ${summary}`}
        </p>
        <section className={styles.card}>
          <StepCard
            step={step}
            fix={fix}
            fixture={active.fixture}
            stops={stops}
            rideIndex={rideIndex}
            basis={basis}
            destination={destination.name}
            originName={originName}
            onNavigate={navigate}
            onDone={end}
            // Previous / Next share a row with the step's own action (Walking directions).
            actions={
              step.kind !== "arrived" && (
                <>
                  {stepIndex > 0 && <Button variant="tonal" label={`‹ ${t("trip.prev")}`} onPress={() => live.goTo(stepIndex - 1)} />}
                  <Button variant="primary" label={`${t("trip.next")} ›`} onPress={() => live.goTo(stepIndex + 1)} />
                </>
              )
            }
          />
        </section>
        <NotifyPermissionCard context="trip" />
        <section ref={stepsRef} className={styles.allSteps} aria-labelledby="trip-all-steps">
          <h2 id="trip-all-steps" className={styles.allStepsTitle}>
            {t("trip.allSteps")}
          </h2>
          <StepList
            steps={rows.map((r) => r.step)}
            currentIndex={rowForStep(rows, step)}
            onStepPress={(_, i) => {
              const href = rows[i].href;
              if (href) navigate(href);
            }}
          />
        </section>
        {step.kind !== "arrived" && (
          <>
            <p className={styles.caption}>{t("trip.keepOpen")}</p>
            <div className={styles.endRow}>
              <Button variant="danger-text" label={t("trip.end")} onPress={() => setConfirmEnd(true)} />
            </div>
          </>
        )}
        {simAllowed && step.kind !== "arrived" && (
          <div className={styles.sim}>
            <Button
              variant="outline"
              icon="directions_walk"
              label={t(simFrom === null ? "trip.sim.start" : "trip.sim.stop")}
              onPress={() => setSimFrom(simFrom === null ? legIndex : null)}
            />
            {simFix && <p className={styles.caption}>{t("trip.sim.note")}</p>}
          </div>
        )}
      </div>
      <Dialog
        open={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        title={t("trip.endTitle")}
        body={t("trip.endBody")}
        actions={[
          { label: t("trip.keepGoing"), variant: "text", onPress: () => setConfirmEnd(false) },
          { label: t("trip.end"), variant: "danger-text", onPress: endFromDialog },
        ]}
      />
    </ExploreSheet>
  );
}

export default function LiveTrip() {
  const t = useT();
  const { active } = useTrip();
  const destination = useMemo(() => active && destinationOf(active), [active]);
  usePageTitle(t("trip.title"));
  return active && destination ? <Running active={active} destination={destination} /> : <NoTrip />;
}
