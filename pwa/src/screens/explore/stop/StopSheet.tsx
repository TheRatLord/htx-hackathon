// D6 Stop sheet (`/explore/stop/:stopId?route=`): the centred "Name (ID)", the expanded route with
// today's blue strip first, its alerts, Save and Walk here, the other routes, and the legend.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useArrivals, useRoute, useStop } from "../../../api/hooks.ts";
import { useAlerts } from "../../../api/alertsStore.ts";
import { ApiError } from "../../../api/client.ts";
import type { StopDetail } from "../../../api/types.ts";
import { ExploreSheet } from "../../../app/layouts/ExploreChrome.tsx";
import { useBack } from "../../../app/useBack.ts";
import { usePageTitle } from "../../../app/usePageTitle.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { sideLine } from "../../../lib/format.ts";
import { errorText } from "../../../lib/i18nServer.ts";
import { canonicalRouteId } from "../../../lib/routes.ts";
import { useClientStop } from "../../../lib/stops.ts";
import { estimateWalk, walkMinutes } from "../../../lib/walk.ts";
import { useMapScene } from "../../../map/scene.ts";
import { useNow } from "../../../state/clock.ts";
import { useOffline } from "../../../state/offline.ts";
import { useLocation } from "../../../state/location.tsx";
import { usePrefs } from "../../../state/prefs.ts";
import { recentsActions } from "../../../state/recents.ts";
import { useSaved } from "../../../state/saved.ts";
import { useWalkDistance } from "../../../state/walkDistance.ts";
import { AlertStatusLine } from "../../../ui/AlertStatusLine.tsx";
import { Button } from "../../../ui/Button.tsx";
import { EmptyState } from "../../../ui/EmptyState.tsx";
import { ErrorState } from "../../../ui/ErrorState.tsx";
import { Legend } from "../../../ui/Legend.tsx";
import { SheetHeader } from "../../../ui/SheetHeader.tsx";
import { Skeleton } from "../../../ui/Skeleton.tsx";
import { useToast } from "../../../ui/Toast.tsx";
import { UpdatedAgo } from "../../../ui/UpdatedAgo.tsx";
import { foldCap } from "../home/fold.ts";
import { useHalfUpTo } from "../home/useHalfUpTo.ts";
import { walkUrl } from "../walk/walkUrl.ts";
import { CollapsedRoute } from "./CollapsedRoute.tsx";
import { ExpandedRoute } from "./ExpandedRoute.tsx";
import { departuresOf, pickExpanded, servingKey } from "./serving.ts";
import styles from "./StopSheet.module.css";

const STOP_ZOOM = 17;
/** Below this width, Large text already crowds "Walk here · 2 min" and Save onto two rows. */
const NARROW = 380;

/** A narrow screen, or Extra large text: the sheet's lines are at a premium. */
function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => window.innerWidth < NARROW);
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < NARROW);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return narrow;
}

/** ☆ Save / ★ Saved, with Undo on remove (A.1.8). Saving remembers the expanded route (C.5b). */
function SaveButton({ stop, routeId }: { stop: StopDetail["stop"]; routeId?: string }) {
  const t = useT();
  const toast = useToast();
  const saved = useSaved();
  const on = saved.isSaved(stop.id);
  const toggle = () => {
    if (!on) {
      saved.add({ id: stop.id, name: stop.name, preferredRouteId: routeId });
      return toast({ message: t("stop.savedToast") });
    }
    const index = saved.stops.findIndex((s) => s.id === stop.id);
    const entry = saved.stops[index];
    saved.remove(stop.id);
    toast({ message: t("stop.removedToast"), action: { label: t("common.undo"), onPress: () => saved.restore(entry, index) } });
  };
  return (
    <Button
      variant="tonal"
      icon={on ? "star_filled" : "star"}
      label={on ? t("common.saved") : t("common.save")}
      ariaLabel={t("stop.saveA11y", { id: stop.id })}
      pressed={on}
      onPress={toggle}
    />
  );
}

/** "🚶 Walk here · 2 min": the one place the Stop sheet shows the walk time. */
function WalkHere({ stop, routeId, compact }: { stop: StopDetail["stop"]; routeId?: string; compact: boolean }) {
  const t = useT();
  const navigate = useNavigate();
  const { fix } = useLocation();
  const { walkPace } = usePrefs();
  const seed = fix ? estimateWalk(fix, stop, walkPace).distanceM : undefined;
  const { distanceM } = useWalkDistance(fix, stop.id, seed);
  const min = distanceM !== undefined ? t("time.min", { n: walkMinutes(distanceM, walkPace) }) : undefined;
  const full = min ? t("common.walkHereMin", { min }) : t("common.walkHere");
  // Narrow screen or Extra large text: "🚶 2 min" so Save shares the row and stays above the fold (47).
  const label = compact && min ? min : full;
  return (
    <Button
      variant="tonal"
      icon="directions_walk"
      label={label}
      ariaLabel={label === full ? undefined : full}
      onPress={() => navigate(walkUrl(stop.id, { d: distanceM, route: routeId }))}
    />
  );
}

/** Until the stop loads: the pin only (Loaded sets the scene with its route line). */
function LoadingScene({ stopId }: { stopId: string }) {
  useMapScene({ highlightStopId: stopId }, [stopId]);
  return null;
}

function Loaded({ detail }: { detail: StopDetail }) {
  const t = useT();
  const now = useNow();
  const offline = useOffline();
  const { textSize } = usePrefs();
  const narrow = useNarrow();
  // Walk and Save on one row with short labels: Extra large text, or Large text on a narrow screen.
  const compact = textSize === "xlarge" || (narrow && textSize === "large");
  const [params, setParams] = useSearchParams();
  const alerts = useAlerts();
  const { stop, serving } = detail;
  const routeParam = params.get("route");
  const mixed = useArrivals(stop.id, { limit: 20 });
  const arrivals = mixed.data?.arrivals ?? detail.arrivals.arrivals;
  const expanded = pickExpanded(serving, arrivals, now, routeParam ? canonicalRouteId(routeParam) : undefined);
  const others = serving.filter((s) => s !== expanded);
  const updatedAt = mixed.data?.generatedAt ?? detail.arrivals.generatedAt;

  const expand = (routeId: string) =>
    setParams(
      (p) => {
        p.set("route", routeId);
        return p;
      },
      { replace: true },
    );

  const strip = useRef<HTMLDivElement>(null);
  const route = useRoute(expanded?.routeId ?? "", { enabled: Boolean(expanded) });
  const dir = route.data?.directions.find((d) => d.stopIds.includes(stop.id));
  const routeLine = dir && route.data ? { coords: dir.shapePoints.map(([lat, lon]) => [lon, lat] as [number, number]), color: route.data.color } : undefined;
  // The expanded route's line through the stop, as today: riders use it to confirm the direction.
  useMapScene({ focus: { kind: "point", point: stop, zoom: STOP_ZOOM }, highlightStopId: stop.id, routeLine }, [stop.id, dir]);
  useHalfUpTo(() => strip.current, foldCap, expanded ? servingKey(expanded) : "");

  // After the answer, so the strip is on the first screen even at 360 or Extra large (A.1.2).
  const stopActions = (
    <div className={`${styles.pills} ${compact ? styles.pillsCompact : ""}`}>
      <WalkHere stop={stop} routeId={expanded?.routeId} compact={compact} />
      <SaveButton stop={stop} routeId={expanded?.routeId} />
    </div>
  );

  return (
    <div className={styles.body}>
      {/* Offline: said right under the stop name, so clock times don't pass for live ones (39). */}
      {offline && (
        <div className={styles.offline}>
          <UpdatedAgo compact at={updatedAt} onRefresh={() => void mixed.refetch()} />
        </div>
      )}
      {detail.transitCenter && (
        <Button
          variant="text"
          label={t("stop.partOfTc", { tc: detail.transitCenter.name })}
          href={`/explore/tc/${encodeURIComponent(detail.transitCenter.id)}`}
        />
      )}
      {expanded && (
        <ExpandedRoute
          key={servingKey(expanded)}
          stop={stop}
          entry={expanded}
          shared={serving.filter((s) => s.routeId === expanded.routeId).length > 1}
          mixed={departuresOf(expanded, arrivals)}
          stripRef={strip}
          stopActions={stopActions}
          hideLongName={narrow || textSize === "xlarge"}
        />
      )}
      <AlertStatusLine
        scope="stop"
        name={stop.name}
        alerts={alerts.forStop(
          stop.id,
          stop.routes.map((r) => r.id),
        )}
      />
      {!expanded && stopActions}
      {others.length > 0 && <hr className={styles.divider} />}
      {/* Named, so the change from the blue strip to plain times reads as a second section, not a second style (13). */}
      {others.length > 0 && expanded && <h2 className={styles.othersHead}>{t("stop.otherRoutes")}</h2>}
      {others.length > 0 && (
        <ul className={styles.others} aria-label={expanded ? t("stop.otherRoutes") : t("stop.routes")}>
          {others.map((s) => (
            <li key={servingKey(s)}>
              <CollapsedRoute entry={s} deps={departuresOf(s, arrivals)} onExpand={() => expand(s.routeId)} />
            </li>
          ))}
        </ul>
      )}
      <Legend />
      {!offline && (
        <div className={styles.updated}>
          <UpdatedAgo at={updatedAt} onRefresh={() => void mixed.refetch()} />
        </div>
      )}
    </div>
  );
}

export default function StopSheet() {
  const t = useT();
  const lang = useLang();
  const back = useBack();
  const navigate = useNavigate();
  const { stopId = "" } = useParams();
  // Fetched once: the times come from the arrivals polls.
  const stop = useStop(stopId, { refetchInterval: false });
  const cached = useClientStop(stopId);
  const known = stop.data?.stop.name ?? cached?.name;
  const title = known ? t("stopLine.title", { name: known, id: stopId }) : t("stop.fallbackTitle", { id: stopId });
  usePageTitle(title);

  const summary = stop.data?.stop;
  useEffect(() => {
    if (summary)
      recentsActions.addStop({
        id: summary.id,
        name: summary.name,
        kind: summary.kind,
        directionLabel: summary.directionLabel,
        side: summary.side,
        routes: summary.routes.map((r) => r.name),
      });
  }, [summary]);

  const side = summary ? sideLine(summary, { withCompass: false, lang }) : "";
  const notFound = stop.error instanceof ApiError && stop.error.code === "stop_not_found" ? stop.error : undefined;
  return (
    <ExploreSheet ariaLabel={title} header={<SheetHeader title={title} titleAlign="center" sub={side || undefined} />} onBack={back}>
      {!stop.data && <LoadingScene stopId={stopId} />}
      {stop.data ? (
        <Loaded detail={stop.data} />
      ) : notFound ? (
        <div className={styles.body}>
          <EmptyState
            icon="search"
            title={t("stop.notFoundTitle")}
            body={errorText(notFound, { id: stopId }, lang)}
            action={{ label: t("stop.searchInstead"), variant: "primary", onPress: () => navigate(`/explore/search?q=${encodeURIComponent(stopId)}`) }}
          />
        </div>
      ) : stop.isError ? (
        <div className={styles.body}>
          <ErrorState error={stop.error} context={{ id: stopId }} onRetry={() => void stop.refetch()} />
        </div>
      ) : (
        <div className={styles.body}>
          <Skeleton variant="row" />
          <Skeleton variant="strip" />
          <Skeleton variant="row" />
        </div>
      )}
    </ExploreSheet>
  );
}
