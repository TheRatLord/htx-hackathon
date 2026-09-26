import { useLang, useT } from "../i18n/index.ts";
import { formatDeparture, formatDuration, isFirstBus, statusOf, upcoming } from "../lib/format.ts";
import { useOffline } from "../state/offline.ts";
import { canMakeIt } from "../lib/walk.ts";
import { useNow } from "../state/clock.ts";
import type { Dep } from "../api/types.ts";
import styles from "./DepTimes.module.css";
import { TimeValue } from "./TimeValue.tsx";

/** The rider's first catchable departures (TransitCenterCard orders its rows by them). */
export function catchableDeps<T extends Dep>(deps: T[], now: number, walkMin?: number): T[] {
  const next = upcoming(deps, now);
  const catchable = walkMin === undefined ? next : next.filter((d) => d.canceled || canMakeIt(walkMin, d, now) !== "no");
  return catchable.some((d) => !d.canceled) ? catchable : next;
}

/**
 * The departures DepTimes lists, in order (also for a card's spoken summary). A bus the rider
 * can't walk to in time stays in the row, greyed with "Leaves before you get there": left out,
 * Home said "9 min · 17 min" for a stop whose next bus the stop sheet, the route and Recent all
 * showed as "1 min", and a rider already at the stop missed it (03). Only the last such bus
 * stays (the one just before the first they can catch); earlier ones are gone by the time they get there.
 */
export function shownDeps<T extends Dep>(deps: T[], now: number, walkMin?: number): T[] {
  const next = upcoming(deps, now);
  if (walkMin === undefined) return next;
  const firstOk = next.findIndex((d) => !d.canceled && canMakeIt(walkMin, d, now) !== "no");
  if (firstOk <= 0) return next;
  let from = firstOk - 1;
  while (from > 0 && next[from].canceled) from--;
  return next.slice(from);
}

/**
 * Up to `max` upcoming departures as "16 min · 46 min", each with its status word (C.2 rule).
 * With `walkMin`, a bus that leaves before the rider can walk there is greyed with "Leaves before
 * you get there" (shownDeps). Offline, clock times. The morning's first bus, late at night, is the same
 * big time with a grey line under it saying so and how long that is: "4:20 AM" / "First bus · in 1 hr 50 min".
 */
export function DepTimes({ deps, max = 2, walkMin, firstBus }: { deps: Dep[]; max?: number; walkMin?: number; firstBus?: boolean }) {
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const offline = useOffline();
  const shown = shownDeps(deps, now, walkMin).slice(0, max);
  const first = shown.find((d) => !d.canceled);
  // `firstBus`: the route's next bus after a gap (NearbyStopCard's late-night rows) says "First bus" by day too.
  const early = first && isFirstBus(first.departureTime, now);
  if (first && (early || (firstBus && Date.parse(first.departureTime) - now >= 60 * 60_000))) {
    const mins = Math.round((Date.parse(first.departureTime) - now) / 60_000);
    return (
      <span className={`${styles.times} ${styles.firstBus}`}>
        <TimeValue dep={first} size="minutes" walkMin={walkMin} />
        <span className={styles.lead}>
          {t(early ? "time.firstBus" : "time.nextBus")} {t("time.inDuration", { in: formatDuration(mins, t) })}
        </span>
      </span>
    );
  }
  // A bus the rider can't reach, ahead of one they can: "1 min · 9 min" with the 1 greyed, and one
  // grey line under the row naming it ("The 1 min bus leaves before you get there"). The words
  // beside the "1 min" pushed "9 min" to a third line, below the fold at Extra large.
  const lead = walkMin !== undefined && shown.length > 1 && !shown[0].canceled && canMakeIt(walkMin, shown[0], now) === "no" && shown.slice(1).some((d) => !d.canceled && canMakeIt(walkMin, d, now) !== "no") ? shown[0] : undefined;
  return (
    <span className={styles.times}>
      <span className={styles.line}>
        {shown.map((d) => (
          <span key={`${d.tripId}-${d.departureTime}`} className={styles.item}>
            <span className={styles.sep} aria-hidden="true">
              ·
            </span>
            <TimeValue dep={d} size="minutes" walkMin={walkMin} noWord={d === lead} />
          </span>
        ))}
      </span>
      {lead && <span className={styles.tooSoonLine}>{t("status.tooSoonLead", { time: formatDeparture(lead.departureTime, now, { offline, status: offline ? "scheduled" : statusOf(lead), lang }) })}</span>}
    </span>
  );
}
