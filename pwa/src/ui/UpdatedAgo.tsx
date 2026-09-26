import { useLang, useT } from "../i18n/index.ts";
import { formatClock } from "../lib/format.ts";
import { useNow } from "../state/clock.ts";
import { useOffline } from "../state/offline.ts";
import styles from "./UpdatedAgo.module.css";
import type { UpdatedAgoProps } from "./types.ts";

/** Past this, the data is visibly old. */
const STALE_S = 90;

/** C.15: "Updated 8 sec ago · Refresh". Not a live region. */
export function UpdatedAgo({ at, onRefresh, compact }: UpdatedAgoProps) {
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const offline = useOffline();
  const ageS = Math.max(0, Math.round((now - Date.parse(at)) / 1000));
  const stale = !offline && ageS > STALE_S;
  let text: string;
  if (offline) text = t("updated.offline", { time: formatClock(at, lang) });
  else if (stale) text = t("updated.stale", { n: Math.floor(ageS / 60) });
  else {
    const ago = ageS < 60 ? t("updated.sec", { n: ageS }) : t("updated.min", { n: Math.floor(ageS / 60) });
    text = compact ? ago : t("updated.ago", { ago });
  }
  return (
    <span className={`${styles.updated} ${stale ? styles.stale : ""}`}>
      {text}
      <span aria-hidden="true">·</span>
      <button type="button" className={styles.refresh} onClick={onRefresh}>
        {t("common.refresh")}
      </button>
    </span>
  );
}
