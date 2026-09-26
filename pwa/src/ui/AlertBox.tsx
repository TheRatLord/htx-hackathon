import { useT } from "../i18n/index.ts";
import { alertText, effectWord } from "../lib/alerts.ts";
import { formatDateRange } from "../lib/format.ts";
import styles from "./AlertBox.module.css";
import { DemoTag } from "./DemoTag.tsx";
import { Icon } from "./Icon.tsx";
import { RouteBadge } from "./RouteBadge.tsx";
import type { AlertBoxProps } from "./types.ts";

const MAX_BADGES = 6;

/**
 * C.11: the alert card. The headline has the card's full width (the ⚠ inline in its first line),
 * and the route chips share the date line below it; the card is white with a red edge (a pink fill on every card read as
 * an alarm). The header is never truncated; `compact` only drops the description (and, unless
 * "list", the dates). "Demo" is a small tag at the end, not a column of its own.
 */
export function AlertBox({ alert, lang, compact, demo, routes, onOpen }: AlertBoxProps) {
  const t = useT();
  const header = alertText(alert, "header", lang);
  const description = alertText(alert, "description", lang);
  const dates = compact !== true ? formatDateRange(alert.activeFrom, alert.activeUntil, lang) : "";
  return (
    <button type="button" className={styles.box} onClick={onOpen}>
      <span className={styles.text}>
        {/* The icon sits in the first line, and later lines run under it: no hanging indent. */}
        <span className={styles.headline}>
          <Icon name="warning" size={20} color="var(--c-alert-icon)" />
          <strong>{effectWord(alert.effect, lang)}:</strong> {header.text}
        </span>
        {header.englishOnly && <span className={styles.caption}>{t("alert.englishOnly")}</span>}
        {!compact && description.text && <span className={styles.description}>{description.text}</span>}
        {/* "[5] [82]  From Sep 1  Demo": the routes share the date line instead of a row of their own. */}
        {((routes && routes.length > 0) || dates || demo) && (
          <span className={styles.meta}>
            {routes?.slice(0, MAX_BADGES).map((r) => (
              <RouteBadge key={r.id} route={r} size="xs" />
            ))}
            {routes && routes.length > MAX_BADGES && <span className={styles.moreBadges}>+{routes.length - MAX_BADGES}</span>}
            {dates && <span className={styles.caption}>{dates}</span>}
            {demo && <DemoTag />}
          </span>
        )}
      </span>
      <Icon name="chevron_right" />
    </button>
  );
}
