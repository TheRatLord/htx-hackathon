// D13 Live trip: one step at a time, in the foreground. The screen stays awake while it is open;
// progress comes from the GPS fix when it is near the route, else the schedule, and Previous /
// Next always work (the only way to move a recorded sample trip without GPS).

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useVehicles } from "../../../api/hooks.ts";
import { ExploreSheet, useExploreChrome, useSheet } from "../../../app/layouts/ExploreChrome.tsx";
import { useBack } from "../../../app/useBack.ts";
import { usePageTitle } from "../../../app/usePageTitle.ts";
import { boundsOf, itineraryLegs, itineraryMarkers, useSettledSheetHeight } from "../../../features/trip/scene.ts";
import { simLegs, useSimulatedFix } from "../../../features/trip/simulate.ts";
import { itineraryTimeline, rowForStep, stopTitle } from "../../../features/trip/timeline.ts";
import { useLiveTrip } from "../../../features/trip/useLiveTrip.ts";
import { useWakeLock } from "../../../features/trip/wakeLock.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { formatLatLon } from "../../../lib/geo.ts";
import { notify, vibrate } from "../../../lib/notify.ts";
import { planUrl } from "../../../lib/planQuery.ts";
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
import { StepCard, walkUrl } from "./StepCard.tsx";
import styles from "./trip.module.css";

const BUZZ = [200, 100, 200];
const RESUME_TOAST_AFTER_MS = 30_000;
const VEHICLE_STALE_S = 120;
const FOLLOW_ZOOM = 16;

function NoTrip() {
  const t = useT();
  const navigate = useNavigate();
  const onBack = useBack();
  return (
    <ExploreSheet ariaLabel={t("trip.title")} onBack={onBack} header={<SheetHeader title={t("trip.title")} />}>
      <EmptyState icon="route_plan" title={t("trip.none.title")} body={t("trip.none.body")} action={{ label: t("trip.none.action"), onPress: () => navigate("/explore/plan") }} />
    </ExploreSheet>
  );
}

function Running({ active }: { active: ActiveTrip }) {
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

  const live = useLiveTrip(active, fix);
  const { step, stepIndex, total, stops, rideIndex } = live;
  const n = Math.min(stepIndex + 1, total);
  useWakeLock(true);

  // A get-off warning buzzes once per step; the last one also notifies if the rider allowed it.
  const left = step.kind === "ride" && stops ? stops.length - 1 - rideIndex : undefined;
  const fired = useRef(new Set<string>());
  useEffect(() => {
    if (step.kind !== "ride" || (left !== 1 && left !== 2)) return;
    const key = `${stepIndex}:${left}`;
    if (fired.current.has(key)) return;
    fired.current.add(key);
    vibrate(BUZZ);
    if (left === 1) void notify(t("trip.warn.notifyTitle"), stopTitle(step.ride.alight), `trip-${stepIndex}`);
  }, [left, step, stepIndex, lang]);

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

  const highlightStopId =
    step.kind === "walk" ? step.ride.board.id : step.kind === "wait" ? step.ride.board.id : step.kind === "ride" ? stops?.[rideIndex + 1]?.id : undefined;
  const legIndex = "legIndex" in step ? step.legIndex : it.legs.length - 1;
  const sheetH = useSettledSheetHeight();
  const scene = useMemo((): MapScene => {
    const legs = itineraryLegs(it);
    const current = boundsOf((legs[legIndex]?.coords ?? []).map(([lon, lat]) => ({ lat, lon })));
    return {
      legs,
      markers: [...itineraryMarkers(it, lang), ...(simFix ? [{ id: "sim", point: simFix, kind: "origin" as const, label: t("trip.sim.you") }] : [])],
      highlightStopId,
      vehicles: vehicle
        ? [
            {
              id: vehicle.vehicleId,
              point: vehicle,
              label: vehicle.ageSeconds > VEHICLE_STALE_S ? t("trip.vehicleStale", { min: Math.round(vehicle.ageSeconds / 60) }) : t("trip.vehicle", { route: vehicle.route }),
            },
          ]
        : [],
      focus: fix ? { kind: "point", point: fix, zoom: FOLLOW_ZOOM } : current && { kind: "bounds", bounds: current },
    };
    // Rebuilt when what it shows changes (t follows lang); `sheetH` re-fits it above a settled sheet.
  }, [it, lang, legIndex, highlightStopId, vehicle, fix, simFix, sheetH]);
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

  if (allSteps) {
    const rows = itineraryTimeline(it, { fromName: active.query.fromName ?? t("common.myLocation"), toName: live.destination.name, pace: walkPace, lang });
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
              here &&
              navigate(
                planUrl({
                  from: formatLatLon(here),
                  fromName: t("common.myLocation"),
                  to: active.query.to ?? formatLatLon(live.destination),
                  toName: live.destination.name,
                }),
              )
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

  return (
    <ExploreSheet
      ariaLabel={t("trip.title")}
      onBack={onBack}
      header={
        <div className={styles.stepHeader}>
          <h1 tabIndex={-1} className={styles.stepOf}>
            {t("trip.stepOf", { n, total })}
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
      <div className={styles.body}>
        <section className={styles.card}>
          <StepCard
            step={step}
            fix={fix}
            stops={stops}
            rideIndex={rideIndex}
            basis={basis}
            destination={live.destination.name}
            onWalkDirections={(leg, r) => navigate(walkUrl(leg, r, rider.fix, rider.fix ? t("common.myLocation") : leg.from.name))}
            onDone={end}
          />
        </section>
        {active.fixture && step.kind !== "ride" && step.kind !== "arrived" && <p className={styles.caption}>{basis}</p>}
        <NotifyPermissionCard context="trip" onDone={() => undefined} />
        {step.kind !== "arrived" && (
          <div className={styles.controls}>
            {stepIndex > 0 && <Button variant="tonal" icon="chevron_left" label={t("trip.prev")} onPress={() => live.goTo(stepIndex - 1)} />}
            <Button variant="tonal" label={`${t("trip.next")} ›`} onPress={() => live.goTo(stepIndex + 1)} />
          </div>
        )}
        <p className={styles.caption}>{t("trip.keepOpen")}</p>
        {simAllowed && (
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
        <div>
          <Button variant="danger-text" label={t("trip.end")} onPress={() => setConfirmEnd(true)} />
        </div>
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
  usePageTitle(t("trip.title"));
  useExploreChrome({ fabs: ["locate"], hideSearchBar: true });
  return active ? <Running active={active} /> : <NoTrip />;
}
