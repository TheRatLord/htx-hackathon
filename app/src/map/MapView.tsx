import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import * as maplibregl from './maplibre';
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Feature, FeatureCollection, LineString } from 'geojson';
import { MAP_BOUNDS, USER_POSITION } from '../data/geography';
import type { LngLat } from '../data/types';
import { useReducedMotion, useResolvedTheme } from '../app/hooks';
import { LABEL_PIXEL_RATIO, drawLabel } from './labels';
import type { LabelSpec } from './basemap';
import { LABEL_SPECS, PALETTES, ROUTE_HIT_LAYER, SCENE_ROUTES_SOURCE, buildStyle, type MapTheme } from './mapStyle';
import { useMapContext, type MapScene } from './scene';
import { DestinationPin, RouteLetterPin, StopPin, UserDot } from './markers';
import { MapControls } from './MapControls';
import './map.css';

export const INITIAL_VIEW = { center: USER_POSITION, zoom: 15.2 };

/** Resolve "var(--route-a)" to the current theme's hex. */
function resolveColor(color: string): string {
  const m = /^var\((--[\w-]+)\)$/.exec(color.trim());
  if (!m) return color;
  const v = getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim();
  return v || '#1c4f9c';
}

function routesToGeoJSON(scene: MapScene): FeatureCollection<LineString> {
  const features: Feature<LineString>[] = [];
  for (const r of scene.routes ?? []) {
    const color = resolveColor(r.color);
    for (const p of r.paths) {
      features.push({
        type: 'Feature',
        properties: { routeId: r.id, kind: p.kind, color, selected: !!r.selected, z: r.selected ? 2 : 1 },
        geometry: { type: 'LineString', coordinates: p.coords },
      });
    }
  }
  return { type: 'FeatureCollection', features };
}

function putLabelImage(map: MapLibreMap, spec: LabelSpec, theme: MapTheme) {
  const img = drawLabel(spec, PALETTES[theme]);
  if (map.hasImage(spec.id)) {
    const cur = map.getImage(spec.id);
    if (cur && cur.data.width === img.width && cur.data.height === img.height) {
      map.updateImage(spec.id, img);
      return;
    }
    map.removeImage(spec.id);
  }
  map.addImage(spec.id, img, { pixelRatio: LABEL_PIXEL_RATIO });
}

function addLabelImages(map: MapLibreMap, theme: MapTheme) {
  for (const spec of LABEL_SPECS) putLabelImage(map, spec, theme);
}

/** Wait (briefly) for the app font so labels are measured with it. */
function fontsReady(): Promise<unknown> {
  if (!document.fonts) return Promise.resolve();
  const loads = Promise.all([
    document.fonts.load("400 22px 'Atkinson Hyperlegible'"),
    document.fonts.load("700 22px 'Atkinson Hyperlegible'"),
  ]).catch(() => undefined);
  return Promise.race([loads, new Promise((r) => setTimeout(r, 1500))]);
}

/** Apply a new theme's colours without rebuilding sources. */
function applyTheme(map: MapLibreMap, theme: MapTheme) {
  const style = buildStyle(theme);
  for (const layer of style.layers) {
    if (!('paint' in layer) || !layer.paint || !map.getLayer(layer.id)) continue;
    // Paint keys come straight from our own style spec, so they are valid.
    const setPaint = map.setPaintProperty.bind(map) as (id: string, name: string, value: unknown) => void;
    for (const [k, v] of Object.entries(layer.paint)) setPaint(layer.id, k, v);
  }
  addLabelImages(map, theme);
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** The one shared map. Always mounted; screens change what it shows through useMapScene. */
export function MapView() {
  const { scene, setMap, map, bottomInset } = useMapContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const theme = useResolvedTheme();
  const reducedMotion = useReducedMotion();
  const themeRef = useRef(theme);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  // Create the map once (after the font is ready, so labels measure right).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!hasWebGL()) {
      setFailed(true);
      return;
    }
    let m: MapLibreMap | null = null;
    let cancelled = false;
    fontsReady().then(() => {
      if (cancelled) return;
      try {
        m = new maplibregl.Map({
          container,
          style: buildStyle(themeRef.current),
          center: INITIAL_VIEW.center,
          zoom: INITIAL_VIEW.zoom,
          minZoom: 12.5,
          maxZoom: 18.5,
          maxBounds: MAP_BOUNDS,
          attributionControl: false,
          pitchWithRotate: false,
          dragRotate: false,
          fadeDuration: 150,
        });
      } catch {
        setFailed(true);
        return;
      }
      const map = m;
      map.touchZoomRotate.disableRotation();
      map.keyboard.disableRotation();
      // Labels are generated on demand the first time the style asks for them.
      map.setMissingStyleImageResolver((id) => {
        const spec = LABEL_SPECS.find((l) => l.id === id);
        if (spec && !map.hasImage(spec.id)) putLabelImage(map, spec, themeRef.current);
      });
      map.on('load', () => setReady(true));
      map.on('click', ROUTE_HIT_LAYER, (e: MapLayerMouseEvent) => {
        const id = e.features?.[0]?.properties?.routeId as string | undefined;
        if (id) sceneRef.current.onRouteClick?.(id);
      });
      map.on('mouseenter', ROUTE_HIT_LAYER, () => {
        if (sceneRef.current.onRouteClick) map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', ROUTE_HIT_LAYER, () => {
        map.getCanvas().style.cursor = '';
      });
      setMap(map);
    });
    return () => {
      cancelled = true;
      setMap(null);
      setReady(false);
      m?.remove();
    };
  }, [setMap]);

  // Theme changes.
  useEffect(() => {
    themeRef.current = theme;
    if (map && ready) applyTheme(map, theme);
  }, [theme, map, ready]);

  // Route lines. Depends on theme so CSS-variable colours re-resolve.
  useEffect(() => {
    if (!map || !ready) return;
    const src = map.getSource(SCENE_ROUTES_SOURCE) as GeoJSONSource | undefined;
    src?.setData(routesToGeoJSON(scene));
  }, [map, ready, scene, theme]);

  // Camera: fit the scene's points above the sheet.
  const fitKey = scene.fit ? `${scene.fitKey ?? ''}|${JSON.stringify(scene.fit)}` : '';
  useEffect(() => {
    if (!map || !ready || !scene.fit || scene.fit.length === 0) return;
    const pts = scene.fit;
    const padding = {
      top: (scene.paddingTop ?? 96) + 24,
      bottom: bottomInset + 32,
      left: 56,
      right: 88,
    };
    const h = map.getContainer().clientHeight;
    // If the sheet leaves too little room, fit what we can.
    if (padding.top + padding.bottom > h - 120) padding.bottom = Math.max(32, h - 120 - padding.top);
    if (pts.length === 1) {
      map.easeTo({ center: pts[0] as LngLat, zoom: 15.5, padding, duration: reducedMotion ? 0 : 600 });
      return;
    }
    const b = new maplibregl.LngLatBounds(pts[0] as LngLat, pts[0] as LngLat);
    for (const p of pts) b.extend(p as LngLat);
    map.fitBounds(b, { padding, maxZoom: 16.5, duration: reducedMotion ? 0 : 700 });
    // bottomInset deliberately excluded: dragging the sheet shouldn't move the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, ready, fitKey, reducedMotion]);

  const markers: ReactNode[] = [];
  if (map && ready) {
    for (const r of scene.routes ?? []) {
      if (!r.badge) continue;
      markers.push(
        <MapMarker key={`route-${r.id}`} map={map} at={r.badge.position} z={r.selected ? 30 : 20}>
          <RouteLetterPin
            label={r.badge.label}
            color={r.color}
            selected={!!r.selected}
            onClick={scene.onRouteClick ? () => scene.onRouteClick?.(r.id) : undefined}
          />
        </MapMarker>,
      );
    }
    for (const s of scene.stops ?? []) {
      markers.push(
        <MapMarker key={`stop-${s.id}`} map={map} at={s.position} anchor="top" offsetY={-20} z={s.active ? 40 : 25}>
          <StopPin
            label={s.label}
            caption={s.caption}
            active={!!s.active}
            onClick={scene.onStopClick ? () => scene.onStopClick?.(s.id) : undefined}
          />
        </MapMarker>,
      );
    }
    if (scene.destination) {
      markers.push(
        <MapMarker key="destination" map={map} at={scene.destination.position} z={35}>
          <DestinationPin label={scene.destination.label} />
        </MapMarker>,
      );
    }
    markers.push(
      <MapMarker key="user" map={map} at={USER_POSITION} z={10}>
        <UserDot />
      </MapMarker>,
    );
  }

  return (
    <div className="map-root" data-theme-map={theme}>
      <div ref={containerRef} className="map-canvas" aria-label="Map of nearby streets. Drag to pan, pinch or scroll to zoom." role="region" />
      {failed && (
        <div className="map-fallback" role="note">
          <p>The map needs WebGL, which this browser has turned off.</p>
        </div>
      )}
      {markers}
      {ready && scene.showControls !== false && <MapControls />}
    </div>
  );
}

/** A DOM marker on the map whose content is React. */
function MapMarker({
  map,
  at,
  anchor = 'center',
  offsetY = 0,
  z = 1,
  children,
}: {
  map: MapLibreMap;
  at: LngLat;
  anchor?: maplibregl.PositionAnchor;
  offsetY?: number;
  z?: number;
  children: ReactNode;
}) {
  const [el] = useState(() => {
    const d = document.createElement('div');
    d.className = 'map-marker';
    return d;
  });
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    const mk = new maplibregl.Marker({ element: el, anchor, offset: [0, offsetY] }).setLngLat(at).addTo(map);
    markerRef.current = mk;
    return () => {
      mk.remove();
      markerRef.current = null;
    };
    // Recreate only if the map or anchor changes; position updates below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, el, anchor, offsetY]);

  useEffect(() => {
    markerRef.current?.setLngLat(at);
  }, [at]);

  useEffect(() => {
    el.style.zIndex = String(z);
  }, [el, z]);

  return createPortal(children, el);
}
