// How screens drive the one shared map (spec C.16). A screen sets its scene on mount;
// the scene is cleared when the screen unmounts. "Search this area" is an overlay-slot item:
// request it with useExploreChrome({ banner: "search-this-area" }).

import { createContext, useContext, useEffect } from "react";
import type { LatLon } from "../api/types.ts";

export interface MapScene {
  /**
   * `labelRoomPx` (point focus only): the drawing at `point` needs this much room above it (a stop's
   * pin, pointer and tag), and must stay clear of the FAB column. The map draws the point that far
   * below the centre by half, and left by half the width the FAB column takes past the camera's
   * right padding, so the whole drawing sits in the middle of the visible map strip (D4, 07).
   */
  focus?: { kind: "user" | "point" | "bounds"; point?: LatLon; bounds?: [LatLon, LatLon]; zoom?: number; labelRoomPx?: number };
  /**
   * Stops the sheet lists (Home's cards, route near you, a place's stops): their ID chips are shown
   * first, before the stops nearest the rider, so every card's stop can be found on the map.
   */
  tagStopIds?: string[];
  /** Enlarged pin; on a scene with `legs` (walk, trip) also a white callout with the stop's name. */
  highlightStopId?: string;
  /** The selected route, [lon, lat] pairs. */
  routeLine?: { coords: [number, number][]; color: string };
  /**
   * Itinerary or walk legs, [lon, lat] pairs. Walks are always drawn dotted in --c-walk-line; a
   * ride needs its route colour. `label` (a ride's route name, "80") is drawn as a chip halfway
   * along the leg: with two rides in one colour, it shows where one bus ends and the next begins.
   */
  legs?: { coords: [number, number][]; kind: "walk" | "ride"; color?: string; label?: string }[];
  /** `place` is a searched place (D4, D8's start): a black pin. */
  markers?: { id: string; point: LatLon; kind: "origin" | "destination" | "place" | "board" | "alight" | "transfer" | "bay"; label?: string }[];
  /** A bus last seen more than 2 minutes ago is drawn grey; say so in its label ("Last seen 3 min ago"). */
  vehicles?: { id: string; point: LatLon; label: string; ageSeconds?: number }[];
}

/**
 * Two contexts, so a screen re-renders only for what it reads: `setScene` never changes, and the
 * map centre changes after each pan. (One value with the sheet height in it re-rendered every
 * Explore screen per pixel of a sheet drag.)
 */
export const MapSceneContext = createContext<((scene: MapScene) => void) | null>(null);
export const MapCenterContext = createContext<LatLon | undefined>(undefined);

/** `deps` work like useEffect's: the scene is re-applied when they change. */
export function useMapScene(scene: MapScene, deps: unknown[]): void {
  const setScene = useContext(MapSceneContext);
  if (!setScene) throw new Error("Map hooks must be used inside AppShell");
  useEffect(() => {
    setScene(scene);
    return () => setScene({});
  }, [setScene, ...deps]);
}

/** The map centre after the last pan or zoom (for "Search this area"). */
export function useMapCenter(): LatLon | undefined {
  return useContext(MapCenterContext);
}
