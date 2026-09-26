import { upcoming } from "../lib/format.ts";
import { useNow } from "../state/clock.ts";
import { useOnline } from "../state/online.ts";
import type { Dep } from "../api/types.ts";
import styles from "./DepTimes.module.css";
import { TimeValue } from "./TimeValue.tsx";

/** Up to `max` upcoming departures as "16 min · 46 min", each with its status word (C.2 rule). */
export function DepTimes({ deps, max = 2, walkMin }: { deps: Dep[]; max?: number; walkMin?: number }) {
  const now = useNow();
  const offline = !useOnline();
  const shown = upcoming(deps, now).slice(0, max);
  return (
    <span className={styles.times}>
      {shown.map((d, i) => (
        <span key={`${d.tripId}-${d.departureTime}`} className={styles.item}>
          {i > 0 && (
            <span className={styles.sep} aria-hidden="true">
              ·
            </span>
          )}
          <TimeValue dep={d} size="minutes" walkMin={walkMin} offline={offline} />
        </span>
      ))}
    </span>
  );
}
