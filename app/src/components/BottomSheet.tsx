import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { useOptionalMapContext } from '../map/scene';
import './BottomSheet.css';

export interface BottomSheetProps {
  /**
   * Visible heights, lowest first. Values up to 1 are fractions of the
   * screen height; larger values are pixels. E.g. [148, 0.5, 0.92].
   */
  snapPoints: number[];
  /** Controlled snap index. */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Always-visible top part (title row). Dragging it moves the sheet. */
  header?: ReactNode;
  children?: ReactNode;
  /** Pinned to the bottom of the sheet (e.g. "Start trip"). */
  footer?: ReactNode;
  /** Extra space at the bottom of the scroll area, e.g. for the floating tab bar. */
  bottomPadding?: number;
  /** Accessible name for the sheet region. */
  label: string;
  /** Fade the body out at the lowest snap, so only the header shows (default false). */
  hideBodyAtFirstSnap?: boolean;
  /** Tell the map how much of it is covered (default true). */
  reportInset?: boolean;
  className?: string;
}

const VELOCITY_PROJECTION_MS = 180;

function resolveSnaps(points: number[], containerH: number): number[] {
  return points.map((p) => Math.round(p <= 1 ? p * containerH : Math.min(p, containerH)));
}

/**
 * A draggable sheet with snap points. Drag the handle or header; the body
 * scrolls only when fully open, otherwise dragging it moves the sheet.
 * Tap the handle (or press Enter / arrow keys on it) to step between heights.
 */
export function BottomSheet({
  snapPoints,
  index: controlledIndex,
  defaultIndex = 0,
  onIndexChange,
  header,
  children,
  footer,
  bottomPadding = 0,
  label,
  reportInset = true,
  hideBodyAtFirstSnap = false,
  className,
}: BottomSheetProps) {
  const mapCtx = useOptionalMapContext();
  const setBottomInset = mapCtx?.setBottomInset;
  const rootRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [containerH, setContainerH] = useState(() => (typeof window === 'undefined' ? 844 : window.innerHeight));
  const [uncontrolledIndex, setUncontrolledIndex] = useState(defaultIndex);
  const index = controlledIndex ?? uncontrolledIndex;
  const [dragOffset, setDragOffset] = useState<number | null>(null);

  // A drag ends with a click on whatever is under the finger; swallow it.
  const justDragged = useRef(false);
  const snaps = resolveSnaps(snapPoints, containerH);
  const maxH = snaps[snaps.length - 1];
  const safeIndex = Math.min(Math.max(index, 0), snaps.length - 1);
  const restingH = snaps[safeIndex];
  const currentH = dragOffset ?? restingH;
  const isOpenFully = safeIndex === snaps.length - 1;

  useLayoutEffect(() => {
    const parent = rootRef.current?.parentElement;
    if (!parent) return;
    const measure = () => setContainerH(parent.clientHeight || window.innerHeight);
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(parent);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  useEffect(() => {
    if (!reportInset || !setBottomInset) return;
    setBottomInset(restingH);
  }, [restingH, reportInset, setBottomInset]);

  useEffect(() => {
    if (!reportInset || !setBottomInset) return;
    return () => setBottomInset(0);
  }, [reportInset, setBottomInset]);

  const setIndex = useCallback(
    (i: number) => {
      const next = Math.min(Math.max(i, 0), snaps.length - 1);
      if (controlledIndex === undefined) setUncontrolledIndex(next);
      onIndexChange?.(next);
    },
    [controlledIndex, onIndexChange, snaps.length],
  );

  // Scroll the body back to top when collapsing, so the next open starts at the top.
  useEffect(() => {
    if (!isOpenFully && bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [isOpenFully]);

  // Latest values for the window-level drag listeners.
  const latest = useRef({ snaps, maxH, restingH, isOpenFully, setIndex });
  latest.current = { snaps, maxH, restingH, isOpenFully, setIndex };
  const stopDrag = useRef<(() => void) | null>(null);
  useEffect(() => () => stopDrag.current?.(), []);

  /**
   * Start tracking a possible drag. Moves are read from window so a fast
   * flick that leaves the sheet still counts; nothing is captured, so taps
   * on buttons inside the sheet keep working.
   */
  const startDrag = (e: PointerEvent<HTMLElement>, fromBody: boolean) => {
    if (e.button !== 0 || !e.isPrimary) return;
    const L = latest.current;
    // Fully open and scrolled: the body scrolls instead of dragging.
    if (fromBody && L.isOpenFully && (bodyRef.current?.scrollTop ?? 0) > 0) return;
    stopDrag.current?.();
    const d = { startY: e.clientY, startH: L.restingH, lastY: e.clientY, lastT: e.timeStamp, v: 0, moved: false, h: L.restingH };

    const onMove = (ev: globalThis.PointerEvent) => {
      const dy = ev.clientY - d.startY;
      if (!d.moved) {
        if (Math.abs(dy) < 6) return;
        // Fully open body: dragging up means scroll, so let the browser handle it.
        if (fromBody && latest.current.isOpenFully && dy < 0) {
          cleanup();
          return;
        }
        d.moved = true;
      }
      const dt = Math.max(1, ev.timeStamp - d.lastT);
      d.v = (ev.clientY - d.lastY) / dt;
      d.lastY = ev.clientY;
      d.lastT = ev.timeStamp;
      const { maxH: top, snaps: sn } = latest.current;
      let h = d.startH - dy;
      // Rubber-band past the ends.
      if (h > top) h = top + (h - top) * 0.25;
      if (h < sn[0]) h = sn[0] - (sn[0] - h) * 0.25;
      d.h = h;
      setDragOffset(h);
    };

    const onUp = () => {
      cleanup();
      if (!d.moved) return;
      justDragged.current = true;
      window.setTimeout(() => (justDragged.current = false), 0);
      const { snaps: sn, setIndex: set } = latest.current;
      const projected = d.h - d.v * VELOCITY_PROJECTION_MS;
      let best = 0;
      for (let i = 1; i < sn.length; i++) if (Math.abs(sn[i] - projected) < Math.abs(sn[best] - projected)) best = i;
      setDragOffset(null);
      set(best);
    };

    function cleanup() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      stopDrag.current = null;
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    stopDrag.current = cleanup;
  };

  const cycle = () => setIndex(safeIndex === snaps.length - 1 ? 0 : safeIndex + 1);

  const onHandleKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex(safeIndex + 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex(safeIndex - 1);
    }
  };

  const swallowClickAfterDrag = (e: MouseEvent) => {
    if (justDragged.current) {
      e.stopPropagation();
      e.preventDefault();
      justDragged.current = false;
    }
  };

  const stateName = ['peek', 'half', 'full'][Math.min(safeIndex, 2)] ?? 'full';

  return (
    <section
      ref={rootRef}
      className={`sheet glass ${dragOffset !== null ? 'sheet--dragging' : ''} ${className ?? ''}`}
      style={{ height: maxH, transform: `translate3d(0, ${maxH - currentH}px, 0)` }}
      aria-label={label}
      data-sheet-state={stateName}
      data-sheet-index={safeIndex}
    >
      <div
        className="sheet__grab"
        onPointerDown={(e) => startDrag(e, false)}
        onClickCapture={swallowClickAfterDrag}
      >
        <button
          type="button"
          className="sheet__handle"
          aria-label={isOpenFully ? `Collapse ${label}` : `Expand ${label}`}
          aria-expanded={safeIndex > 0}
          onClick={cycle}
          onKeyDown={onHandleKey}
        >
          <span className="sheet__handle-bar" aria-hidden="true" />
        </button>
        {header && <div className="sheet__header">{header}</div>}
      </div>
      <div
        ref={bodyRef}
        className={`sheet__body ${isOpenFully ? 'sheet__body--scroll' : ''} ${
          hideBodyAtFirstSnap && safeIndex === 0 && dragOffset === null ? 'sheet__body--hidden' : ''
        }`}
        aria-hidden={hideBodyAtFirstSnap && safeIndex === 0 ? true : undefined}
        style={{ paddingBottom: bottomPadding + 24 }}
        onPointerDown={(e) => startDrag(e, true)}
        onClickCapture={swallowClickAfterDrag}
      >
        {children}
      </div>
      {footer && (
        <div className="sheet__footer" style={{ bottom: maxH - currentH }}>
          {footer}
        </div>
      )}
    </section>
  );
}
