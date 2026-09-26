import { useEffect, useSyncExternalStore } from "react";
import { useLang, useT } from "../i18n/index.ts";
import { formatClock } from "../lib/format.ts";
import { useNow } from "../state/clock.ts";
import { useOffline } from "../state/offline.ts";
import styles from "./UpdatedAgo.module.css";
import type { UpdatedAgoProps } from "./types.ts";

// How many UpdatedAgo lines are on screen. While one is, it says "Offline · last update 12:07 PM"
// in the sheet, and the Explore layout drops its own offline banner over the map (one message, once).
let mounted = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** True while an UpdatedAgo line is showing (it carries the offline status then). */
export function useUpdatedAgoShown(): boolean {
  return useSyncExternalStore(subscribe, () => mounted > 0, () => false);
}

/** Past this, the data is visibly old. */
const STALE_S = 90;

/** C.15: "Updated just now · Refresh", "Updated 2 min ago · Refresh". Not a live region. Offline, "Refresh" reads "Try again". */
export function UpdatedAgo({ at, onRefresh, compact }: UpdatedAgoProps) {
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const offline = useOffline();
  useEffect(() => {
    mounted++;
    notify();
    return () => {
      mounted--;
      notify();
    };
  }, []);
  const ageS = Math.max(0, Math.round((now - Date.parse(at)) / 1000));
  const stale = !offline && ageS > STALE_S;
  let text: string;
  if (offline) text = t("updated.offline", { time: formatClock(at, lang) });
  else if (stale) text = t("updated.stale", { n: Math.floor(ageS / 60) });
  else {
    // Under a minute old it is simply "just now": seconds read as machine output.
    if (ageS < 60) text = t(compact ? "updated.justNowShort" : "updated.justNow");
    else {
      const ago = t("updated.min", { n: Math.floor(ageS / 60) });
      text = compact ? ago : t("updated.ago", { ago });
    }
  }
  return (
    <span className={`${styles.updated} ${stale ? styles.stale : ""}`}>
      {text}
      <span aria-hidden="true">·</span>
      <button type="button" className={styles.refresh} onClick={onRefresh}>
        {offline ? t("common.tryAgain") : t("common.refresh")}
      </button>
    </span>
  );
}
