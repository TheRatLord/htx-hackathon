import { upcoming } from "../lib/format.ts";
import { useNow } from "../state/clock.ts";
import type { Dep } from "../api/types.ts";
import styles from "./DepTimes.module.css";
import { TimeValue } from "./TimeValue.tsx";

/** Up to `max` upcoming departures as "16 min · 46 min", each with its status word (C.2 rule). */
export function DepTimes({ deps, max = 2, walkMin }: { deps: Dep[]; max?: number; walkMin?: number }) {
  const now = useNow();
  const shown = upcoming(deps, now).slice(0, max);
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
