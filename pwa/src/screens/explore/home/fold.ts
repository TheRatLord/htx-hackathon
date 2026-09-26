// How tall an Explore half sheet may grow (D2 rules M1–M3, D3, D4, D6): it must leave the map
// strip, and the FAB column on the sheet's top edge must stay below the search bar.

/** Bottom nav, and the search bar's bottom edge (12dp inset + 48dp pill). */
const NAV_H = 80;
const SEARCH_BAR_H = 60;
/** C.9: two 48dp FABs, 8dp apart, 8dp above the sheet, and 8dp clear of the search bar. */
const TWO_FABS_H = 2 * 48 + 3 * 8;

/** M1: the map strip left above the half sheet. */
const mapMin = (vh: number) => (vh >= 740 ? 180 : 120);

/** The tallest half sheet that keeps `mapMin` of map below the search bar. */
export const foldCap = (vh: number) => vh - NAV_H - SEARCH_BAR_H - mapMin(vh);

/**
 * D3: room for its first two cards (spec D3 minHalf, at most 75% of the screen) as long as two FABs
 * still fit under the search bar. On a 640dp screen this equals `foldCap`.
 */
export const routeCap = (vh: number) => Math.min(0.75 * vh, vh - NAV_H - SEARCH_BAR_H - TWO_FABS_H);
