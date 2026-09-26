import { useContext, useLayoutEffect } from "react";
import { useT } from "../i18n/index.ts";
import { Icon } from "./Icon.tsx";
import { SheetChromeContext } from "./sheetChrome.ts";
import styles from "./SheetHeader.module.css";
import type { SheetHeaderProps } from "./types.ts";

/**
 * C.7: the sheet title row. The title is the screen's <h1>, focused after navigation. Inside a
 * BottomSheet it also carries the sheet's "‹ Back" (start) and its one Show list / Show map
 * chevron (end), so no row is spent on them alone.
 */
export function SheetHeader({ title, titleAlign = "start", titleSize = titleAlign === "center" ? "stop" : "title", sub, right }: SheetHeaderProps) {
  const t = useT();
  const chrome = useContext(SheetChromeContext);
  const host = chrome?.host;
  useLayoutEffect(() => host?.(), [host]);
  const center = titleAlign === "center";
  const back = chrome?.onBack && (
    <button type="button" className={styles.back} onClick={chrome.onBack}>
      <Icon name="chevron_left" />
      {t("common.back")}
    </button>
  );
  const toggle = chrome && (
    <button type="button" className={styles.toggle} aria-label={chrome.toggle.label} aria-expanded={chrome.toggle.expanded} onClick={chrome.toggle.onPress}>
      <Icon name={chrome.toggle.icon} />
    </button>
  );
  const text = (
    <div className={styles.text}>
      <h1 tabIndex={-1} className={`${styles.title} ${titleSize === "stop" ? styles.stopTitle : ""}`}>
        {title}
      </h1>
      {sub && <div className={styles.sub}>{sub}</div>}
      {right && <div className={styles.right}>{right}</div>}
    </div>
  );
  // With Back, the toggle shares Back's row; without, it ends the title row (Home's "Nearby stops").
  return (
    <div className={`${styles.header} ${center ? styles.center : ""} ${chrome ? styles.inSheet : ""}`}>
      {back ? (
        <>
          <div className={styles.controls}>
            {back}
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
