// The one MapLibre map, mounted once by AppShell and kept across navigation. The canvas is
// hidden from assistive technology: the sheet list is the accessible equivalent of everything
// on the map (C.16). The attribution links stay reachable.

import type { Feature as GeoFeature, FeatureCollection, Geometry } from "geojson";
import maplibregl, { type GeoJSONSource, type LngLatBoundsLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import { t } from "../i18n/index.ts";
import type { ClientStop, LatLon } from "../api/types.ts";
import type { Fix } from "../state/location.tsx";
import type { MapScene } from "./scene.ts";
import { DEFAULT_CAMERA, LABEL_FONT, MAP_STYLE_URL, USER_ZOOM } from "./style.ts";
import styles from "./MapView.module.css";

type Feature = GeoFeature<Geometry, Record<string, string>>;
const collection = (features: Feature[]): FeatureCollection => ({ type: "FeatureCollection", features });
const point = (p: LatLon, props: Record<string, string>): Feature => ({ type: "Feature", properties: props, geometry: { type: "Point", coordinates: [p.lon, p.lat] } });
const line = (coords: [number, number][], props: Record<string, string>): Feature => ({ type: "Feature", properties: props, geometry: { type: "LineString", coordinates: coords } });

let stopsPromise: Promise<Map<string, ClientStop>> | null = null;
const stopsById = () =>
  (stopsPromise ??= fetch("/data/stops.json")
    .then((r) => r.json() as Promise<ClientStop[]>)
    .then((stops) => new Map(stops.map((s) => [s.id, s]))));

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function addSceneLayers(map: maplibregl.Map) {
  for (const id of ["scene-route", "scene-legs", "scene-points", "scene-user"]) map.addSource(id, { type: "geojson", data: collection([]) });
  map.addLayer({ id: "scene-route-casing", type: "line", source: "scene-route", paint: { "line-color": "#fff", "line-width": 10 }, layout: { "line-cap": "round", "line-join": "round" } });
  map.addLayer({ id: "scene-route", type: "line", source: "scene-route", paint: { "line-color": ["get", "color"], "line-width": 6 }, layout: { "line-cap": "round", "line-join": "round" } });
  map.addLayer({ id: "scene-ride-casing", type: "line", source: "scene-legs", filter: ["==", ["get", "kind"], "ride"], paint: { "line-color": "#fff", "line-width": 10 }, layout: { "line-cap": "round", "line-join": "round" } });
  map.addLayer({ id: "scene-ride", type: "line", source: "scene-legs", filter: ["==", ["get", "kind"], "ride"], paint: { "line-color": ["get", "color"], "line-width": 6 }, layout: { "line-cap": "round", "line-join": "round" } });
  map.addLayer({ id: "scene-walk", type: "line", source: "scene-legs", filter: ["==", ["get", "kind"], "walk"], paint: { "line-color": css("--c-walk-line"), "line-width": 5, "line-dasharray": [1, 2] }, layout: { "line-cap": "round" } });
  map.addLayer({
    id: "scene-points",
    type: "circle",
    source: "scene-points",
    paint: {
      "circle-radius": ["match", ["get", "kind"], "highlight", 12, "vehicle", 10, 8],
      "circle-color": ["match", ["get", "kind"], "destination", css("--c-dest-pin"), "origin", css("--c-origin-dot"), "vehicle", css("--c-brand-navy"), css("--c-stop-pin")],
      "circle-stroke-color": "#fff",
      "circle-stroke-width": 2,
    },
  });
  map.addLayer({
    id: "scene-labels",
    type: "symbol",
    source: "scene-points",
    filter: ["has", "label"],
    layout: { "text-field": ["get", "label"], "text-font": LABEL_FONT, "text-size": 14, "text-offset": [0, -1.8], "text-allow-overlap": true },
    paint: { "text-color": css("--c-text"), "text-halo-color": "#fff", "text-halo-width": 2 },
  });
  map.addLayer({
    id: "scene-user",
    type: "circle",
    source: "scene-user",
    paint: { "circle-radius": 8, "circle-color": css("--c-user-dot"), "circle-stroke-color": "#fff", "circle-stroke-width": 2 },
  });
}

const src = (map: maplibregl.Map, id: string) => map.getSource(id) as GeoJSONSource | undefined;

function showUser(map: maplibregl.Map, user: Fix | undefined) {
  src(map, "scene-user")?.setData(collection(user ? [point(user, {})] : []));
}

async function applyScene(map: maplibregl.Map, scene: MapScene, user: Fix | undefined, bottom: number) {
  src(map, "scene-route")?.setData(collection(scene.routeLine ? [line(scene.routeLine.coords, { color: scene.routeLine.color })] : []));
  src(map, "scene-legs")?.setData(collection((scene.legs ?? []).map((l) => line(l.coords, { kind: l.kind, color: l.color }))));
  showUser(map, user);
  const points: Feature[] = [
    ...(scene.markers ?? []).map((m) => point(m.point, { kind: m.kind, ...(m.label && { label: m.label }) })),
    ...(scene.vehicles ?? []).map((v) => point(v.point, { kind: "vehicle", label: v.label })),
  ];
  const highlight = scene.highlightStopId ? (await stopsById()).get(scene.highlightStopId) : undefined;
  if (highlight) points.push(point(highlight, { kind: "highlight", label: t("map.stopCallout", { id: highlight.id }) }));
  src(map, "scene-points")?.setData(collection(points));

  const padding = { top: 80, left: 32, right: 72, bottom: bottom + 24 };
  const f = scene.focus;
  if (f?.kind === "bounds" && f.bounds) {
    const [a, b] = f.bounds;
    const bounds: LngLatBoundsLike = [
      [Math.min(a.lon, b.lon), Math.min(a.lat, b.lat)],
      [Math.max(a.lon, b.lon), Math.max(a.lat, b.lat)],
    ];
    map.fitBounds(bounds, { padding, maxZoom: 17 });
  } else if (f) {
    const center = f.kind === "user" ? user : (f.point ?? highlight);
    if (center) map.easeTo({ center: [center.lon, center.lat], zoom: f.zoom ?? USER_ZOOM, padding });
  }
}

interface MapViewProps {
  scene: MapScene;
  user?: Fix;
  bottomPadding: number;
  /** Incremented by the Locate FAB: centre on the rider. */
  locateNonce: number;
  onCenterChange: (center: LatLon) => void;
}

export function MapView({ scene, user, bottomPadding, locateNonce, onCenterChange }: MapViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const ready = useRef(false);
  const latest = useRef({ scene, user, bottomPadding, onCenterChange });
  latest.current = { scene, user, bottomPadding, onCenterChange };

  useEffect(() => {
    const map = new maplibregl.Map({
      container: container.current!,
      style: MAP_STYLE_URL,
      ...DEFAULT_CAMERA,
      keyboard: false,
      attributionControl: { compact: true },
      pitchWithRotate: false,
      dragRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    map.getCanvas().tabIndex = -1;
    map.getCanvasContainer().setAttribute("aria-hidden", "true");
    mapRef.current = map;
    map.on("moveend", () => {
      const c = map.getCenter();
      latest.current.onCenterChange({ lat: c.lat, lon: c.lng });
    });
    map.on("load", () => {
      addSceneLayers(map);
      ready.current = true;
      const { scene, user, bottomPadding } = latest.current;
      void applyScene(map, scene, user, bottomPadding);
    });
    return () => {
      ready.current = false;
      map.remove();
    };
  }, []);

  // The camera moves only when the scene changes (or a "user" focus gets its first fix), never on
  // GPS jitter or while the sheet is dragged.
  useEffect(() => {
    const { user, bottomPadding } = latest.current;
    if (mapRef.current && ready.current) void applyScene(mapRef.current, scene, user, bottomPadding);
  }, [scene]);

  useEffect(() => {
    const { user, bottomPadding } = latest.current;
    if (locateNonce && user && mapRef.current)
      mapRef.current.easeTo({ center: [user.lon, user.lat], zoom: USER_ZOOM, padding: { top: 80, left: 32, right: 72, bottom: bottomPadding + 24 } });
  }, [locateNonce]);

  const hadUser = useRef(Boolean(user));
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const first = !hadUser.current && user;
    hadUser.current = Boolean(user);
    const { scene, bottomPadding } = latest.current;
    if (first && scene.focus?.kind === "user") void applyScene(map, scene, user, bottomPadding);
    else showUser(map, user);
  }, [user]);

  return <div ref={container} className={styles.map} />;
}
