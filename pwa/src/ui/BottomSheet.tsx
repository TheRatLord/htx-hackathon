import { useRef, useState, type PointerEvent, type Ref } from "react";
import { useT } from "../i18n/index.ts";
import styles from "./BottomSheet.module.css";
import { Icon } from "./Icon.tsx";
import type { BottomSheetProps, Snap } from "./types.ts";

/** A fling faster than this (px/ms, ~30% of a screen per second) picks the next snap in its direction. */
const FLING_VELOCITY = 0.5;
const TOP_GAP = 8;

/** Snap heights in px for a container `h` px tall; mirrors the CSS in BottomSheet.module.css (C.6). */
function snapHeights(h: number, minHalf = 0): Record<Snap, number> {
  const token = (name: string) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  const full = h - TOP_GAP;
  const half = Math.min(full, Math.max(token("--sheet-half-min"), Math.min(0.52 * window.innerHeight, 460), minHalf));
  return { peek: token("--sheet-peek"), half, full };
}

/**
 * C.6: the Explore sheet. "‹ Back" and "Show list ▲ / Show map ▼" live in the 48dp handle zone
 * (the no-drag alternative, WCAG 2.5.7). Dragging also works; swiping never discards anything.
 */
export function BottomSheet({
  snap,
  onSnapChange,
  minHalf,
  onBack,
  header,
  peek,
  footer,
  children,
  allowPeek = true,
  ariaLabel,
  ref,
}: BottomSheetProps & { ref?: Ref<HTMLElement> }) {
  const t = useT();
  const root = useRef<HTMLElement | null>(null);
  const drag = useRef<{ startY: number; startH: number; lastY: number; lastT: number; v: number } | null>(null);
  const [dragH, setDragH] = useState<number | null>(null);

  const setRoot = (el: HTMLElement | null) => {
    root.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };

  const heights = () => snapHeights(root.current?.parentElement?.clientHeight ?? window.innerHeight, minHalf);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button") || !root.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const h = root.current.getBoundingClientRect().height;
    drag.current = { startY: e.clientY, startH: h, lastY: e.clientY, lastT: e.timeStamp, v: 0 };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.v = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    const hs = heights();
    setDragH(Math.max(hs.peek, Math.min(hs.full, d.startH - (e.clientY - d.startY))));
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || dragH === null) return setDragH(null);
    const hs = heights();
    const order: Snap[] = allowPeek ? ["peek", "half", "full"] : ["half", "full"];
    let next: Snap;
    if (Math.abs(d.v) > FLING_VELOCITY) {
      const i = order.indexOf(snap);
      next = order[Math.max(0, Math.min(order.length - 1, i + (d.v < 0 ? 1 : -1)))];
    } else {
      next = order.reduce((best, s) => (Math.abs(hs[s] - dragH) < Math.abs(hs[best] - dragH) ? s : best), order[0]);
    }
    setDragH(null);
    if (next !== snap) onSnapChange(next);
  };

  const expanded = snap === "full";
  const style = dragH !== null ? { height: dragH, transition: "none" } : undefined;
  const showPeek = snap === "peek" && peek;
  return (
    <section ref={setRoot} className={`${styles.sheet} ${styles[snap]}`} style={{ ...style, ["--min-half" as string]: `${minHalf ?? 0}px` }} role="region" aria-label={ariaLabel}>
      <div className={styles.handleZone} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        {onBack ? (
          <button type="button" className={styles.textButton} onClick={onBack}>
            <Icon name="chevron_left" />
            {t("common.back")}
          </button>
        ) : (
          <span />
        )}
        <span className={styles.handle} aria-hidden="true" />
        <button type="button" className={styles.textButton} aria-expanded={expanded} onClick={() => onSnapChange(expanded ? "half" : "full")}>
          {expanded ? t("common.showMap") : t("common.showList")}
          <Icon name={expanded ? "expand_more" : "expand_less"} />
        </button>
      </div>
      {showPeek ? peek : header}
      <div className={styles.body} hidden={Boolean(showPeek)}>
        {children}
      </div>
      {footer && snap !== "peek" && <div className={styles.footer}>{footer}</div>}
    </section>
  );
}
