import { useT } from "../i18n/index.ts";
import { Icon } from "./Icon.tsx";
import styles from "./Legend.module.css";

/** C.4: today's Scheduled / Live / Canceled legend, on the Stop sheet only. */
export function Legend() {
  const t = useT();
  const sample = t("legend.sample");
  return (
    <ul className={styles.legend} aria-label={t("legend.label")}>
      <li className={styles.item}>
        <span className={styles.chip}>{sample}</span>
        {t("status.scheduled")}
      </li>
      <li className={styles.item}>
        <span className={`${styles.chip} ${styles.live}`}>
          {sample}
          <Icon name="live_arcs" size={16} color="var(--c-live-icon)" />
        </span>
        {t("status.live")}
      </li>
      <li className={styles.item}>
        <span className={`${styles.chip} ${styles.canceled}`}>{sample}</span>
        {t("status.canceled")}
      </li>
    </ul>
  );
}
