import { useT } from "../i18n/index.ts";
import { Icon } from "./Icon.tsx";
import { RouteBadge } from "./RouteBadge.tsx";
import { StatusWord } from "./StatusWord.tsx";
import styles from "./StepList.module.css";
import type { StepListProps, TimelineStep } from "./types.ts";

const MARKER: Record<TimelineStep["kind"], string> = {
  walk: styles.walk,
  board: `${styles.ride} ${styles.board}`,
  ride: styles.ride,
  alight: `${styles.ride} ${styles.alight}`,
  transfer: styles.transfer,
  arrive: styles.arrive,
};

/** C.13: the itinerary timeline. Every row is a button (walk → Walk, stop → Stop sheet, alert → detail). */
export function StepList({ steps, onStepPress, currentIndex }: StepListProps) {
  const t = useT();
  return (
    <ol className={styles.list}>
      {steps.map((s, i) => (
        <li key={i} className={styles.item}>
          <button type="button" className={styles.row} onClick={() => onStepPress(s, i)} aria-current={i === currentIndex ? "step" : undefined}>
            <span className={`${styles.rail} ${MARKER[s.kind]}`} style={s.route ? { ["--leg" as string]: s.route.color } : undefined} aria-hidden="true">
              {i === 0 && s.kind === "walk" ? <span className={styles.origin} /> : s.kind === "arrive" ? <Icon name="place" color="var(--c-dest-pin)" /> : <span className={styles.node} />}
            </span>
            <span className={styles.text}>
              {i === currentIndex && <span className={styles.here}>{t("timeline.youAreHere")}</span>}
              <span className={styles.title}>
                {s.kind === "walk" && <Icon name="directions_walk" size={20} />}
                {s.route && <RouteBadge route={s.route} size="sm" />}
                <span className={styles.titleText}>{s.title}</span>
              </span>
              {s.lines.map((l, j) => (
                <span key={j}>{l}</span>
              ))}
              {s.duration && <span className={styles.duration}>{s.duration}</span>}
            </span>
            {s.time && (
              <span className={styles.time}>
                <time>{s.time}</time>
                {s.status && <StatusWord status={s.status} />}
              </span>
            )}
            <Icon name="chevron_right" />
          </button>
        </li>
      ))}
    </ol>
  );
}
