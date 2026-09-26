import { useT } from "../i18n/index.ts";
import { isAdvisory } from "../lib/alerts.ts";
import { DemoTag } from "./DemoTag.tsx";
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
        <li key={i} className={`${styles.item} ${s.alert ? styles.alertRow : ""}`}>
          <button type="button" className={styles.row} onClick={() => onStepPress(s, i)} aria-current={i === currentIndex ? "step" : undefined}>
            <span
              className={[styles.rail, MARKER[s.kind], i === currentIndex && styles.belowHere, steps[i - 1]?.kind === "walk" && styles.afterWalk].filter(Boolean).join(" ")}
              style={s.legColor || s.route ? { ["--leg" as string]: s.legColor ?? s.route?.color } : undefined}
              aria-hidden="true"
            >
              {i === 0 && s.kind === "walk" ? (
                <span className={styles.origin} />
              ) : s.kind === "arrive" ? (
                <Icon name="place" color="var(--c-dest-pin)" />
              ) : (
                !s.alert && <span className={styles.node} />
              )}
            </span>
            <span className={styles.text}>
              {i === currentIndex && <span className={styles.here}>{t("timeline.youAreHere")}</span>}
              <span className={`${styles.title} ${s.route ? styles.withRoute : ""}`}>
                {s.kind === "walk" && <Icon name="directions_walk" size={20} />}
                {s.alert &&
                  (isAdvisory(s.alert.effect) ? (
                    <Icon name="info" size={20} color="var(--c-brand-navy)" />
                  ) : (
                    <Icon name="warning" size={20} color="var(--c-alert-icon)" />
                  ))}
                {s.titleLead && <span className={styles.lead}>{s.titleLead}</span>}
                {s.route && <RouteBadge route={s.route} size="sm" />}
                <span className={styles.titleText}>{s.title}</span>
              </span>
              {/* The duration ends the last grey line as plain text ("12:15 PM · 26 stops · 16 min"):
                  a boxed "16 min" read as a route chip or a button. "16 min" never breaks. */}
              {s.lines.map((l, j) => (
                <span key={j} className={styles.line}>
                  {l}
                  {s.duration && j === s.lines.length - 1 && ` · ${s.duration.replace(/ /g, "\u00a0")}`}
                </span>
              ))}
              {s.duration && !s.lines.length && <span className={styles.line}>{s.duration}</span>}
              {s.demo && <DemoTag />}
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
