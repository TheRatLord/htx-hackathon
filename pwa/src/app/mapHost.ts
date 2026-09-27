// What ExploreLayout needs from the persistent map that AppShell owns (C.16: one map, never
// re-created on navigation).

import { createContext, useContext } from "react";

export interface MapHost {
  /** The Explore sheet's height, so the camera and FABs keep clear of it. */
  sheetH: number;
  setSheetH: (px: number) => void;
  /** Shows the map while an Explore layout is mounted; it stays alive (hidden) otherwise. */
  setMapVisible: (visible: boolean) => void;
  /** The Locate FAB: centre on the rider and follow them until they drag the map or change screens. */
  locate: () => void;
  /** Follow mode is on: the Locate FAB shows it. */
  following: boolean;
}

export const MapHostContext = createContext<MapHost | null>(null);

export function useMapHost(): MapHost {
  const ctx = useContext(MapHostContext);
  if (!ctx) throw new Error("useMapHost must be used inside AppShell");
  return ctx;
}
