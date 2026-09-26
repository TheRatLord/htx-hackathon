// How screens drive the one shared map (spec C.16). A screen sets its scene on mount;
// the scene is cleared when the screen unmounts.

import { createContext, useContext, useEffect } from "react";
import type { LatLon } from "../api/types.ts";

export interface MapScene {
  focus?: { kind: "user" | "point" | "bounds"; point?: LatLon; bounds?: [LatLon, LatLon]; zoom?: number };
  /** Enlarged pin plus today's white callout "Stop: 342". */
  highlightStopId?: string;
  /** The selected route, [lon, lat] pairs. */
  routeLine?: { coords: [number, number][]; color: string };
  /** Itinerary or walk legs, [lon, lat] pairs. */
  legs?: { coords: [number, number][]; kind: "walk" | "ride"; color: string }[];
  markers?: { id: string; point: LatLon; kind: "origin" | "destination" | "board" | "alight" | "transfer" | "bay"; label?: string }[];
  vehicles?: { id: string; point: LatLon; label: string }[];
  showSearchThisArea?: boolean;
}

export interface MapContextValue {
  scene: MapScene;
  setScene: (scene: MapScene) => void;
  /** Current sheet height in px, so camera moves keep content above the sheet. */
  padding: { bottom: number };
  /** The map centre after the last pan or zoom (for "Search this area"). */
  center?: LatLon;
}

export const MapContext = createContext<MapContextValue | null>(null);

function useMapContext(): MapContextValue {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error("Map hooks must be used inside ExploreLayout");
  return ctx;
}

/** `deps` work like useEffect's: the scene is re-applied when they change. */
export function useMapScene(scene: MapScene, deps: unknown[]): void {
  const { setScene } = useMapContext();
  useEffect(() => {
    setScene(scene);
    return () => setScene({});
  }, [setScene, ...deps]);
}

export function useMapPadding(): { bottom: number } {
  return useMapContext().padding;
}

export function useMapCenter(): LatLon | undefined {
  return useMapContext().center;
}
