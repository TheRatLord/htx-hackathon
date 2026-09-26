import { useT } from "../i18n/index.ts";
import { alertText, effectWord } from "../lib/alerts.ts";
import { formatDateRange } from "../lib/format.ts";
import styles from "./AlertBox.module.css";
import { DemoTag } from "./DemoTag.tsx";
import { Icon } from "./Icon.tsx";
import { RouteBadge } from "./RouteBadge.tsx";
import type { AlertBoxProps } from "./types.ts";

const MAX_BADGES = 6;

/** C.11: the pink alert box. The header is never truncated; `compact` only drops the description (and, unless "list", the dates). */
export function AlertBox({ alert, lang, compact, demo, routes, onOpen }: AlertBoxProps) {
  const t = useT();
  const header = alertText(alert, "header", lang);
  const description = alertText(alert, "description", lang);
  return (
    <button type="button" className={styles.box} onClick={onOpen}>
      <Icon name="warning" color="var(--c-alert-icon)" />
      <span className={styles.text}>
        <span className={styles.lead}>
          {routes && routes.length > 0 && (
            <span className={styles.badges}>
              {routes.slice(0, MAX_BADGES).map((r) => (
                <RouteBadge key={r.id} route={r} size="sm" />
              ))}
              {routes.length > MAX_BADGES && <span className={styles.moreBadges}>+{routes.length - MAX_BADGES}</span>}
            </span>
          )}
          <span className={styles.headline}>
            <strong>{effectWord(alert.effect, lang)}:</strong> {header.text}
          </span>
        </span>
        {header.englishOnly && <span className={styles.caption}>{t("alert.englishOnly")}</span>}
        {!compact && description.text && <span className={styles.description}>{description.text}</span>}
        {compact !== true && <span className={styles.caption}>{formatDateRange(alert.activeFrom, alert.activeUntil, lang)}</span>}
      </span>
      {demo && <DemoTag />}
      <Icon name="chevron_right" />
    </button>
  );
}
