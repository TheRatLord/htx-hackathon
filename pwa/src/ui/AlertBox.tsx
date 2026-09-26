import { useT } from "../i18n/index.ts";
import { alertText, effectWord } from "../lib/alerts.ts";
import { formatDateRange } from "../lib/format.ts";
import styles from "./AlertBox.module.css";
import { Icon } from "./Icon.tsx";
import type { AlertBoxProps } from "./types.ts";

/** C.11: the pink alert box. The header is never truncated; `compact` only drops the description and dates. */
export function AlertBox({ alert, lang, compact, demo, onOpen }: AlertBoxProps) {
  const t = useT();
  const header = alertText(alert, "header", lang);
  const description = alertText(alert, "description", lang);
  return (
    <button type="button" className={styles.box} onClick={onOpen}>
      <Icon name="warning" color="var(--c-alert-icon)" />
      <span className={styles.text}>
        <span className={styles.headline}>
          <strong>{effectWord(alert.effect, lang)}:</strong> {header.text}
        </span>
        {header.englishOnly && <span className={styles.caption}>{t("alert.englishOnly")}</span>}
        {!compact && description.text && <span className={styles.description}>{description.text}</span>}
        {!compact && <span className={styles.caption}>{formatDateRange(alert.activeFrom, alert.activeUntil, lang)}</span>}
      </span>
      {demo && <span className={styles.demo}>{t("alert.demoTag")}</span>}
      <Icon name="chevron_right" />
    </button>
  );
}
