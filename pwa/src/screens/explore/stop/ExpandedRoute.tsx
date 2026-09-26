import { useState, type ReactNode, type RefObject } from "react";
import { useNavigate } from "react-router";
import { useArrivals, useHealth, useStopSchedule } from "../../../api/hooks.ts";
import type { Arrival, StopSummary } from "../../../api/types.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { headsignLine, upcoming } from "../../../lib/format.ts";
import { useNow } from "../../../state/clock.ts";
import { useOffline } from "../../../state/offline.ts";
import { Button } from "../../../ui/Button.tsx";
import { Icon } from "../../../ui/Icon.tsx";
import { LiveStrip } from "../../../ui/LiveStrip.tsx";
import { NotifyPermissionCard } from "../../../ui/NotifyPermissionCard.tsx";
import { RouteBadge } from "../../../ui/RouteBadge.tsx";
import { keepHeadsign, refOfServing } from "./refs.ts";
import { servingKey, type Serving } from "./serving.ts";
import styles from "./StopSheet.module.css";
import { useTrackStop } from "./useTrackStop.ts";

interface ExpandedRouteProps {
  stop: StopSummary;
  entry: Serving;
  /** Other patterns of the same route at this stop: then the strip keeps only this one's trips. */
  shared: boolean;
  /** This pattern's trips among the stop's mixed arrivals, for when the other pattern fills the strip call. */
  mixed: Arrival[];
  /** The row under the strip: the half sheet grows until it (and so the strip) is visible, within the fold cap (A.1.2). */
  stripRef: RefObject<HTMLDivElement | null>;
  /** The stop's own actions (Save, Walk here), right under the strip: walking there is the next thing a rider does. */
  stopActions?: ReactNode;
}

/** D6: the expanded route: header row, the blue strip (the answer, first), the stop's Walk here / Save, then Schedule / Track. */
export function ExpandedRoute({ stop, entry, shared, mixed, stripRef, stopActions }: ExpandedRouteProps) {
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const navigate = useNavigate();
  const offline = useOffline();
  const health = useHealth();
  const [tracking, setTracking] = useState(false);
  const route = refOfServing(entry);
  // A shared route's 4 soonest trips can all belong to its other pattern: ask for more.
  const strip = useArrivals(stop.id, { route: entry.routeId, limit: shared ? 8 : 4 });
  const all = strip.data?.arrivals ?? [];
  const own = shared ? all.filter((a) => servingKey(a) === servingKey(entry)) : all;
  const deps = own.length ? own : mixed;
  // "No buses" is claimed only when the route has none at all; otherwise the other pattern crowded this one out.
  const routeEmpty = Boolean(strip.data) && !upcoming(all, now).length;
  const crowdedOut = Boolean(strip.data) && !routeEmpty && !upcoming(deps, now).length;
  const schedule = useStopSchedule(stop.id, entry.routeId, { enabled: routeEmpty });
  const next = schedule.data?.nextServiceFirst;
  const realtimeOn = health.data && (health.data.realtime.metroArrivalsApi || health.data.realtime.gtfsRtTripUpdates);
  const liveMissing = !offline && realtimeOn && strip.data && !strip.data.realtimeSources.length;
  const headline = headsignLine(route, entry.directionLabel, entry.headsign, lang);
  useTrackStop({ on: tracking, deps, routeName: entry.name, headsign: headline, stopName: stop.name });

  const emptyText = crowdedOut ? t("stop.crowdedOut", { headsign: entry.headsign }) : undefined;
  // The next trip after now: later today when one remains (late night), else the next service day.
  const nextService = !crowdedOut && next && schedule.data ? { departureTime: next.departureTime, today: next.serviceDate === schedule.data.serviceDate } : undefined;

  return (
    <section className={styles.expanded} aria-label={`${t("routeName.a11y", { name: entry.name })} ${headline}`}>
      <button
        type="button"
        className={styles.routeHeader}
        aria-label={`${t("stop.openRoute", { name: entry.name })}, ${headline}`}
        onClick={() => navigate(`/explore/route/${encodeURIComponent(entry.routeId)}?dir=${entry.directionId}&stop=${encodeURIComponent(stop.id)}`)}
      >
        <RouteBadge route={route} size="sm" showIcon />
        <span className={styles.routeText}>
          <span className={styles.longName}>{entry.longName}</span>
          <span className={styles.headline}>{keepHeadsign(headline, entry.headsign)}</span>
        </span>
        <Icon name="chevron_right" />
      </button>
      <div className={styles.bleed}>
        {strip.isError && !strip.data ? (
          <div className={styles.stripError}>
            <p>{t("stop.stripError")}</p>
            <Button variant="text" label={t("common.tryAgain")} onPress={() => void strip.refetch()} />
          </div>
        ) : (
          <LiveStrip deps={deps} loading={strip.isPending} emptyText={emptyText} nextService={nextService} />
        )}
      </div>
      {liveMissing && <p className={styles.note}>{t("stop.liveUnavailable")}</p>}
      {stopActions}
      <div ref={stripRef} className={styles.routePills}>
        <Button
          variant="tonal"
          icon="calendar_month"
          label={t("stop.fullSchedule")}
          href={`/explore/stop/${encodeURIComponent(stop.id)}/schedule?route=${encodeURIComponent(entry.routeId)}`}
        />
        <Button
          variant="tonal"
          icon={tracking ? "notifications_active" : "notifications"}
          label={tracking ? t("stop.tracking") : t("stop.track")}
          ariaLabel={tracking ? t("stop.trackingA11y", { name: entry.name }) : undefined}
          onPress={() => setTracking(!tracking)}
        />
      </div>
      {tracking && (
        <>
          <p className={styles.note}>{t("stop.trackNote")}</p>
          <NotifyPermissionCard context="stop-track" />
        </>
      )}
    </section>
  );
}
