// How tall an Explore half sheet may grow (D2 rules M1–M3, D3, D4, D6): it must leave the map
// strip, and the FAB column on the sheet's top edge must stay below the search bar.

/** Bottom nav, and the search bar's bottom edge (12dp inset + 48dp pill). */
const NAV_H = 80;
const SEARCH_BAR_H = 60;
/** Below this height the map strip is 120dp: room for two FABs (C.9), not three. */
export const TALL_VH = 740;

/** M1: the map strip left above the half sheet. */
const mapMin = (vh: number) => (vh >= TALL_VH ? 180 : 120);

/** The tallest half sheet that keeps `mapMin` of map below the search bar. */
export const foldCap = (vh: number) => vh - NAV_H - SEARCH_BAR_H - mapMin(vh);
