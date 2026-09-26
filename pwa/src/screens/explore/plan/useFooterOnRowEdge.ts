// My Itinerary's pinned "▶ Start trip" footer never slices a timeline row (24, 24-360): the sheet
// body's visible bottom edge is raised to the top of the row the footer would have cut, so the list
// above the footer ends on a whole row.

import { useLayoutEffect } from "react";

/** Past this, a large blank band would open above the footer: the row's top is shown instead. */
const MAX_EXTRA = 64;

/**
 * Sets a bottom margin on the sheet body (the element before `[data-sheet-footer]`) equal to the
 * part of the row the footer would have cut. A margin, not footer padding: the footer's own height
 * is what the half sheet's sizing (useHalfUpTo) counts, and it must not change under it. Only while
 * the list is unscrolled: once the rider scrolls, rows slide under the footer as in any list.
 */
export function useFooterOnRowEdge(sheet: HTMLElement | null, key: string): void {
  useLayoutEffect(() => {
    const footer = sheet?.querySelector<HTMLElement>("[data-sheet-footer]");
    const body = footer?.previousElementSibling as HTMLElement | null | undefined;
    if (!sheet || !footer || !body) return;
    let current = 0;
    const apply = (px: number) => {
      if (px === current) return;
      current = px;
      body.style.marginBottom = px ? `${px}px` : "";
    };
    const measure = () => {
      if (body.scrollTop > 0) return apply(0);
      // Where the body would end without the margin: the footer's top.
      const edge = footer.getBoundingClientRect().top;
      let next = 0;
      for (const row of body.querySelectorAll<HTMLElement>("ol > li")) {
        const r = row.getBoundingClientRect();
        if (r.top < edge && r.bottom > edge + 0.5) {
          next = Math.ceil(edge - r.top);
          break;
        }
      }
      apply(next > MAX_EXTRA ? 0 : next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(sheet);
    const list = body.querySelector("ol");
    if (list) ro.observe(list);
    body.addEventListener("scroll", measure, { passive: true });
    sheet.addEventListener("transitionend", measure);
    return () => {
      ro.disconnect();
      body.removeEventListener("scroll", measure);
      sheet.removeEventListener("transitionend", measure);
      body.style.marginBottom = "";
    };
  }, [sheet, key]);
}
