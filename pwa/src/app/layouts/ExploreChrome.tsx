// How an Explore screen drives the layout it doesn't own (spec G.4): the sheet's snap, the FABs,
// the overlay-slot request and the search bar's visibility.

import { createContext, useContext, useEffect, type Ref } from "react";
import { BottomSheet } from "../../ui/BottomSheet.tsx";
import type { BottomSheetProps, Snap } from "../../ui/types.ts";

export type FabRequest = "locate" | "planTrip" | { kind: "routeAlerts"; routeId: string };

export interface ExploreChromeOptions {
  /** Default ["locate", "planTrip"]; planTrip becomes "My trip" while a trip is active. */
  fabs?: FabRequest[];
  /**
   * The screen's overlay-slot request. The layout adds offline, trip-active, "Showing Downtown
   * Houston" (home without a fix) and "Demo location" (`?demoLoc=`) itself, by C.12 priority.
   */
  banner?: "search-this-area" | null;
  /** D5, D13. On /explore/trip with an active trip, the trip bar takes the search bar's place. */
  hideSearchBar?: boolean;
  /** D13's Arrived step: the trip bar reads "✓ Trip complete · arrived 11:00 PM". */
  tripBar?: "complete";
}

export interface SheetControl {
  snap: Snap;
  setSnap: (s: Snap) => void;
  setMinHalf: (px: number | undefined) => void;
}

interface ExploreContextValue extends SheetControl {
  minHalf?: number;
  setChrome: (opts: ExploreChromeOptions | null) => void;
  sheetRef: Ref<HTMLElement>;
  sheetEl: HTMLElement | null;
}

export const ExploreContext = createContext<ExploreContextValue | null>(null);

function useExploreContext(): ExploreContextValue {
  const ctx = useContext(ExploreContext);
  if (!ctx) throw new Error("Explore hooks must be used inside ExploreLayout");
  return ctx;
}

export function useSheet(): SheetControl {
  const { snap, setSnap, setMinHalf } = useExploreContext();
  return { snap, setSnap, setMinHalf };
}

/** The current sheet's root element, for screens that size the sheet to their content. */
export function useSheetElement(): HTMLElement | null {
  return useExploreContext().sheetEl;
}

/** Set on mount (and when the options change), cleared on unmount. */
export function useExploreChrome(opts: ExploreChromeOptions): void {
  const { setChrome } = useExploreContext();
  const key = JSON.stringify(opts);
  useEffect(() => {
    setChrome(JSON.parse(key) as ExploreChromeOptions);
    return () => setChrome(null);
  }, [key, setChrome]);
}

/** The layout's BottomSheet, filled by the current Explore screen. */
export function ExploreSheet(props: Omit<BottomSheetProps, "snap" | "onSnapChange" | "minHalf">) {
  const { snap, setSnap, minHalf, sheetRef } = useExploreContext();
  return <BottomSheet {...props} snap={snap} onSnapChange={setSnap} minHalf={minHalf} ref={sheetRef} />;
}
