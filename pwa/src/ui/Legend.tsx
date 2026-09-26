import { useT } from "../i18n/index.ts";
import { Icon } from "./Icon.tsx";
import styles from "./Legend.module.css";

export interface LegendProps {
  /**
   * The time styles on screen besides Scheduled. Given, the legend explains only those, and is
   * left out when there are none: a Live / Canceled key under a sheet of scheduled times explained
   * a visual language the rider never saw there (13, round 4). Omitted, all three show.
   */
  present?: ("live" | "canceled")[];
}

/** C.4: today's Scheduled / Live / Canceled legend, on the Stop sheet only. */
export function Legend({ present }: LegendProps) {
  const t = useT();
  if (present && present.length === 0) return null;
  const shows = (kind: "live" | "canceled") => !present || present.includes(kind);
  const sample = t("legend.sample");
  return (
    <ul className={styles.legend} aria-label={t("legend.label")}>
      <li className={styles.item}>
        <span className={styles.chip}>{sample}</span>
        {t("status.scheduled")}
      </li>
      {shows("live") && (
        <li className={styles.item}>
          {/* As a live time looks on the strip: the arcs beside the number, with the word "Live" in
              white (the pale green word was hard to read on the blue for riders with cataracts). */}
          <span className={`${styles.chip} ${styles.live}`}>
            {sample}
            <span className={styles.liveWord}>
              <Icon name="live_arcs" size={16} color="var(--c-live-on-strip)" />
              {t("status.live")}
            </span>
          </span>
        </li>
      )}
      {shows("canceled") && (
        <li className={styles.item}>
          <span className={`${styles.chip} ${styles.canceled}`}>{sample}</span>
          {t("status.canceled")}
        </li>
      )}
    </ul>
  );
}
