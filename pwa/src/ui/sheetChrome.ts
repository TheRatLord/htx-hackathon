// What a BottomSheet hands its SheetHeader: the Back action and the one snap toggle, so they sit
// on the title row instead of a row of their own (C.6/C.7).

import { createContext } from "react";

export interface SheetToggle {
  /** "Show list" or "Show map": the accessible name of the chevron button. */
  label: string;
  icon: "expand_less" | "expand_more";
  expanded: boolean;
  onPress: () => void;
}

export interface SheetChrome {
  onBack?: () => void;
  toggle: SheetToggle;
  /** A SheetHeader in the sheet calls this on mount; the sheet then drops its own button row. */
  host: () => () => void;
}

export const SheetChromeContext = createContext<SheetChrome | null>(null);
