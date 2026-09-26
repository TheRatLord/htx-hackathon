// D8 Walk to a stop (`/explore/stop/:stopId/walk?from=&fromName=&route=&d=`): one walk time
// (the card's until OSRM answers), the next bus verdict, street steps and "I'm at the stop".

import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useStop, useWalk } from "../../../api/hooks.ts";
import type { LatLon, StopDetail, WalkRoute } from "../../../api/types.ts";
import { ExploreSheet } from "../../../app/layouts/ExploreChrome.tsx";
import { useBack } from "../../../app/useBack.ts";
import { usePageTitle } from "../../../app/usePageTitle.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { formatDistance, platformLabel } from "../../../lib/format.ts";
import { parseLatLon, roundedKey } from "../../../lib/geo.ts";
import { localiseSide, walkStepText } from "../../../lib/i18nServer.ts";
import { estimateWalk, walkMinutes } from "../../../lib/walk.ts";
import { useMapScene, type MapScene } from "../../../map/scene.ts";
import { isFinding, useLocation } from "../../../state/location.tsx";
import { useOffline } from "../../../state/offline.ts";
import { usePrefs } from "../../../state/prefs.ts";
import { recordWalkDistance, useWalkDistance } from "../../../state/walkDistance.ts";
import { Button } from "../../../ui/Button.tsx";
import { EmptyState } from "../../../ui/EmptyState.tsx";
import { ErrorState } from "../../../ui/ErrorState.tsx";
import { Icon } from "../../../ui/Icon.tsx";
import { SheetHeader } from "../../../ui/SheetHeader.tsx";
import { Skeleton } from "../../../ui/Skeleton.tsx";
import { NextBus } from "./NextBus.tsx";
import { googleMapsUrl, stepIcon } from "./steps.ts";
import styles from "./Walk.module.css";

const STEP_ZOOM = 18;
/** Show "(about N min at an easy pace)" when the slower pace adds at least this much. */
const EASY_PACE_GAP_MIN = 2;

function walkTitle(t: ReturnType<typeof useT>, lang: ReturnType<typeof useLang>, detail: StopDetail | undefined, stopId: string, fromName?: string) {
  const stop = detail ? t("stopLine.title", { name: detail.stop.name, id: stopId }) : t("stop.fallbackTitle", { id: stopId });
  if (fromName) return t("walk.titleFrom", { from: fromName, stop });
  if (detail?.transitCenter) return t("walk.titleTc", { tc: detail.transitCenter.name, platform: platformLabel(detail.stop, lang), id: stopId });
  return t("walk.title", { stop });
}

function openGoogleMaps(to: LatLon, from?: LatLon) {
  window.open(googleMapsUrl(to, from), "_blank", "noopener");
}

interface StepsProps {
  walk: WalkRoute;
  onStep: (point: LatLon) => void;
}

function Steps({ walk, onStep }: StepsProps) {
  const t = useT();
  const lang = useLang();
  return (
    <ol className={styles.steps}>
      {walk.steps.map((s, i) => (
        <li key={i}>
          <button type="button" className={styles.step} onClick={() => onStep(s)} aria-description={t("walk.stepZoom")}>
            <Icon name={stepIcon(s)} color="var(--c-text-variant)" />
            <span className={styles.stepText}>{walkStepText(s, lang)}</span>
            {s.distanceM > 0 && <span className={styles.stepDistance}>{formatDistance(s.distanceM, lang)}</span>}
          </button>
        </li>
      ))}
    </ol>
  );
}

export default function Walk() {
  const t = useT();
  const lang = useLang();
  const back = useBack();
  const navigate = useNavigate();
  const { stopId = "" } = useParams();
  const [params] = useSearchParams();
  const rider = useLocation();
  const offline = useOffline();
  const { walkPace } = usePrefs();
  const from = parseLatLon(params.get("from"));
  const fromName = params.get("fromName") ?? undefined;
  const routeId = params.get("route") ?? undefined;
  const seedParam = params.get("d");
  const origin = from ?? rider.fix;

  const stop = useStop(stopId);
  const walk = useWalk(origin, stopId);
  const target = stop.data?.stop;
  const seed = seedParam ? Number(seedParam) : origin && target ? estimateWalk(origin, target, walkPace).distanceM : undefined;
  const { distanceM } = useWalkDistance(origin, stopId, seed);
  const [stepFocus, setStepFocus] = useState<LatLon>();

  useEffect(() => {
    if (origin && walk.data?.source === "osrm") recordWalkDistance(origin, stopId, walk.data.distanceM, "osrm");
  }, [origin, stopId, walk.data]);

  const title = walkTitle(t, lang, stop.data, stopId, fromName);
  usePageTitle(title);

  const scene: MapScene = { highlightStopId: stopId };
  if (walk.data) {
    const coords = walk.data.geometry.coordinates;
    scene.legs = [{ coords, kind: "walk", color: "" }];
    const lons = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    scene.focus = stepFocus
      ? { kind: "point", point: stepFocus, zoom: STEP_ZOOM }
      : { kind: "bounds", bounds: [{ lat: Math.min(...lats), lon: Math.min(...lons) }, { lat: Math.max(...lats), lon: Math.max(...lons) }] };
  } else if (target) scene.focus = { kind: "point", point: target };
  if (origin) scene.markers = [{ id: "origin", point: origin, kind: from ? "destination" : "origin", label: fromName }];
  // Rounded, so GPS jitter doesn't move the camera.
  useMapScene(scene, [stopId, walk.data, target, stepFocus?.lat, stepFocus?.lon, origin && roundedKey(origin)]);

  const walkMin = distanceM !== undefined ? walkMinutes(distanceM, walkPace) : undefined;
  const estimate = walk.data?.source === "straight-line-estimate";
  const maps = target && (() => openGoogleMaps(target, from));
  const mapsButton = (primary: boolean) =>
    maps && <Button variant={primary ? "primary" : "text"} fullWidth={primary} label={t("walk.googleMaps")} ariaLabel={t("walk.googleMapsA11y")} onPress={maps} />;

  let body;
  if (!origin) {
    body =
      isFinding(rider.status) && rider.requested ? (
        <>
          <p className={styles.summary}>{t("walk.finding")}</p>
          <Skeleton variant="row" />
        </>
      ) : (
        <>
          <EmptyState
            icon="my_location"
            title={t("walk.needLocation")}
            body={t("walk.needLocationBody")}
            action={{ label: t("banner.turnOnLocation"), onPress: rider.request, variant: "primary" }}
          />
          {mapsButton(false)}
        </>
      );
  } else {
    const side = target?.side ? localiseSide(target.side, lang) : "";
    const summary = [
      walkMin !== undefined && t("time.min", { n: walkMin }),
      distanceM !== undefined && formatDistance(distanceM, lang),
      side && side.charAt(0).toLowerCase() + side.slice(1),
    ].filter(Boolean);
    const easy = distanceM !== undefined && walkPace === "normal" ? walkMinutes(distanceM, "slower") : undefined;
    const noConnection = offline && !walk.data;
    body = (
      <>
        <p className={styles.summary}>{summary.join(" · ")}</p>
        {easy !== undefined && walkMin !== undefined && easy - walkMin >= EASY_PACE_GAP_MIN && <p className={styles.easy}>{t("walk.easyPace", { min: easy })}</p>}
        <NextBus stopId={stopId} routeId={routeId} walkMin={walkMin} />
        {noConnection && <p className={styles.warnBox}>{t("walk.offline")}</p>}
        {estimate && <p className={styles.warnBox}>{t("walk.estimate")}</p>}
        {walk.data ? (
          <Steps walk={walk.data} onStep={setStepFocus} />
        ) : walk.isError && !noConnection ? (
          <ErrorState error={walk.error} onRetry={() => void walk.refetch()} />
        ) : (
          !noConnection && <Skeleton variant="row" />
        )}
        {noConnection || estimate ? (
          <>
            {mapsButton(true)}
            <Button variant="tonal" label={t("walk.atStop")} onPress={() => navigate(stopUrl(stopId, routeId), { replace: true })} />
          </>
        ) : (
          <>
            <Button variant="primary" fullWidth label={t("walk.atStop")} onPress={() => navigate(stopUrl(stopId, routeId), { replace: true })} />
            {mapsButton(false)}
          </>
        )}
      </>
    );
  }

  return (
    <ExploreSheet ariaLabel={title} header={<SheetHeader title={title} />} onBack={back}>
      <div className={styles.body}>{body}</div>
    </ExploreSheet>
  );
}

const stopUrl = (stopId: string, routeId?: string) => `/explore/stop/${encodeURIComponent(stopId)}${routeId ? `?route=${encodeURIComponent(routeId)}` : ""}`;
