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
import { boundsOf, itineraryLegs, itineraryMarkers, useSettledSheetHeight } from "../../../features/trip/scene.ts";
import { simLegs, useSimulatedFix } from "../../../features/trip/simulate.ts";
import type { TripStep } from "../../../features/trip/steps.ts";
import { itineraryTimeline, rowForStep, stopTitle } from "../../../features/trip/timeline.ts";
import { destinationOf, useLiveTrip } from "../../../features/trip/useLiveTrip.ts";
import { useWakeLock } from "../../../features/trip/wakeLock.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { formatLatLon } from "../../../lib/geo.ts";
import { notify, vibrate } from "../../../lib/notify.ts";
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
import { SheetHeader } from "../../../ui/SheetHeader.tsx";
import { StepList } from "../../../ui/StepList.tsx";
import { useToast } from "../../../ui/Toast.tsx";
import { StepCard } from "./StepCard.tsx";
import styles from "./trip.module.css";

const BUZZ = [200, 100, 200];
const RESUME_TOAST_AFTER_MS = 30_000;
const VEHICLE_STALE_S = 120;
/** Get-off warnings already given, so leaving D13 (for Walk) and coming back doesn't buzz again. */
const WARNED_KEY = "ridemetro.tripWarned";

function NoTrip() {
  const t = useT();
  const navigate = useNavigate();
  const onBack = useBack();
  useExploreChrome({ fabs: ["locate"], hideSearchBar: true });
  return (
    <ExploreSheet ariaLabel={t("trip.title")} onBack={onBack} header={<SheetHeader title={t("trip.title")} />}>
      <EmptyState icon="route_plan" title={t("trip.none.title")} body={t("trip.none.body")} action={{ label: t("trip.none.action"), onPress: () => navigate("/explore/plan") }} />
    </ExploreSheet>
  );
}

/** What the step asks of the rider, without its minutes, so it changes only when the step does. */
function stepSummary(step: TripStep, destination: string, t: ReturnType<typeof useT>): string {
  switch (step.kind) {
    case "walk":
      return t("trip.say.walk", { stop: stopTitle(step.ride.board) });
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
  const alight = step.kind === "ride" ? stopTitle(step.ride.alight) : "";
  useEffect(() => {
    if (left !== 1 && left !== 2) return;
    const key = `${active.startedAt}:${stepIndex}:${left}`;
    const warned = readJson<string[]>(WARNED_KEY, [], "session");
    if (warned.includes(key)) return;
    writeJson(WARNED_KEY, [...warned, key], "session");
    vibrate(BUZZ);
    if (left === 1) void notify(t("trip.warn.notifyTitle"), alight, `trip-${stepIndex}`);
    // `t` is rebuilt every render; `lang` is what it depends on.
  }, [left, alight, stepIndex, active.startedAt, lang]);

  // Honest about the foreground limit: say so when the rider comes back after a while.
  useEffect(() => {
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > RESUME_TOAST_AFTER_MS) toast({ message: t("trip.resumed", { n, total }) });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [n, total, toast, lang]);

  const ride = step.kind === "wait" || step.kind === "ride" ? step.ride : undefined;
  const vehicles = useVehicles(ride?.route.id, { enabled: Boolean(ride?.tripId) && !active.fixture });
  const vehicle = ride?.tripId ? vehicles.data?.vehicles.find((v) => v.tripId === ride.tripId) : undefined;

  const target = stepTarget(step, stops, rideIndex);
  const boarded = ride?.board.id;
  const legIndex = step.kind === "arrived" ? it.legs.length - 1 : step.legIndex;
  const sheetH = useSettledSheetHeight();
  const scene = useMemo((): MapScene => {
    const legs = itineraryLegs(it);
    const current = boundsOf((legs[legIndex]?.coords ?? []).map(([lon, lat]) => ({ lat, lon })));
    // The rider and where they are heading, together; without a fix, the current leg.
    const both = fix && boundsOf([fix, target.point]);
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
              label: vehicle.ageSeconds > VEHICLE_STALE_S ? t("trip.vehicleStale", { min: Math.round(vehicle.ageSeconds / 60) }) : t("trip.vehicle", { route: vehicle.route }),
            },
          ]
        : [],
      focus: both ? { kind: "bounds", bounds: both } : current && { kind: "bounds", bounds: current },
    };
    // Rebuilt when what it shows changes (t follows lang); `sheetH` re-fits it above a settled sheet.
  }, [it, lang, legIndex, target.stopId, target.point.lat, target.point.lon, boarded, vehicle, fix, simFix, sheetH]);
  useMapScene(scene, [scene]);

  const basis = simFix
    ? t("trip.basis.simulated")
    : live.source === "location"
      ? t("trip.basis.location")
      : live.source === "none"
        ? t("trip.basis.fixture")
        : t("trip.basis.schedule");

  const [confirmEnd, setConfirmEnd] = useState(false);
  const end = () => {
    tripActions.end();
    navigate("/explore", { replace: true });
  };
  const originName = fromLabel(active.query, lang);

  if (allSteps) {
    const rows = itineraryTimeline(it, { fromName: originName, toName: destination.name, pace: walkPace, lang });
    const here = rider.fix;
    return (
      <ExploreSheet ariaLabel={t("trip.allSteps")} onBack={onBack} header={<SheetHeader title={t("trip.allSteps")} />}>
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

  const summary = stepSummary(step, destination.name, t);
  return (
    <ExploreSheet
      ariaLabel={t("trip.title")}
      onBack={onBack}
      header={
        <div className={styles.stepHeader}>
          <h1 tabIndex={-1} className={styles.stepOf}>
            {step.kind === "arrived" ? t("trip.complete") : t("trip.stepOf", { n, total })}
          </h1>
          <Button
            variant="text"
            label={`${t("trip.allSteps")} ›`}
            onPress={() => {
              setSnap("full");
              navigate(`/explore/trip?view=steps`);
            }}
          />
        </div>
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
          />
        </section>
        {active.fixture && !simFix && step.kind !== "ride" && step.kind !== "arrived" && <p className={styles.caption}>{t("trip.basis.fixture")}</p>}
        <NotifyPermissionCard context="trip" onDone={() => undefined} />
        {step.kind !== "arrived" && (
          <div className={styles.controls}>
            {stepIndex > 0 && <Button variant="tonal" icon="chevron_left" label={t("trip.prev")} onPress={() => live.goTo(stepIndex - 1)} />}
            <Button variant="tonal" label={`${t("trip.next")} ›`} onPress={() => live.goTo(stepIndex + 1)} />
          </div>
        )}
        {step.kind !== "arrived" && <p className={styles.caption}>{t("trip.keepOpen")}</p>}
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
        {step.kind !== "arrived" && (
          <div>
            <Button variant="danger-text" label={t("trip.end")} onPress={() => setConfirmEnd(true)} />
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
          { label: t("trip.end"), variant: "danger-text", onPress: end },
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
