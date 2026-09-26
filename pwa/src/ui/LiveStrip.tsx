import { useLayoutEffect, useRef, type RefObject } from "react";
import { departureA11y, formatClock, formatDayTime, formatDuration, upcoming } from "../lib/format.ts";
import { useLang, useT } from "../i18n/index.ts";
import { useNow } from "../state/clock.ts";
import { useOffline } from "../state/offline.ts";
import styles from "./LiveStrip.module.css";
import { TimeValue } from "./TimeValue.tsx";
import type { LiveStripProps, StripFact } from "./types.ts";

/** Up to four times, as today's strip; those that don't fit on its one row are hidden (see useOneRow). */
const MAX_DEPS = 4;

/**
 * Hides the items that wrapped onto a second row, after every render and resize: the strip stays
 * one row at any width and text size, showing as many times as fit (two clock times at 360dp,
 * four minute values at 412dp). Items are unhidden, measured and re-hidden in one layout pass.
 */
function useOneRow(list: RefObject<HTMLUListElement | null>) {
  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    const fit = () => {
      const items = Array.from(el.children) as HTMLElement[];
      items.forEach((li) => (li.hidden = false));
      const top = items[0]?.offsetTop ?? 0;
      items.forEach((li, i) => (li.hidden = i > 0 && li.offsetTop > top));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  });
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

/**
 * C.3: the blue live-minutes strip. Not a live region: polling never re-announces. With nothing
 * in the window and `nextService` known, the next bus is still the big number: "5:47 AM" over
 * "First bus · in 3 hr 17 min" (today) or "No more trips today · Sun" (a later day).
 */
export function LiveStrip({ deps, loading, emptyText, nextService }: LiveStripProps) {
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const offline = useOffline();
  const list = useRef<HTMLUListElement>(null);
  const shown = upcoming(deps, now).slice(0, MAX_DEPS);
  useOneRow(list);
  if (loading) {
    return (
      <div className={styles.strip} aria-busy="true" aria-label={t("common.loading")}>
        <span className={styles.placeholder}>{t("strip.loading")}</span>
      </div>
    );
  }
  if (!shown.length && nextService && Date.parse(nextService.departureTime) > now) {
    const mins = Math.round((Date.parse(nextService.departureTime) - now) / 60_000);
    const caption = nextService.today
      ? t("strip.firstBusIn", { in: formatDuration(mins, t) })
      : t("strip.noMoreToday", { day: formatDayTime(nextService.departureTime, lang).split(" ")[0] });
    return (
      <div className={styles.strip}>
        <p className={styles.next}>
          <span className={styles.digits}>{formatClock(nextService.departureTime, lang)}</span>
          <span className={styles.nextCaption}>{caption}</span>
        </p>
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
    <ul ref={list} className={`${styles.strip} ${styles.oneRow}`} aria-label={t("strip.label")}>
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
