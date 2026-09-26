import { departureA11y, upcoming } from "../lib/format.ts";
import { useLang, useT } from "../i18n/index.ts";
import { useNow } from "../state/clock.ts";
import { useOffline } from "../state/offline.ts";
import styles from "./LiveStrip.module.css";
import { TimeValue } from "./TimeValue.tsx";
import type { LiveStripProps, StripFact } from "./types.ts";

const MAX_DEPS = 4;

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
  const shown = upcoming(deps, now).slice(0, MAX_DEPS);
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
