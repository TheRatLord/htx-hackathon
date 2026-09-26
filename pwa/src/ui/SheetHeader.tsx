import styles from "./SheetHeader.module.css";
import type { SheetHeaderProps } from "./types.ts";

/** C.7: the sheet title row. The title is the screen's <h1>, focused after navigation. */
export function SheetHeader({ title, titleAlign = "start", titleSize = titleAlign === "center" ? "stop" : "title", sub, right }: SheetHeaderProps) {
  return (
    <div className={`${styles.header} ${titleAlign === "center" ? styles.center : ""}`}>
      <h1 tabIndex={-1} className={`${styles.title} ${titleSize === "stop" ? styles.stopTitle : ""}`}>
        {title}
      </h1>
      {sub && <div className={styles.sub}>{sub}</div>}
      {right && <div className={styles.right}>{right}</div>}
    </div>
  );
}
