import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { LngLat, TimeStatus } from '../data/types';

/**
 * Screens describe what the map should show as a "scene"; the one shared
 * MapView draws it. Screens never touch MapLibre directly.
 */

export interface SceneStop {
  id: string;
  position: LngLat;
  /** Shown inside the pin: "1", "2", "3". */
  label: string;
  /** Shown under the pin: "3 min". */
  caption?: string;
  active?: boolean;
  status?: TimeStatus;
}

export interface SceneRoutePath {
  kind: 'walk' | 'ride';
  coords: LngLat[];
}

export interface SceneRoute {
  id: string;
  /** Hex, or a CSS variable like "var(--route-a)" (resolved per theme). */
  color: string;
  paths: SceneRoutePath[];
  /** Letter badge on the line: "A". */
  badge?: { label: string; position: LngLat };
  selected?: boolean;
}

export interface MapScene {
  stops?: SceneStop[];
  routes?: SceneRoute[];
  destination?: { position: LngLat; label: string };
  /** Points the camera should fit when this changes. */
  fit?: LngLat[];
  /** Change to re-run the camera fit even when `fit` is equal. */
  fitKey?: string;
  /** Extra map padding in px from the top (search bar etc.). The sheet's height is added automatically. */
  paddingTop?: number;
  /** Where the +/- control sits from the top, in px. */
  controlsTop?: number;
  showControls?: boolean;
  onStopClick?: (id: string) => void;
  onRouteClick?: (id: string) => void;
}

interface MapContextValue {
  scene: MapScene;
  setScene: (s: MapScene) => void;
  /** Height in px of the sheet covering the bottom of the map. */
  bottomInset: number;
  setBottomInset: (px: number) => void;
  map: MapLibreMap | null;
  setMap: (m: MapLibreMap | null) => void;
}

const MapContext = createContext<MapContextValue | null>(null);

export const EMPTY_SCENE: MapScene = {};

export function MapSceneProvider({ children }: { children: ReactNode }) {
  const [scene, setScene] = useState<MapScene>(EMPTY_SCENE);
  const [bottomInset, setBottomInset] = useState(0);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const value = useMemo(
    () => ({ scene, setScene, bottomInset, setBottomInset, map, setMap }),
    [scene, bottomInset, map],
  );
  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

export function useMapContext(): MapContextValue {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error('useMapContext must be used inside MapSceneProvider');
  return ctx;
}

/** Optional access, for components (like BottomSheet) that also render outside map screens. */
export function useOptionalMapContext(): MapContextValue | null {
  return useContext(MapContext);
}

/**
 * Show a scene while the calling screen is mounted. Pass a memoised scene
 * (useMemo) so the map isn't redrawn on every render.
 */
export function useMapScene(scene: MapScene) {
  const { setScene } = useMapContext();
  useEffect(() => {
    setScene(scene);
  }, [scene, setScene]);
  useEffect(() => () => setScene(EMPTY_SCENE), [setScene]);
}
