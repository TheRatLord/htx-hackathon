// D7 Full Schedule (`/explore/stop/:stopId/schedule?route=`): today's hourly grid, as today,
// with passed hours greyed and the current hour marked "Now".

import { useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router";
import { useStop, useStopSchedule } from "../../../api/hooks.ts";
import { useBack } from "../../../app/useBack.ts";
import { usePageTitle } from "../../../app/usePageTitle.ts";
import { useLang, useT, type Lang } from "../../../i18n/index.ts";
import { headsignLine } from "../../../lib/format.ts";
import { canonicalRouteId, toRouteRef } from "../../../lib/routes.ts";
import { useNow } from "../../../state/clock.ts";
import { AppBar } from "../../../ui/AppBar.tsx";
import { EmptyState } from "../../../ui/EmptyState.tsx";
import { ErrorState } from "../../../ui/ErrorState.tsx";
import { RouteBadge } from "../../../ui/RouteBadge.tsx";
import { Skeleton } from "../../../ui/Skeleton.tsx";
import styles from "./FullSchedule.module.css";
import { formatDayTime, formatServiceDate } from "./when.ts";

const TIME_ZONE = "America/Chicago";

interface HourRow {
  /** Calendar date and hour in Houston, so 12 AM after midnight stays apart from 12 AM before. */
  key: string;
  label: string;
  minutes: string[];
  startMs: number;
}

const partsFormat = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

function hourKey(ms: number): { key: string; minute: string } {
  const p = Object.fromEntries(partsFormat.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { key: `${p.year}-${p.month}-${p.day} ${p.hour}`, minute: p.minute };
}

/** Departures in service-day order, grouped by clock hour ("7 PM": 05 35). */
function hourRows(departures: { departureTime: string }[], lang: Lang): HourRow[] {
  const hourLabel = new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", { timeZone: TIME_ZONE, hour: "numeric" });
  const rows: HourRow[] = [];
  for (const d of departures) {
    const ms = Date.parse(d.departureTime);
    const { key, minute } = hourKey(ms);
    let row = rows.at(-1);
    if (row?.key !== key) {
      row = { key, label: hourLabel.format(new Date(ms)), minutes: [], startMs: ms };
      rows.push(row);
    }
    row.minutes.push(minute);
  }
  return rows;
}

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
  usePageTitle(t("stop.schedule.title"));

  const rows = schedule.data ? hourRows(schedule.data.departures, lang) : [];
  const nowKey = hourKey(now).key;
  // The current hour, or the next hour with service when none runs now.
  const scrollKey = rows.find((r) => r.key === nowKey)?.key ?? rows.find((r) => r.startMs > now)?.key;
  useEffect(() => {
    current.current?.scrollIntoView({ block: "center" });
  }, [schedule.data]);

  const entry = stop.data?.serving.find((s) => s.routeId === routeId);
  const route = entry && toRouteRef({ id: entry.routeId, name: entry.name, color: entry.color, textColor: entry.textColor });
  const error = stop.error ?? schedule.error;

  return (
    <>
      <AppBar title={t("stop.schedule.title")} onBack={back} />
      <div className={styles.page}>
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
                <li key={r.key} ref={r.key === scrollKey ? current : undefined}className={[styles.hour, isNow && styles.now, passed && styles.passed].filter(Boolean).join(" ")}>
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
