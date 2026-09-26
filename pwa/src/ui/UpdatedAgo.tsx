import { useEffect, useSyncExternalStore } from "react";
import { useLang, useT } from "../i18n/index.ts";
import { ageMinutes, formatClock } from "../lib/format.ts";
import { useNow } from "../state/clock.ts";
import { useOffline } from "../state/offline.ts";
import { Icon } from "./Icon.tsx";
import styles from "./UpdatedAgo.module.css";
import type { UpdatedAgoProps } from "./types.ts";
import { createSignal } from "../lib/signal.ts";

// How many sheet-header UpdatedAgo lines (`compact`) are on screen. While one is, it says "Offline —
// times from 12:07 PM" at the top of the sheet, and the Explore layout drops its own offline banner
// over the map (one message, once). A line at the foot of a sheet (the stop sheet) is below the
// fold, so the map banner stays.
let mounted = 0;
const { subscribe, notify } = createSignal();

/** True while an UpdatedAgo line is showing (it carries the offline status then). */
export function useUpdatedAgoShown(): boolean {
  return useSyncExternalStore(subscribe, () => mounted > 0, () => false);
}

/** Past this, the data is visibly old. */
const STALE_S = 90;

/**
 * C.15: "Updated just now · Refresh", "Updated 2 min ago · Refresh"; `compact` (a sheet's title
 * row), the same words stacked in one 48dp button, "Updated just now" over "↻ Refresh", so they fit
 * beside the title at 360dp in every language. Not a live region. Offline, "Refresh" reads "Try again".
 */
export function UpdatedAgo({ at, onRefresh, compact }: UpdatedAgoProps) {
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const offline = useOffline();
  useEffect(() => {
    if (!compact) return;
    mounted++;
    notify();
    return () => {
      mounted--;
      notify();
    };
  }, [compact]);
  const atMs = Date.parse(at);
  // No real fetch time yet (placeholder data keeps `dataUpdatedAt` at 0): say nothing rather than
  // "Not updated for 29,000,000 min" or "times from 6:00 PM" (the 1970 epoch).
  if (!(atMs > 0)) return null;
  const ageS = Math.max(0, Math.round((now - atMs) / 1000));
  const stale = !offline && ageS > STALE_S;
  let text: string;
  // The clock time never breaks across lines ("12:11 / PM").
  if (offline) text = t("updated.offline", { time: formatClock(at, lang).replace(/\s/g, "\u00a0") });
  else if (stale) text = t("updated.stale", { n: ageMinutes(atMs, now) });
  else {
    // Under a minute old it is simply "just now": seconds read as machine output.
    if (ageS < 60) text = t("updated.justNow");
    else text = t("updated.ago", { ago: t("updated.min", { n: ageMinutes(atMs, now) }) });
  }
  if (offline) {
    // Times may be stale: an amber row with an icon, not grey small print a rider would miss.
    return (
      <span className={`${styles.updated} ${styles.offline}`} data-offline="">
        <Icon name="warning" size={20} color="var(--c-warn-border)" />
        <strong className={styles.offlineText}>{text}</strong>
        <button type="button" className={styles.refresh} onClick={onRefresh}>
          {t("common.tryAgain")}
        </button>
      </span>
    );
  }
  // In a sheet's title row: "Updated just now" over "↻ Refresh", one button. "Just now" alone read
  // as a status, not a way to refresh; "Ahora · Actualizar" on one line took a row of its own at 360.
  if (compact) {
    return (
      <span className={`${styles.updated} ${stale ? styles.stale : ""}`} data-compact-updated="">
        <button type="button" className={`${styles.refresh} ${styles.compact}`} aria-label={`${t("common.refresh")}. ${text}`} onClick={onRefresh}>
          <span className={styles.compactAge}>{text}</span>
          <span className={styles.compactAction}>
            <Icon name="refresh" size={16} />
            {t("common.refresh")}
          </span>
        </button>
      </span>
    );
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
