// How tall an Explore half sheet may grow (D2 rules M1–M3, D3, D4, D6): it must leave the map
// strip, and the FAB column on the sheet's top edge must stay below the search bar. Like Google
// Maps, a half sheet never covers more than HALF_CAP of the screen: the rider drags up for more.

/** Bottom nav, and the search bar's bottom edge (12dp inset + 48dp pill). */
const NAV_H = 80;
const SEARCH_BAR_H = 60;
/** C.9: two 48dp FABs, 8dp apart, 8dp above the sheet, and 8dp clear of the search bar. */
const TWO_FABS_H = 2 * 48 + 3 * 8;
/** The most of the screen a grown half sheet may take. */
const HALF_CAP = 0.45;

/**
 * Extra large on a narrow phone: Plan Trip is a square button with its label under the icon (Fab
 * .planTrip, 72dp tall), so the FAB column is 24dp taller than two 48dp FABs. A strip sized for
 * two plain FABs slid Locate up under the search bar (03-xlarge-360, 47).
 */
const XL_PLAN_TRIP_EXTRA = 24;
function fabColumnH(): number {
  const xlNarrow = typeof document !== "undefined" && document.documentElement.dataset.textSize === "xlarge" && window.innerWidth < 400;
  return TWO_FABS_H + (xlNarrow ? XL_PLAN_TRIP_EXTRA : 0);
}

/** M1: the map strip left above the half sheet; never less than the FAB column needs. */
const mapMin = (vh: number) => Math.max(vh >= 740 ? 180 : 120, fabColumnH());

/** The tallest half sheet that keeps `mapMin` of map below the search bar. */
export const foldCap = (vh: number) => Math.min(HALF_CAP * vh, vh - NAV_H - SEARCH_BAR_H - mapMin(vh));

/** The same for a screen that hides the search bar (Select Itinerary): the map strip starts at the top. */
export const noSearchBarCap = (vh: number) => Math.min(HALF_CAP * vh, vh - NAV_H - mapMin(vh));

/**
 * D3: room for its first two cards (spec D3 minHalf, at most HALF_CAP of the screen) as long as two
 * FABs still fit under the search bar.
 */
export const routeCap = (vh: number) => Math.min(HALF_CAP * vh, vh - NAV_H - SEARCH_BAR_H - fabColumnH());
