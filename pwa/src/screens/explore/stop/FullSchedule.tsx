// D7 Full Schedule (`/explore/stop/:stopId/schedule?route=`): today's hourly grid, as today,
// with passed hours greyed and the current hour marked "Now".

import { useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router";
import { useStop, useStopSchedule } from "../../../api/hooks.ts";
import { useBack } from "../../../app/useBack.ts";
import { usePageTitle } from "../../../app/usePageTitle.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { headsignLine } from "../../../lib/format.ts";
import { canonicalRouteId } from "../../../lib/routes.ts";
import { useNow } from "../../../state/clock.ts";
import { AppBar } from "../../../ui/AppBar.tsx";
import { EmptyState } from "../../../ui/EmptyState.tsx";
import { ErrorState } from "../../../ui/ErrorState.tsx";
import { RouteBadge } from "../../../ui/RouteBadge.tsx";
import { Skeleton } from "../../../ui/Skeleton.tsx";
import styles from "./FullSchedule.module.css";
import { hourKey, hourRows } from "./hours.ts";
import { refOfServing } from "./refs.ts";
import { formatDayTime, formatServiceDate } from "./when.ts";

/** Space between the sticky header and the hour scrolled to. */
const SCROLL_GAP = 8;

export default function FullSchedule() {
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const back = useBack();
  const { stopId = "" } = useParams();
  const [params] = useSearchParams();
  const stop = useStop(stopId);
  const routeParam = params.get("route");
  const routeId = routeParam ? canonicalRouteId(routeParam) : stop.data?.serving[0]?.routeId;
  const schedule = useStopSchedule(stopId, routeId ?? "", { enabled: Boolean(routeId) });
  const current = useRef<HTMLLIElement>(null);
  const header = useRef<HTMLDivElement>(null);
  usePageTitle(t("stop.schedule.title"));

  const rows = schedule.data ? hourRows(schedule.data.departures, lang) : [];
  const nowKey = hourKey(now).key;
  // The current hour, or the next hour with service when none runs now.
  const scrollKey = rows.find((r) => r.key === nowKey)?.key ?? rows.find((r) => r.startMs > now)?.key;
  // The header stays put (sticky), so only the grid moves and the current hour lands just under it.
  useEffect(() => {
    const row = current.current;
    if (!row) return;
    row.style.scrollMarginTop = `${(header.current?.offsetHeight ?? 0) + SCROLL_GAP}px`;
    row.scrollIntoView({ block: "start" });
  }, [schedule.data]);

  const entry = stop.data?.serving.find((s) => s.routeId === routeId);
  const route = entry && refOfServing(entry);
  const error = stop.error ?? schedule.error;

  return (
    <>
      <div ref={header} className={styles.sticky}>
        <AppBar title={t("stop.schedule.title")} onBack={back} />
        {stop.data && (
          <div className={styles.head}>
            {route && entry && (
              <p className={styles.route}>
                <RouteBadge route={route} size="md" />
                <span className={styles.headline}>{headsignLine(route, entry.directionLabel, entry.headsign, lang)}</span>
              </p>
            )}
            <p>{t("stop.schedule.at", { stop: t("stopLine.title", { name: stop.data.stop.name, id: stopId }) })}</p>
            {schedule.data && <p className={styles.date}>{t("stop.schedule.today", { date: formatServiceDate(schedule.data.serviceDate, lang) })}</p>}
          </div>
        )}
      </div>
      <div className={styles.page}>
        {error ? (
          <ErrorState error={error} context={{ id: stopId }} onRetry={() => void (stop.error ? stop.refetch() : schedule.refetch())} />
        ) : !schedule.data ? (
          <>
            <Skeleton variant="row" />
            <Skeleton variant="row" />
            <Skeleton variant="row" />
          </>
        ) : !rows.length ? (
          <EmptyState
            icon="calendar_month"
            title={t("stop.schedule.empty", { name: route?.name ?? routeParam ?? "" })}
            body={schedule.data.nextServiceFirst ? t("stop.schedule.next", { when: formatDayTime(schedule.data.nextServiceFirst.departureTime, lang) }) : ""}
          />
        ) : (
          <ol className={styles.grid}>
            {rows.map((r) => {
              const isNow = r.key === nowKey;
              const passed = !isNow && r.startMs < now;
              return (
                <li
                  key={r.key}
                  ref={r.key === scrollKey ? current : undefined}
                  className={[styles.hour, isNow && styles.now, passed && styles.passed].filter(Boolean).join(" ")}
                >
                  <span className={styles.label}>
                    {r.label}
                    {isNow && <span className={styles.tag}>{t("stop.schedule.now")}</span>}
                  </span>
                  <span className={styles.minutes}>
                    {r.minutes.map((m, i) => (
                      <span key={i}>{m}</span>
                    ))}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </>
  );
}
