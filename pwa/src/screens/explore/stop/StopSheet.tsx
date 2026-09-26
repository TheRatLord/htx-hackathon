// D6 Stop sheet (`/explore/stop/:stopId?route=`): the centred "Name (ID)", Save and Walk here,
// alerts, the expanded route with today's blue strip, the other routes, and the legend.

import { useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useArrivals, useStop } from "../../../api/hooks.ts";
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
import { estimateWalk, walkMinutes } from "../../../lib/walk.ts";
import { useMapScene } from "../../../map/scene.ts";
import { useNow } from "../../../state/clock.ts";
import { useLocation } from "../../../state/location.tsx";
import { usePrefs } from "../../../state/prefs.ts";
import { recentsActions, useRecents } from "../../../state/recents.ts";
import { useSaved } from "../../../state/saved.ts";
import { useWalkDistance } from "../../../state/walkDistance.ts";
import { AlertStatusLine } from "../../../ui/AlertStatusLine.tsx";
import { Button } from "../../../ui/Button.tsx";
import { EmptyState } from "../../../ui/EmptyState.tsx";
import { ErrorState } from "../../../ui/ErrorState.tsx";
import { Legend } from "../../../ui/Legend.tsx";
import { ScheduleCaption } from "../../../ui/ScheduleCaption.tsx";
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
function WalkHere({ stop, routeId }: { stop: StopDetail["stop"]; routeId?: string }) {
  const t = useT();
  const navigate = useNavigate();
  const { fix } = useLocation();
  const { walkPace } = usePrefs();
  const seed = fix ? estimateWalk(fix, stop, walkPace).distanceM : undefined;
  const { distanceM } = useWalkDistance(fix, stop.id, seed);
  const label = distanceM !== undefined ? t("common.walkHereMin", { min: t("time.min", { n: walkMinutes(distanceM, walkPace) }) }) : t("common.walkHere");
  return <Button variant="tonal" icon="directions_walk" label={label} onPress={() => navigate(walkUrl(stop.id, { d: distanceM, route: routeId }))} />;
}

function Loaded({ detail }: { detail: StopDetail }) {
  const t = useT();
  const now = useNow();
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
  useHalfUpTo(() => strip.current, foldCap, expanded ? servingKey(expanded) : "");

  return (
    <div className={styles.body}>
      {detail.transitCenter && (
        <Button
          variant="text"
          label={t("stop.partOfTc", { tc: detail.transitCenter.name })}
          href={`/explore/tc/${encodeURIComponent(detail.transitCenter.id)}`}
        />
      )}
      <div className={styles.pills}>
        <SaveButton stop={stop} routeId={expanded?.routeId} />
        <WalkHere stop={stop} routeId={expanded?.routeId} />
      </div>
      <hr className={styles.divider} />
      {expanded && (
        <ExpandedRoute
          key={servingKey(expanded)}
          stop={stop}
          entry={expanded}
          shared={serving.filter((s) => s.routeId === expanded.routeId).length > 1}
          mixed={departuresOf(expanded, arrivals)}
          stripRef={strip}
        />
      )}
      {/* After the strip, so the answer to "when does it come?" is on the first screen (A.1.2). */}
      <AlertStatusLine
        scope="stop"
        name={stop.name}
        alerts={alerts.forStop(
          stop.id,
          stop.routes.map((r) => r.id),
        )}
      />
      {others.length > 0 && (
        <ul className={styles.others} aria-label={t("stop.routes")}>
          {others.map((s) => (
            <li key={servingKey(s)}>
              <CollapsedRoute entry={s} deps={departuresOf(s, arrivals)} onExpand={() => expand(s.routeId)} />
            </li>
          ))}
        </ul>
      )}
      <Legend />
      <div className={styles.updated}>
        <UpdatedAgo at={updatedAt} onRefresh={() => void mixed.refetch()} />
        <ScheduleCaption />
      </div>
    </div>
  );
}

export default function StopSheet() {
  const t = useT();
  const lang = useLang();
  const back = useBack();
  const navigate = useNavigate();
  const { stopId = "" } = useParams();
  const stop = useStop(stopId);
  const { stops: recent } = useRecents();
  const { stops: saved } = useSaved();
  const known = stop.data?.stop.name ?? saved.find((s) => s.id === stopId)?.name ?? recent.find((s) => s.id === stopId)?.name;
  const title = known ? t("stopLine.title", { name: known, id: stopId }) : t("stop.fallbackTitle", { id: stopId });
  usePageTitle(title);
  useMapScene({ focus: { kind: "point", point: stop.data?.stop, zoom: STOP_ZOOM }, highlightStopId: stopId }, [stopId, Boolean(stop.data)]);

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
