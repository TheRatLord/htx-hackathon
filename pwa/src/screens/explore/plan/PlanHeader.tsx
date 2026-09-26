import { useContext, useLayoutEffect, type ReactNode } from "react";
import { useT } from "../../../i18n/index.ts";
import { Icon } from "../../../ui/Icon.tsx";
import { SheetChromeContext } from "../../../ui/sheetChrome.ts";
import styles from "./plan.module.css";

/**
 * The planner's and Live trip's title row, "‹ Back  Plan Your Trip ... ⌄" on one line, the same
 * Back as every other sheet (SheetHeader): the word, not a lone chevron, which older riders read as
 * decoration. The form and the trip list need every row they can get above the nav at 360x640
 * (21, 22, 24), so Back, the title and the toggle share one row. The title is the screen's <h1>,
 * focused after navigation (C.7).
 */
export function PlanHeader({ title, right }: { title: string; /** A link at the end of the row ("All steps ›"). */ right?: ReactNode }) {
  const t = useT();
  const chrome = useContext(SheetChromeContext);
  const host = chrome?.host;
  // Tells the sheet this header carries Back and the toggle, so it drops its own button row.
  useLayoutEffect(() => host?.(), [host]);
  return (
    <div className={styles.header}>
      {chrome?.onBack && (
        <button type="button" className={styles.headerBack} onClick={chrome.onBack}>
          <Icon name="chevron_left" />
          {t("common.back")}
        </button>
      )}
      <h1 tabIndex={-1} className={styles.headerTitle}>
        {title}
      </h1>
      {right && <div className={styles.headerRight}>{right}</div>}
      {chrome?.toggle && (
        <button
          type="button"
          className={styles.headerToggle}
          aria-label={chrome.toggle.label}
          aria-expanded={chrome.toggle.expanded}
          onClick={chrome.toggle.onPress}
        >
          <Icon name={chrome.toggle.icon} />
        </button>
      )}
    </div>
  );
}
