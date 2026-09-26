import { useContext, useLayoutEffect } from "react";
import { useT } from "../i18n/index.ts";
import { Icon } from "./Icon.tsx";
import { SheetChromeContext } from "./sheetChrome.ts";
import styles from "./SheetHeader.module.css";
import type { SheetHeaderProps } from "./types.ts";

/**
 * C.7: the sheet title row. The title is the screen's <h1>, focused after navigation. Inside a
 * BottomSheet it also carries the sheet's Back (start) and its one Show list / Show map chevron
 * (end). A start-aligned title shares their row ("‹ Route 40 near you   ⌃"), so no row is spent
 * on Back alone; a centred stop title keeps "‹ Back" on a row above it.
 */
export function SheetHeader({ title, overline, titleAlign = "start", titleSize = titleAlign === "center" ? "stop" : "title", sub, right }: SheetHeaderProps) {
  const t = useT();
  const chrome = useContext(SheetChromeContext);
  const host = chrome?.host;
  useLayoutEffect(() => host?.(), [host]);
  const center = titleAlign === "center";
  const back = chrome?.onBack && !center && (
    <button type="button" className={styles.backIcon} aria-label={t("common.back")} onClick={chrome.onBack}>
      <Icon name="chevron_left" size={28} />
    </button>
  );
  const backRow = chrome?.onBack && center && (
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
  // A centred title: Back and the toggle share a row above it. Otherwise one row: [‹] title [⌃].
  return (
    <div className={`${styles.header} ${center ? styles.center : ""} ${chrome ? styles.inSheet : ""}`}>
      {backRow ? (
        <>
          <div className={styles.controls}>
            {backRow}
            {toggle}
          </div>
          {text}
        </>
      ) : overline ? (
        // The overline shares the row with Back and the toggle, so the title below gets the full
        // width: "Houston Museum of Natural Science" fits one 22sp line at 412dp.
        <>
          <div className={`${styles.main} ${styles.withBack} ${styles.overlineRow}`}>
            {back}
            <p className={styles.overline} aria-hidden="true">
              {overline}
            </p>
            {toggle}
          </div>
          {text}
        </>
      ) : (
        <div className={`${styles.main} ${back ? styles.withBack : ""}`}>
          {back}
          {text}
          {toggle}
        </div>
      )}
    </div>
  );
}
