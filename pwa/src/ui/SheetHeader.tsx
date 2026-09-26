import { useContext, useLayoutEffect } from "react";
import { useT } from "../i18n/index.ts";
import { Icon } from "./Icon.tsx";
import { SheetChromeContext } from "./sheetChrome.ts";
import styles from "./SheetHeader.module.css";
import type { SheetHeaderProps } from "./types.ts";

/**
 * C.7: the sheet title row. The title is the screen's <h1>, focused after navigation. Inside a
 * BottomSheet it also carries the sheet's Back (start) and its one Show list / Show map chevron
 * (end) on the title's own row: "‹ Back  Route 40 near you  ⌃". A row holding only Back and the
 * chevron cost a 48dp line on every sheet and pushed the answer down (05, 12, 16).
 */
export function SheetHeader({ title, overline, overlineAction, titleAlign = "start", titleSize = titleAlign === "center" ? "stop" : "title", sub, right }: SheetHeaderProps) {
  const t = useT();
  const chrome = useContext(SheetChromeContext);
  const host = chrome?.host;
  useLayoutEffect(() => host?.(), [host]);
  const center = titleAlign === "center";
  // One Back on every sheet, as "‹ Back" text: a lone chevron before a title read as decoration to
  // older riders, and 12/15/17 already said "Back" (round 4). It shares a row with the toggle.
  const backRow = chrome?.onBack && (
    <button type="button" className={styles.back} onClick={chrome.onBack}>
      <Icon name="chevron_left" />
      {t("common.back")}
    </button>
  );
  const toggle = chrome?.toggle && (
    <button type="button" className={styles.toggle} aria-label={chrome.toggle.label} aria-expanded={chrome.toggle.expanded} onClick={chrome.toggle.onPress}>
      <Icon name={chrome.toggle.icon} />
    </button>
  );
  const text = (
    <div className={styles.text}>
      <h1 tabIndex={-1} className={`${styles.title} ${titleSize === "stop" ? styles.stopTitle : ""}`}>
        {overline && <span className="visually-hidden">{overline} </span>}
        {title}
      </h1>
      {sub && <div className={styles.sub}>{sub}</div>}
      {right && <div className={styles.right}>{right}</div>}
    </div>
  );
  const action = overlineAction && (
    <button type="button" className={styles.overlineAction} aria-label={overlineAction.ariaLabel} onClick={overlineAction.onPress}>
      {overlineAction.icon && <Icon name={overlineAction.icon} size={20} />}
      {overlineAction.label}
    </button>
  );
  const overlineText = overline && (
    <p className={styles.overline} aria-hidden="true">
      {overline}
    </p>
  );
  // With Back: "‹ Back", the title (and its overline and sub) and the chevron share one row; the
  // title wraps beside Back rather than taking a row under it. Without: the overline shares the row
  // with its action and the toggle, so the title below gets the full width ("Houston Museum of
  // Natural Science" fits one 22sp line at 412dp).
  return (
    <div className={`${styles.header} ${center ? styles.center : ""} ${chrome ? styles.inSheet : ""}`}>
      {backRow ? (
        <div className={`${styles.main} ${styles.backMain} ${titleSize === "stop" ? styles.backStop : ""}`}>
          {backRow}
          <div className={styles.backText}>
            {overline && (
              <div className={`${styles.withBack} ${styles.overlineInline}`}>
                {overlineText}
                {action}
              </div>
            )}
            {text}
          </div>
          {toggle}
        </div>
      ) : overline ? (
        <>
          <div className={`${styles.main} ${styles.withBack} ${styles.overlineRow}`}>
            {overlineText}
            {action}
            {toggle}
          </div>
          {text}
        </>
      ) : (
        <div className={styles.main}>
          {text}
          {toggle}
        </div>
      )}
    </div>
  );
}
