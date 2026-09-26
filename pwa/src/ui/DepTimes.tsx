import { useT } from "../i18n/index.ts";
import { isFirstBus, rowUsesClock, upcoming } from "../lib/format.ts";
import { canMakeIt } from "../lib/walk.ts";
import { useNow } from "../state/clock.ts";
import { useOffline } from "../state/offline.ts";
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
 * One format per row: if any time is a clock time, all are ("1:05 PM · 2:02 PM"). The morning's
 * first bus, late at night, says so ("First bus" over "4:20 AM").
 */
export function DepTimes({ deps, max = 2, walkMin }: { deps: Dep[]; max?: number; walkMin?: number }) {
  const t = useT();
  const now = useNow();
  const offline = useOffline();
  const shown = shownDeps(deps, now, walkMin).slice(0, max);
  const clock = rowUsesClock(shown, now, offline);
  const first = shown.find((d) => !d.canceled);
  return (
    <span className={styles.times}>
      {first && isFirstBus(first.departureTime, now) && <span className={styles.lead}>{t("time.firstBus")}</span>}
      <span className={styles.line}>
        {shown.map((d) => (
          <span key={`${d.tripId}-${d.departureTime}`} className={styles.item}>
            <span className={styles.sep} aria-hidden="true">
              ·
            </span>
            <TimeValue dep={d} size="minutes" walkMin={walkMin} clock={clock} />
          </span>
        ))}
      </span>
    </span>
  );
}
