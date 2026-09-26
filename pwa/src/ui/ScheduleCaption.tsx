import { useT } from "../i18n/index.ts";
import { useOffline } from "../state/offline.ts";
import styles from "./ScheduleCaption.module.css";

/** C.2: the one-per-sheet caption that makes "scheduled" the unmarked default. */
export function ScheduleCaption() {
  const t = useT();
  if (useOffline()) return <p className={styles.caption}>{t("schedule.offline")}</p>;
  return (
    <p className={styles.caption}>
      {t("schedule.captionBefore")} <span className={styles.live}>{t("status.live")}</span>
    </p>
  );
}
