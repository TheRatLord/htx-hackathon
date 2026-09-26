import type { Dep } from "../api/types.ts";
import { departureA11y, showsClock, upcoming } from "../lib/format.ts";
import { useLang, useT } from "../i18n/index.ts";
import { useNow } from "../state/clock.ts";
import { useOffline } from "../state/offline.ts";
import styles from "./LiveStrip.module.css";
import { TimeValue } from "./TimeValue.tsx";
import type { LiveStripProps, StripFact } from "./types.ts";

/** Three minute values fit one row at 360dp. */
const MAX_DEPS = 3;
/** Clock times ("12:19 AM") are twice as wide. */
const MAX_CLOCKS = 2;

/**
 * The departures that fit: minute values after the first departure, so a far-off clock time
 * never pushes the strip onto a second row; when every time is a clock time (offline, late
 * night), the first two.
 */
function stripDeps(deps: Dep[], now: number, offline: boolean): Dep[] {
  const next = upcoming(deps, now).slice(0, MAX_DEPS);
  if (next.every((d) => showsClock(d, now, offline))) return next.slice(0, MAX_CLOCKS);
  return next.filter((d, i) => i === 0 || !showsClock(d, now, offline));
}

/** The strip's look with facts instead of times: "**5** stops left · about **7** min" (D13 ride step). */
export function FactStrip({ facts }: { facts: StripFact[] }) {
  return (
    <p className={`${styles.strip} ${styles.facts}`}>
      {facts.map((f, i) => (
        <span key={i}>
          {f.lead && `${f.lead} `}
          <span className={styles.digits}>{f.value}</span> {f.unit}
        </span>
      ))}
    </p>
  );
}

/** C.3: the blue live-minutes strip. Not a live region: polling never re-announces. */
export function LiveStrip({ deps, loading, emptyText }: LiveStripProps) {
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const offline = useOffline();
  const shown = stripDeps(deps, now, offline);
  if (loading) {
    return (
      <div className={styles.strip} aria-busy="true" aria-label={t("common.loading")}>
        <span className={styles.placeholder}>{t("strip.loading")}</span>
      </div>
    );
  }
  if (!shown.length) {
    return (
      <div className={styles.strip}>
        <p className={styles.empty}>{emptyText ?? t("strip.noBuses3h")}</p>
      </div>
    );
  }
  return (
    <ul className={styles.strip} aria-label={t("strip.label")}>
      {shown.map((d) => (
        <li
          key={`${d.tripId}-${d.departureTime}`}
          className={styles.item}
          aria-label={departureA11y(d, now, { offline, markScheduled: true, lang })}
        >
          <span aria-hidden="true">
            <TimeValue dep={d} size="strip" />
          </span>
        </li>
      ))}
    </ul>
  );
}
