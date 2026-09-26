import { useEffect, useId, useRef, useState } from "react";
import { useT } from "../i18n/index.ts";
import styles from "./ChipRow.module.css";
import type { ChipRowProps } from "./types.ts";

/**
 * C.10: a horizontal chip scroller with an optional visible label (which is also the group's
 * name) and a "More ›" button when it overflows; it turns into "‹ Back" at the end. `wrap`
 * lays short sets (sort chips) out on as many rows as they need instead: nothing is hidden.
 * `inlineLabel` puts the label on the chips' row as its first item, saving a line.
 */
/**
 * A chip cut by the scroller's edge is hidden whole (visibility, so the layout doesn't move): a
 * half chip read as a broken "4" or a ghost bar beside "More ›". Scrolling brings it back whole.
 */
function hidePartial(el: HTMLElement) {
  const box = el.getBoundingClientRect();
  for (const child of Array.from(el.children) as HTMLElement[]) {
    const r = child.getBoundingClientRect();
    const cut = r.right > box.right + 0.5 || r.left < box.left - 0.5;
    child.style.visibility = cut ? "hidden" : "";
  }
}

export function ChipRow({ children, label, ariaLabel, wrap, inlineLabel }: ChipRowProps) {
  const t = useT();
  const labelId = useId();
  const scroller = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState<"none" | "more" | "end">("none");

  useEffect(() => {
    const el = scroller.current;
    if (!el || wrap) return;
    const update = () => {
      if (el.scrollWidth <= el.clientWidth + 1) setOverflow("none");
      else setOverflow(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 ? "end" : "more");
      hidePartial(el);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // Chips often arrive after mount (data loads) without changing the scroller's own size.
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
      mo.disconnect();
    };
  }, [wrap]);

  const page = () => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: overflow === "end" ? -el.scrollWidth : el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className={styles.wrap} role="group" aria-label={label ? undefined : ariaLabel} aria-labelledby={label ? labelId : undefined}>
      {label && !inlineLabel && (
        <p id={labelId} className={styles.label}>
          {label}
        </p>
      )}
      <div className={styles.row}>
        <div ref={scroller} className={`${styles.scroller} ${wrap ? styles.wrapped : ""} ${overflow !== "none" ? styles.withMore : ""}`}>
          {label && inlineLabel && (
            <span id={labelId} className={styles.inlineLabel}>
              {label}
            </span>
          )}
          {children}
        </div>
        {overflow !== "none" && (
          <button type="button" className={styles.more} onClick={page}>
            {overflow === "end" ? `‹ ${t("chips.back")}` : `${t("chips.more")} ›`}
          </button>
        )}
      </div>
    </div>
  );
}
