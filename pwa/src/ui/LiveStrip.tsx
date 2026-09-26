import { formatDeparture, statusOf, upcoming } from "../lib/format.ts";
import { useLang, useT } from "../i18n/index.ts";
import { useNow } from "../state/clock.ts";
import styles from "./LiveStrip.module.css";
import { TimeValue } from "./TimeValue.tsx";
import type { LiveStripProps } from "./types.ts";

const MAX_DEPS = 4;

/** C.3: the blue live-minutes strip. Not a live region: polling never re-announces. */
export function LiveStrip({ deps, loading, emptyText, offline }: LiveStripProps) {
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const shown = upcoming(deps, now).slice(0, MAX_DEPS);
  if (loading) {
    return (
      <div className={styles.strip} aria-busy="true" aria-label={t("common.loading")}>
        <span className={styles.placeholder}>– – min</span>
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
      {shown.map((d) => {
        const status = offline ? "scheduled" : statusOf(d);
        const value = formatDeparture(d.departureTime, now, { offline, status, lang });
        return (
          <li key={`${d.tripId}-${d.departureTime}`} className={styles.item} aria-label={t("strip.itemA11y", { value, status: t(`status.${status}`) })}>
            <span aria-hidden="true">
              <TimeValue dep={d} size="strip" offline={offline} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
