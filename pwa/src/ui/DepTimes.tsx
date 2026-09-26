import { useT } from "../i18n/index.ts";
import { formatDuration, isFirstBus, upcoming } from "../lib/format.ts";
import { canMakeIt } from "../lib/walk.ts";
import { useNow } from "../state/clock.ts";
import type { Dep } from "../api/types.ts";
import styles from "./DepTimes.module.css";
import { TimeValue } from "./TimeValue.tsx";

/** The departures DepTimes lists, in order (also for a card's spoken summary). */
export function shownDeps<T extends Dep>(deps: T[], now: number, walkMin?: number): T[] {
  const next = upcoming(deps, now);
  const catchable = walkMin === undefined ? next : next.filter((d) => d.canceled || canMakeIt(walkMin, d, now) !== "no");
  return catchable.some((d) => !d.canceled) ? catchable : next;
}

/**
 * Up to `max` upcoming departures as "16 min · 46 min", each with its status word (C.2 rule).
 * With `walkMin`, buses that leave before the rider can walk there are left out, so the first
 * big number is one they can catch (a greyed "3 min" first still read as the answer). Only when
 * every listed bus is too soon are they shown, greyed with "Leaves before you get there".
 * The one time rule, per time as on the strip: minutes under an hour, the clock time after
 * ("2 min · 1:02 PM"); offline, clock times. The morning's first bus, late at night, is the same
 * big time with a grey line under it saying so and how long that is: "4:20 AM" / "First bus · in 1 hr 50 min".
 */
export function DepTimes({ deps, max = 2, walkMin, firstBus }: { deps: Dep[]; max?: number; walkMin?: number; firstBus?: boolean }) {
  const t = useT();
  const now = useNow();
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
  return (
    <span className={styles.times}>
      <span className={styles.line}>
        {shown.map((d) => (
          <span key={`${d.tripId}-${d.departureTime}`} className={styles.item}>
            <span className={styles.sep} aria-hidden="true">
              ·
            </span>
            <TimeValue dep={d} size="minutes" walkMin={walkMin} />
          </span>
        ))}
      </span>
    </span>
  );
}
