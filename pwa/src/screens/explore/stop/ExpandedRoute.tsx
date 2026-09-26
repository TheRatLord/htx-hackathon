import { useState } from "react";
import { useNavigate } from "react-router";
import { useArrivals, useHealth, useStopSchedule } from "../../../api/hooks.ts";
import type { StopSummary } from "../../../api/types.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { headsignLine, upcoming } from "../../../lib/format.ts";
import { toRouteRef } from "../../../lib/routes.ts";
import { useNow } from "../../../state/clock.ts";
import { useOffline } from "../../../state/offline.ts";
import { Button } from "../../../ui/Button.tsx";
import { Icon } from "../../../ui/Icon.tsx";
import { LiveStrip } from "../../../ui/LiveStrip.tsx";
import { NotifyPermissionCard } from "../../../ui/NotifyPermissionCard.tsx";
import { RouteBadge } from "../../../ui/RouteBadge.tsx";
import { servingKey, type Serving } from "./serving.ts";
import styles from "./StopSheet.module.css";
import { useTrackStop } from "./useTrackStop.ts";
import { formatDayTime } from "./when.ts";

interface ExpandedRouteProps {
  stop: StopSummary;
  entry: Serving;
  /** Other patterns of the same route at this stop: then the strip keeps only this one's trips. */
  shared: boolean;
}

/** D6: the expanded route, as today: header row, Full Schedule / Track Bus Stop, the blue strip. */
export function ExpandedRoute({ stop, entry, shared }: ExpandedRouteProps) {
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const navigate = useNavigate();
  const offline = useOffline();
  const health = useHealth();
  const [tracking, setTracking] = useState(false);
  const route = toRouteRef({ id: entry.routeId, name: entry.name, color: entry.color, textColor: entry.textColor });
  const strip = useArrivals(stop.id, { route: entry.routeId, limit: 4 });
  const deps = (strip.data?.arrivals ?? []).filter((a) => !shared || servingKey(a) === servingKey(entry));
  const empty = Boolean(strip.data) && !upcoming(deps, now).length;
  const schedule = useStopSchedule(stop.id, entry.routeId, { enabled: empty });
  const next = schedule.data?.nextServiceFirst;
  const realtimeOn = health.data && (health.data.realtime.metroArrivalsApi || health.data.realtime.gtfsRtTripUpdates);
  const liveMissing = !offline && realtimeOn && strip.data && !strip.data.realtimeSources.length;
  const headline = headsignLine(route, entry.directionLabel, entry.headsign, lang);
  useTrackStop({ on: tracking, deps, routeName: entry.name, headsign: headline, stopName: stop.name });

  return (
    <section className={styles.expanded} aria-label={`${t("routeName.a11y", { name: entry.name })} ${headline}`}>
      <button
        type="button"
        className={styles.routeHeader}
        aria-label={`${t("stop.openRoute", { name: entry.name })}, ${headline}`}
        onClick={() => navigate(`/explore/route/${encodeURIComponent(entry.routeId)}?dir=${entry.directionId}&stop=${encodeURIComponent(stop.id)}`)}
      >
        <RouteBadge route={route} size="md" showIcon />
        <span className={styles.routeText}>
          <span className={styles.longName}>{entry.longName}</span>
          <span className={styles.headline}>{headline}</span>
        </span>
        <Icon name="chevron_right" />
      </button>
      <div className={styles.pills}>
        <Button
          variant="tonal"
          icon="calendar_month"
          label={t("stop.fullSchedule")}
          href={`/explore/stop/${encodeURIComponent(stop.id)}/schedule?route=${encodeURIComponent(entry.routeId)}`}
        />
        <Button
          variant="tonal"
          icon={tracking ? "notifications_active" : "notifications"}
          label={tracking ? t("stop.tracking", { name: entry.name }) : t("stop.track")}
          pressed={tracking}
          onPress={() => setTracking(!tracking)}
        />
      </div>
      {tracking && (
        <>
          <p className={styles.note}>{t("stop.trackNote")}</p>
          <NotifyPermissionCard context="stop-track" onDone={() => {}} />
        </>
      )}
      {liveMissing && <p className={styles.note}>{t("stop.liveUnavailable")}</p>}
      <div className={styles.bleed}>
        <LiveStrip
          deps={deps}
          loading={strip.isPending}
          emptyText={next ? t("strip.nextServiceFirst", { when: formatDayTime(next.departureTime, lang) }) : undefined}
        />
      </div>
    </section>
  );
}
