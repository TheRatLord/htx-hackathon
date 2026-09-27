import { useCallback, useLayoutEffect, useRef, useState, type PointerEvent, type Ref } from "react";
import { useT } from "../i18n/index.ts";
import styles from "./BottomSheet.module.css";
import { Icon } from "./Icon.tsx";
import { SheetChromeContext, type SheetChrome, type SheetToggle } from "./sheetChrome.ts";
import type { BottomSheetProps, Snap } from "./types.ts";

/** A fling faster than this (px/ms, ~30% of a screen per second) picks the next snap in its direction. */
const FLING_VELOCITY = 0.5;

const token = (name: string) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));

/**
 * Set on the sheet (in px) by a screen whose half sheet must end above its default height, on the
 * last whole line that fits (useHalfUpTo): the half snap is then no taller than this.
 */
export const HALF_MAX_VAR = "--half-max";

/** The default half sheet, as a share of the window and a ceiling: most of the screen stays map, as in Google Maps. */
const HALF_RATIO = 0.36;
const HALF_MAX_PX = 320;

/** The half sheet's height before a screen grows it (C.6). */
export function defaultHalfPx(): number {
  return Math.max(token("--sheet-half-min"), Math.min(HALF_RATIO * window.innerHeight, HALF_MAX_PX));
}

/** Snap heights in px for a container `h` px tall; mirrors the CSS in BottomSheet.module.css (C.6). */
function snapHeights(h: number, minHalf = 0, halfMax = Infinity, peekFit = Infinity): Record<Snap, number> {
  const full = h;
  const half = Math.min(full, halfMax, Math.max(defaultHalfPx(), minHalf));
  return { peek: Math.min(token("--sheet-peek"), peekFit), half, full };
}

/** The peek ends under its title row: the grab zone (unless slim, drawn over the header) plus the header. */
function peekFitPx(handle: HTMLElement | null, header: HTMLElement | null): number | undefined {
  if (!handle || !header) return undefined;
  const handleH = getComputedStyle(handle).position === "absolute" ? 0 : handle.offsetHeight;
  return Math.ceil(handleH + header.offsetHeight);
}

/**
 * C.6: the Explore sheet. Its no-drag alternative (WCAG 2.5.7) is one chevron toggle, "Show list"
 * or "Show map" by the snap it is at, never both. With a SheetHeader inside, "‹ Back" and the
 * toggle sit on the title row and the handle zone is just the grab bar; otherwise (a custom
 * header, the peek summary) they fill the 48dp handle zone. Swiping never discards anything.
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
  noList = false,
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

  // The peek fits what it shows (a title row, a trip's two lines), up to --sheet-peek: a fixed
  // height left an empty band under a short title (Home opens here).
  const handleRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [peekFit, setPeekFit] = useState<number>();
  useLayoutEffect(() => {
    if (snap !== "peek" || !headerRef.current) return;
    const measure = () => setPeekFit(peekFitPx(handleRef.current, headerRef.current));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, [snap]);

  const heights = () =>
    snapHeights(
      root.current?.parentElement?.clientHeight ?? window.innerHeight,
      minHalf,
      parseFloat(root.current?.style.getPropertyValue(HALF_MAX_VAR) ?? "") || Infinity,
      peekFit,
    );

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, a, input, textarea, select") || !root.current) return;
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
  const toPeek = snap === "half" && Boolean(peek) && allowPeek;
  const toggle: SheetToggle | undefined =
    expanded || toPeek
      ? { label: t("common.showMap"), icon: "expand_more", expanded, onPress: () => onSnapChange(expanded ? "half" : "peek") }
      : noList && snap === "half"
        ? undefined
        : { label: t("common.showList"), icon: "expand_less", expanded, onPress: () => onSnapChange(snap === "peek" ? "half" : "full") };
  const [hosts, setHosts] = useState(0);
  const host = useCallback(() => {
    setHosts((n) => n + 1);
    return () => setHosts((n) => n - 1);
  }, []);
  const chrome: SheetChrome = { onBack, toggle, host };
  const style = dragH !== null ? { height: dragH, transition: "none" } : undefined;
  const showPeek = snap === "peek" && peek;
  const hosted = hosts > 0 && !showPeek;
  const grip = { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };
  return (
    <section ref={setRoot} className={`${styles.sheet} ${styles[snap]}`} style={{ ...style, ["--min-half" as string]: `${minHalf ?? 0}px`, ...(peekFit && { ["--peek-fit" as string]: `${peekFit}px` }) }} role="region" aria-label={ariaLabel}>
      <div ref={handleRef} className={`${styles.handleZone} ${hosted ? styles.slim : ""}`} {...grip}>
        <span className={styles.handle} aria-hidden="true" />
        {!hosted && (
          <>
            {onBack ? (
              <button type="button" className={styles.textButton} onClick={onBack}>
                <Icon name="chevron_left" />
                {t("common.back")}
              </button>
            ) : (
              <span />
            )}
            {toggle && (
              <button type="button" className={styles.textButton} aria-expanded={toggle.expanded} onClick={toggle.onPress}>
                {toggle.label}
                <Icon name={toggle.icon} />
              </button>
            )}
          </>
        )}
      </div>
      <SheetChromeContext value={chrome}>
        {/* The title row drags the sheet too, so the slim handle zone isn't the only grip. */}
        <div ref={headerRef} className={styles.headerZone} {...grip}>
          {showPeek ? peek : header}
        </div>
      </SheetChromeContext>
      {/* At the peek only the title shows: a list row cut by the sheet's edge looked broken (Home opens here). */}
      <div className={styles.body} hidden={snap === "peek"}>
        {children}
      </div>
      {footer && snap !== "peek" && <div className={styles.footer} data-sheet-footer="">{footer}</div>}
    </section>
  );
}
