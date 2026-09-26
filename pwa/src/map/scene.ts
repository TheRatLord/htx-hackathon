// How screens drive the one shared map (spec C.16). A screen sets its scene on mount;
// the scene is cleared when the screen unmounts. "Search this area" is an overlay-slot item:
// request it with useExploreChrome({ banner: "search-this-area" }).

import { createContext, useContext, useEffect } from "react";
import type { LatLon } from "../api/types.ts";

export interface MapScene {
  focus?: { kind: "user" | "point" | "bounds"; point?: LatLon; bounds?: [LatLon, LatLon]; zoom?: number };
  /** Enlarged pin plus today's white callout "Stop: 342". */
  highlightStopId?: string;
  /** The selected route, [lon, lat] pairs. */
  routeLine?: { coords: [number, number][]; color: string };
  /** Itinerary or walk legs, [lon, lat] pairs. Walks are always drawn in --c-walk-line; a ride needs its route colour. */
  legs?: { coords: [number, number][]; kind: "walk" | "ride"; color?: string }[];
  /** `place` is a searched place (D4, D8's start): a black pin. */
  markers?: { id: string; point: LatLon; kind: "origin" | "destination" | "place" | "board" | "alight" | "transfer" | "bay"; label?: string }[];
  /** A bus last seen more than 2 minutes ago is drawn grey; say so in its label ("Last seen 3 min ago"). */
  vehicles?: { id: string; point: LatLon; label: string; ageSeconds?: number }[];
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
  if (!ctx) throw new Error("Map hooks must be used inside AppShell");
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
