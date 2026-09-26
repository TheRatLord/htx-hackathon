import { useStopSchedule } from "../../../api/hooks.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { formatClock } from "../../../lib/format.ts";
import { useNow } from "../../../state/clock.ts";
import styles from "./StopSheet.module.css";

/** How many clock times follow the strip: about the next few hours of a half-hourly route. */
const LATER = 6;

interface LaterTodayProps {
  stopId: string;
  routeId: string;
  routeName: string;
  /** The strip's last time (ms): later times start after it, so none is shown twice. */
  afterMs: number;
}

/**
 * D6 full sheet: the expanded route's next scheduled times after the strip, as today's app shows
 * the timetable under the times (13: the full sheet was 250px of white under "Updated").
 */
export function LaterToday({ stopId, routeId, routeName, afterMs }: LaterTodayProps) {
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const schedule = useStopSchedule(stopId, routeId);
  const from = Math.max(afterMs, now);
  const later = (schedule.data?.departures ?? []).filter((d) => Date.parse(d.departureTime) > from).slice(0, LATER);
  if (!later.length) return null;
  const title = t("stop.laterToday", { name: routeName });
  return (
    <section className={styles.later} aria-label={title}>
      <h2 className={styles.othersHead}>{title}</h2>
      <ul className={styles.laterTimes}>
        {later.map((d) => (
          <li key={d.departureTime}>{formatClock(d.departureTime, lang)}</li>
        ))}
      </ul>
    </section>
  );
}
