// Grows the half sheet until a target element is fully visible, within a cap (D2 fold rules
// M1–M3, D3 "first 2 cards"). The sheet never shrinks below its default half height.

import { useLayoutEffect, useRef } from "react";
import { useSheet } from "../../../app/layouts/ExploreChrome.tsx";

const GAP = 8;
/** The layout's BottomSheet root; replace with the sheet ref once the layout exposes one (requests.md). */
const SHEET = "section[role=region]";

/** Top of the sheet to the bottom of `el`, as if the sheet body were not scrolled. */
function reach(el: HTMLElement, sheet: HTMLElement): number {
  let scrolled = 0;
  for (let p = el.parentElement; p && p !== sheet; p = p.parentElement) scrolled += p.scrollTop;
  return el.getBoundingClientRect().bottom - sheet.getBoundingClientRect().top + scrolled + GAP;
}

/**
 * Measures after every `key` change and whenever the target or anything around it resizes
 * (cards fill in as their own requests answer).
 */
export function useHalfUpTo(target: () => HTMLElement | null | undefined, cap: (viewportH: number) => number, key: string): void {
  const { setMinHalf } = useSheet();
  const latest = useRef({ target, cap });
  latest.current = { target, cap };
  useLayoutEffect(() => {
    const el = latest.current.target();
    const sheet = el?.closest<HTMLElement>(SHEET);
    if (!el || !sheet) return setMinHalf(undefined);
    const measure = () => setMinHalf(Math.min(Math.ceil(reach(el, sheet)), latest.current.cap(window.innerHeight)));
    measure();
    const ro = new ResizeObserver(measure);
    for (let p: HTMLElement | null = el; p && p !== sheet; p = p.parentElement) ro.observe(p);
    return () => ro.disconnect();
  }, [key, setMinHalf]);
}
