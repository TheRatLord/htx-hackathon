import { useLang, useT } from "../i18n/index.ts";
import { departureView } from "../lib/format.ts";
import { useNow } from "../state/clock.ts";
import { useOffline } from "../state/offline.ts";
import { Icon } from "./Icon.tsx";
import { StatusWord } from "./StatusWord.tsx";
import styles from "./TimeValue.module.css";
import type { TimeValueProps } from "./types.ts";

/**
 * Splits "16 min" into number and unit, and "1:23 PM" into clock and day half, so the unit can be
 * smaller: four times then fit on the strip at 412dp, as on today's app.
 */
const splitUnit = (text: string) => text.match(/^([\d:]+)\s(.+)$/)?.slice(1) as [string, string] | undefined;
/** Off the strip only a clock time is split ("12:07" and a small "PM"): "16 min" stays one size. */
const splitClock = (text: string) => (text.includes(":") ? splitUnit(text) : undefined);

/**
 * C.2: one departure time from `departureTime` and the shared clock, with its status word.
 * Offline, every time is a scheduled clock time. With `walkMin`, a bus that leaves before the
 * rider can get there is greyed with "Leaves before you get there" (canceled wins).
 */
export function TimeValue({ dep, size, walkMin, clock }: TimeValueProps) {
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const offline = useOffline();
  const { status, text, tooSoon } = departureView(dep, now, { walkMin, offline, clock, lang });
  const realtime = !tooSoon && (status === "live" || status === "simulated");
  // A small "PM" keeps a row of clock times as narrow as one of minutes (38, offline).
  const parts = size === "strip" ? splitUnit(text) : splitClock(text);
  const className = [styles.time, styles[size], styles[status], tooSoon && styles.tooSoon].filter(Boolean).join(" ");
  // After the number (C.2), or on the blue strip after the word "Live" (C.3).
  const arcs = (
    <span className={styles.arcs}>
      <Icon name="live_arcs" size={16} />
    </span>
  );
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
        {realtime && size !== "strip" && arcs}
      </span>
      <span className={styles.word}>
        {tooSoon ? t("status.tooSoon") : <StatusWord status={status} />}
        {realtime && size === "strip" && arcs}
      </span>
    </span>
  );
}
