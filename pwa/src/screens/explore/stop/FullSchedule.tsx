// D7 Full Schedule (`/explore/stop/:stopId/schedule?route=`): the hourly grid, as today, with
// Weekday / Saturday / Sunday (v2.71's service days). On today's tab passed hours are greyed, the
// current hour is marked "Now" and the next departure is bold.

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { useStop, useStopSchedule } from "../../../api/hooks.ts";
import { useBack } from "../../../app/useBack.ts";
import { usePageTitle } from "../../../app/usePageTitle.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { formatClock, formatDayTime, formatServiceDate, headsignLine } from "../../../lib/format.ts";
import { canonicalRouteId } from "../../../lib/routes.ts";
import { dayKindOf, serviceDayTabs, type DayKind } from "../../../lib/serviceDays.ts";
import { useNow } from "../../../state/clock.ts";
import { AppBar } from "../../../ui/AppBar.tsx";
import { EmptyState } from "../../../ui/EmptyState.tsx";
import { ErrorState } from "../../../ui/ErrorState.tsx";
import { RouteBadge } from "../../../ui/RouteBadge.tsx";
import { SegmentedControl } from "../../../ui/SegmentedControl.tsx";
import { Skeleton } from "../../../ui/Skeleton.tsx";
import styles from "./FullSchedule.module.css";
import { hourKey, hourRows } from "./hours.ts";
import { refOfServing } from "./refs.ts";

/** Space between the sticky header and the hour scrolled to. */
const SCROLL_GAP = 8;

export default function FullSchedule() {
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const back = useBack();
  const { stopId = "" } = useParams();
  const [params] = useSearchParams();
  // The stop's name and routes only: the times come from the schedule.
  const stop = useStop(stopId, { refetchInterval: false });
  const routeParam = params.get("route");
  const routeId = routeParam ? canonicalRouteId(routeParam) : stop.data?.serving[0]?.routeId;
  const today = useStopSchedule(stopId, routeId ?? "", { enabled: Boolean(routeId) });
  const todayDate = today.data?.serviceDate;
  const tabs = todayDate ? serviceDayTabs(todayDate) : undefined;
  const [kind, setKind] = useState<DayKind>();
  const shownKind = kind ?? (todayDate ? dayKindOf(todayDate) : "weekday");
  const date = tabs?.[shownKind];
  const isToday = !date || date === todayDate;
  const other = useStopSchedule(stopId, routeId ?? "", { enabled: Boolean(routeId && date && !isToday), date });
  const schedule = isToday ? today : other;
  const current = useRef<HTMLLIElement>(null);
  const header = useRef<HTMLDivElement>(null);
  usePageTitle(t("stop.schedule.title"));

  const rows = schedule.data ? hourRows(schedule.data.departures, lang) : [];
  const nowKey = isToday ? hourKey(now).key : "";
  // Today: the next departure, set bold so the rider's eye lands on it.
  const nextMs = isToday ? rows.flatMap((r) => r.times).find((ms) => ms >= now - 60_000) : undefined;
  // The current hour, or the next hour with service when none runs now.
  const scrollKey = isToday ? (rows.find((r) => r.key === nowKey)?.key ?? rows.find((r) => r.startMs > now)?.key) : undefined;
  // The header stays put (sticky), so only the grid moves and the current hour lands just under it.
  useEffect(() => {
    const row = current.current;
    if (!row) {
      // Another day: from its first trip.
      if (!isToday) window.scrollTo({ top: 0 });
      return;
    }
    row.style.scrollMarginTop = `${(header.current?.offsetHeight ?? 0) + SCROLL_GAP}px`;
    row.scrollIntoView({ block: "start" });
  }, [schedule.data, isToday]);

  const entry = stop.data?.serving.find((s) => s.routeId === routeId);
  const route = entry && refOfServing(entry);
  const error = stop.error ?? schedule.error;
  const next = schedule.data?.nextServiceFirst;

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
            {tabs && (
              <div className={styles.days}>
                <SegmentedControl<DayKind>
                  ariaLabel={t("serviceDay.label")}
                  value={shownKind}
                  onChange={setKind}
                  options={(["weekday", "saturday", "sunday"] as const).map((k) => ({ value: k, label: t(`serviceDay.${k}`) }))}
                />
              </div>
            )}
            {date && (
              <p className={styles.date}>
                {isToday ? t("stop.schedule.today", { date: formatServiceDate(date, lang) }) : formatServiceDate(date, lang)}
                {rows.length > 0 && <span className={styles.hint}> · {t("stop.schedule.hint")}</span>}
              </p>
            )}
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
            title={t(isToday ? "stop.schedule.empty" : "stop.schedule.emptyDay", { name: route?.name ?? routeParam ?? "" })}
            body={isToday && next ? t("stop.schedule.next", { when: next.serviceDate === schedule.data.serviceDate ? formatClock(next.departureTime, lang) : formatDayTime(next.departureTime, lang) }) : ""}
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
                  <span className={styles.label}>{r.label}</span>
                  <span className={styles.minutes}>
                    {r.minutes.map((m, i) => (
                      <span
                        key={i}
                        className={r.times[i] === nextMs ? styles.next : isNow && r.times[i] < now - 60_000 ? styles.gone : undefined}
                      >
                        {m}
                      </span>
                    ))}
                  </span>
                  {/* At the row's end, so the current hour is no taller than the others. */}
                  {isNow && <span className={styles.tag}>{t("stop.schedule.now")}</span>}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </>
  );
}
