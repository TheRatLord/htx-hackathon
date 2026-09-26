// Grows the half sheet until a target element is fully visible, within a cap (D2 fold rules
// M1–M3, D3 "first 2 cards"). The sheet never shrinks below its default half height, except to end
// on a whole line when the target can't fit (below).

import { useLayoutEffect, useRef } from "react";
import { useSheet, useSheetElement } from "../../../app/layouts/ExploreChrome.tsx";
import { defaultHalfPx, HALF_MAX_VAR } from "../../../ui/BottomSheet.tsx";

const GAP = 8;
/** A button or link taller than this is a card-sized hit area, not a row a fold could cut. */
const ROW_MAX_H = 160;
/** Blank space above and below a text line's letters that a fold may cross. */
const LEADING = 4;
/** How far below its default half the sheet may end to stop on a whole line (one button row). */
const SHRINK_MAX = 56;

/** How far `el`'s scrolling ancestors inside `sheet` have scrolled it up. */
function scrolledIn(el: HTMLElement, sheet: HTMLElement): number {
  let scrolled = 0;
  for (let p = el.parentElement; p && p !== sheet; p = p.parentElement) scrolled += p.scrollTop;
  return scrolled;
}

function footerH(sheet: HTMLElement): number {
  return sheet.querySelector<HTMLElement>("[data-sheet-footer]")?.offsetHeight ?? 0;
}

/**
 * Top of the sheet to the bottom of `el`, as if the sheet body were not scrolled, plus a pinned
 * footer ("▶ Start trip") that covers the body's last lines.
 */
function reach(el: HTMLElement, sheet: HTMLElement): number {
  return el.getBoundingClientRect().bottom - sheet.getBoundingClientRect().top + scrolledIn(el, sheet) + GAP + footerH(sheet);
}

/**
 * What a fold must not cut, from the sheet's top as if unscrolled: every line of text, button,
 * link and icon. Card-sized hit areas (the card's own button) and the pinned footer don't count.
 * Only elements that hold text or are controls or icons are measured (a text node's parent, and
 * `button, a, svg, img`), not every element in the sheet.
 */
function lineBoxes(sheet: HTMLElement, below: number): { top: number; bottom: number }[] {
  const top0 = sheet.getBoundingClientRect().top;
  const footer = sheet.querySelector<HTMLElement>("[data-sheet-footer]");
  const els = new Set<HTMLElement>(sheet.querySelectorAll<HTMLElement>("button, a, svg, img"));
  const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.textContent!.trim() && n.parentElement) els.add(n.parentElement);
  const scroll = new Map<Element | null, number>();
  const out: { top: number; bottom: number }[] = [];
  for (const el of els) {
    if (footer?.contains(el)) continue;
    const control = el.tagName === "BUTTON" || el.tagName === "A";
    const r = el.getBoundingClientRect();
    if (r.height < 4 || r.width < 4) continue;
    // A card's own hit button (no text of its own, as tall as the card) is not a line.
    if (control && (r.height > ROW_MAX_H || (!el.textContent!.trim() && r.height > 64))) continue;
    const parent = el.parentElement;
    if (!scroll.has(parent)) scroll.set(parent, parent ? scrolledIn(el, sheet) : 0);
    // A line of text keeps some blank leading above and below its letters.
    const inset = control ? 0 : LEADING;
    const top = r.top - top0 + scroll.get(parent)! + inset;
    if (top < below) out.push({ top, bottom: top + r.height - 2 * inset });
  }
  return out;
}

/**
 * Folds that cut no line of text or button, below the sheet's top: `clean(f)` says whether a sheet
 * `f` px tall ends between lines, and `deepest` is the tallest such sheet up to `capPx` (the cap
 * itself, under a line with GAP to spare, or at the top of the next line).
 */
function lineFolds(sheet: HTMLElement, capPx: number): { clean: (f: number) => boolean; deepest?: number } {
  const foot = footerH(sheet);
  const limit = capPx - foot;
  const boxes = lineBoxes(sheet, limit + 1);
  const cuts = (f: number) => boxes.some((b) => b.top < f && b.bottom > f);
  const candidates = [limit, ...boxes.flatMap((b) => [b.bottom + GAP, b.top])].filter((f) => f <= limit && f > 0 && !cuts(f));
  const best = candidates.length ? Math.max(...candidates) : undefined;
  return { clean: (f) => !cuts(f - foot), deepest: best === undefined ? undefined : best + foot };
}

/**
 * The half height that ends on a whole row: the target's reach, grown to the deepest card or card
 * row below it that still fits the cap; when the target itself is past the cap, the deepest one
 * above the cap. A fold through the middle of a route row (a chip top and half a headsign) reads as
 * broken, so the sheet stops on a row boundary (02-360, 03-360, 38). The sheet is never shorter
 * than its default half, so when that default would still cut a line of text or a button, it ends
 * instead on the deepest whole row (or, failing that, the deepest fold that cuts no line) up to one
 * button row above it, or grows to one below it: the tab bar sliced 'The 1 min bus leaves…'
 * (03-xlarge-360), 'Schedule' / 'Track bus' (47) and Route 51's 'DOWNTOWN TC' (46).
 * `max` is set when that fold is above the sheet's default half: the sheet then ends there.
 */
function wholeRowHeight(el: HTMLElement, sheet: HTMLElement, capPx: number): { min: number; max?: number } {
  const own = reach(el, sheet);
  const rows = Array.from(sheet.querySelectorAll<HTMLElement>("article, article li")).map((r) => reach(r, sheet));
  const fits = rows.filter((r) => r <= capPx);
  const base = defaultHalfPx();
  // The deepest whole row the sheet may end on: at or below the target when the target fits.
  const row = own <= capPx ? Math.max(own, ...fits.filter((r) => r >= own)) : fits.length ? Math.max(...fits) : undefined;
  if (row !== undefined && row >= base) return { min: row };
  const folds = lineFolds(sheet, capPx);
  if (row !== undefined && folds.clean(base)) return { min: row };
  // The default half cuts a line: end on the row above it if it is close enough and ends clean...
  if (row !== undefined && row >= base - SHRINK_MAX && folds.clean(row)) return { min: row, max: row };
  // ...else on the deepest fold that cuts nothing.
  const fold = folds.deepest;
  if (fold === undefined || fold < base - SHRINK_MAX) return { min: row ?? capPx };
  return fold >= base ? { min: fold } : { min: fold, max: fold };
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
    const measure = () => {
      const h = wholeRowHeight(el, sheet, latest.current.cap(window.innerHeight));
      if (h.max === undefined) sheet.style.removeProperty(HALF_MAX_VAR);
      else sheet.style.setProperty(HALF_MAX_VAR, `${Math.floor(h.max)}px`);
      setMinHalf(Math.ceil(h.min));
    };
    measure();
    // Resizes are measured once per frame, after layout settles: measuring inside the observer's
    // callback changed the layout it was observing (ResizeObserver loop warnings, thrashing).
    let frame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    for (let p: HTMLElement | null = el; p && p !== sheet; p = p.parentElement) ro.observe(p);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      sheet.style.removeProperty(HALF_MAX_VAR);
    };
  }, [key, sheet, setMinHalf]);
}
