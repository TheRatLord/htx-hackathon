import { upcoming } from "../lib/format.ts";
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
 */
export function DepTimes({ deps, max = 2, walkMin }: { deps: Dep[]; max?: number; walkMin?: number }) {
  const now = useNow();
  const shown = shownDeps(deps, now, walkMin).slice(0, max);
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
