// Grows the half sheet until a target element is fully visible, within a cap (D2 fold rules
// M1–M3, D3 "first 2 cards"). The sheet never shrinks below its default half height.

import { useLayoutEffect, useRef } from "react";
import { useSheet, useSheetElement } from "../../../app/layouts/ExploreChrome.tsx";

const GAP = 8;

/**
 * Top of the sheet to the bottom of `el`, as if the sheet body were not scrolled, plus a pinned
 * footer ("▶ Start trip") that covers the body's last lines.
 */
function reach(el: HTMLElement, sheet: HTMLElement): number {
  let scrolled = 0;
  for (let p = el.parentElement; p && p !== sheet; p = p.parentElement) scrolled += p.scrollTop;
  const footer = sheet.querySelector<HTMLElement>("[data-sheet-footer]")?.offsetHeight ?? 0;
  return el.getBoundingClientRect().bottom - sheet.getBoundingClientRect().top + scrolled + GAP + footer;
}

/**
 * The half height that ends on a whole row: the target's reach, grown to the deepest card or card
 * row below it that still fits the cap; when the target itself is past the cap, the deepest one
 * above the cap. A fold through the middle of a route row (a chip top and half a headsign) reads as
 * broken, so the sheet stops on a row boundary (02-360, 03-360, 38).
 */
function wholeRowHeight(el: HTMLElement, sheet: HTMLElement, capPx: number): number {
  const own = reach(el, sheet);
  const rows = Array.from(sheet.querySelectorAll<HTMLElement>("article, article li")).map((r) => reach(r, sheet));
  const fits = rows.filter((r) => r <= capPx);
  if (own <= capPx) return Math.max(own, ...fits.filter((r) => r >= own));
  return fits.length ? Math.max(...fits) : capPx;
}

/**
 * Measures after every `key` change and whenever the target or anything around it resizes
 * (cards fill in as their own requests answer).
 */
export function useHalfUpTo(target: () => HTMLElement | null | undefined, cap: (viewportH: number) => number, key: string): void {
  const { setMinHalf } = useSheet();
  const sheet = useSheetElement();
  const latest = useRef({ target, cap });
  latest.current = { target, cap };
  useLayoutEffect(() => {
    const el = latest.current.target();
    if (!el || !sheet?.contains(el)) return setMinHalf(undefined);
    const measure = () => setMinHalf(Math.ceil(wholeRowHeight(el, sheet, latest.current.cap(window.innerHeight))));
    measure();
    const ro = new ResizeObserver(measure);
    for (let p: HTMLElement | null = el; p && p !== sheet; p = p.parentElement) ro.observe(p);
    return () => ro.disconnect();
  }, [key, sheet, setMinHalf]);
}
