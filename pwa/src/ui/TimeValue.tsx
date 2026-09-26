import { formatDeparture, statusOf } from "../lib/format.ts";
import { canMakeIt } from "../lib/walk.ts";
import { useLang, useT } from "../i18n/index.ts";
import { useNow } from "../state/clock.ts";
import { Icon } from "./Icon.tsx";
import { StatusWord } from "./StatusWord.tsx";
import styles from "./TimeValue.module.css";
import type { TimeValueProps } from "./types.ts";

/** Splits "16 min" into number and unit so the unit can be smaller. */
const splitUnit = (text: string) => text.match(/^(\d+)\s(.+)$/)?.slice(1) as [string, string] | undefined;

/**
 * C.2: one departure time from `departureTime` and the shared clock, with its status word.
 * Offline, every time is a scheduled clock time. With `walkMin`, a bus that leaves before the
 * rider can get there is greyed with "Leaves before you get there" (canceled wins).
 */
export function TimeValue({ dep, size, walkMin, offline }: TimeValueProps) {
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const status = offline ? "scheduled" : statusOf(dep);
  const text = formatDeparture(dep.departureTime, now, { offline, status, lang });
  const tooSoon = walkMin !== undefined && status !== "canceled" && canMakeIt(walkMin, dep, now) === "no";
  const realtime = !tooSoon && (status === "live" || status === "simulated");
  const parts = size === "strip" ? splitUnit(text) : undefined;
  const className = [styles.time, styles[size], styles[status], tooSoon && styles.tooSoon].filter(Boolean).join(" ");
  return (
    <span className={className}>
      <span className={styles.value}>
        <time dateTime={dep.departureTime}>
          {parts ? (
            <>
              {parts[0]}
              <span className={styles.unit}>{parts[1]}</span>
            </>
          ) : (
            text
          )}
        </time>
        {realtime && (
          <span className={styles.arcs}>
            <Icon name="live_arcs" size={16} />
          </span>
        )}
      </span>
      <span className={styles.word}>{tooSoon ? t("status.tooSoon") : <StatusWord status={status} />}</span>
    </span>
  );
}
