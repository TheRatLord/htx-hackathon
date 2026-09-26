// The one MapLibre map, mounted once by AppShell and kept across navigation. The canvas is
// hidden from assistive technology: the sheet list is the accessible equivalent of everything
// on the map (C.16). The attribution links stay reachable.

import maplibregl, { type GeoJSONSource, type LngLatBoundsLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useTransitCenters } from "../api/hooks.ts";
import type { ClientStop, LatLon } from "../api/types.ts";
import { t } from "../i18n/index.ts";
import { haversineM } from "../lib/geo.ts";
import type { Fix } from "../state/location.tsx";
import { addMarkerImages } from "./layers/images.ts";
import { addSceneLayers, drawScene, showUser } from "./layers/scene.ts";
import { addTransitLayers, setHighlightedStop, showTransitCenters, STOPS_SOURCE, stopsCollection, transitAt } from "./layers/transit.ts";
import type { MapScene } from "./scene.ts";
import { ATTRIBUTION, DEFAULT_CAMERA, loadMapStyle, USER_ZOOM } from "./style.ts";
import styles from "./MapView.module.css";

let stopsPromise: Promise<ClientStop[]> | null = null;
const loadStops = () => (stopsPromise ??= fetch("/data/stops.json").then((r) => r.json() as Promise<ClientStop[]>));
let stopsByIdPromise: Promise<Map<string, ClientStop>> | null = null;
const stopsById = () => (stopsByIdPromise ??= loadStops().then((stops) => new Map(stops.map((s) => [s.id, s]))));

/** Label ranking is recomputed only when the anchor moves this far. */
const RESORT_M = 50;

const padding = (bottom: number) => ({ top: 80, left: 32, right: 72, bottom: bottom + 24 });

async function applyScene(map: maplibregl.Map, scene: MapScene, user: Fix | undefined, bottom: number) {
  showUser(map, user);
  const highlight = scene.highlightStopId ? (await stopsById()).get(scene.highlightStopId) : undefined;
  setHighlightedStop(map, highlight?.id);
  drawScene(map, scene, highlight, highlight ? t("map.stopCallout", { id: highlight.id }) : "");

  const f = scene.focus;
  if (f?.kind === "bounds" && f.bounds) {
    const [a, b] = f.bounds;
    const bounds: LngLatBoundsLike = [
      [Math.min(a.lon, b.lon), Math.min(a.lat, b.lat)],
      [Math.max(a.lon, b.lon), Math.max(a.lat, b.lat)],
    ];
    map.fitBounds(bounds, { padding: padding(bottom), maxZoom: 17 });
  } else if (f) {
    const center = f.kind === "user" ? user : (f.point ?? highlight);
    if (center) map.easeTo({ center: [center.lon, center.lat], zoom: f.zoom ?? USER_ZOOM, padding: padding(bottom) });
  }
}

/** Where stop-ID labels are ranked from: the rider, else the scene's focus, else the map centre. */
function labelAnchor(map: maplibregl.Map, scene: MapScene, user: Fix | undefined): LatLon {
  if (user) return user;
  if (scene.focus?.point) return scene.focus.point;
  const c = map.getCenter();
  return { lat: c.lat, lon: c.lng };
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
  const navigate = useNavigate();
  const tcs = useTransitCenters();
  const tcData = tcs.data?.transitCenters;
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const ready = useRef(false);
  const anchorRef = useRef<LatLon | null>(null);
  const latest = useRef({ scene, user, bottomPadding, onCenterChange, navigate, tcData });
  latest.current = { scene, user, bottomPadding, onCenterChange, navigate, tcData };

  const rankLabels = (map: maplibregl.Map) => {
    const { scene, user } = latest.current;
    const anchor = labelAnchor(map, scene, user);
    if (anchorRef.current && haversineM(anchorRef.current.lat, anchorRef.current.lon, anchor.lat, anchor.lon) < RESORT_M) return;
    anchorRef.current = anchor;
    void loadStops().then((stops) => (map.getSource(STOPS_SOURCE) as GeoJSONSource | undefined)?.setData(stopsCollection(stops, anchor)));
  };

  useEffect(() => {
    let map: maplibregl.Map | undefined;
    let cancelled = false;
    void loadMapStyle().then((style) => {
      if (cancelled) return;
      map = new maplibregl.Map({
        container: container.current!,
        style,
        ...DEFAULT_CAMERA,
        keyboard: false,
        attributionControl: false,
        pitchWithRotate: false,
        dragRotate: false,
      });
      map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: ATTRIBUTION }), "bottom-left");
      // Compact means collapsed to its (i) button until tapped.
      map.once("idle", () => container.current?.querySelector(".maplibregl-compact-show")?.classList.remove("maplibregl-compact-show"));
      map.touchZoomRotate.disableRotation();
      map.getCanvas().tabIndex = -1;
      map.getCanvasContainer().setAttribute("aria-hidden", "true");
      mapRef.current = map;
      const m = map;
      m.on("moveend", () => {
        const c = m.getCenter();
        latest.current.onCenterChange({ lat: c.lat, lon: c.lng });
        rankLabels(m);
      });
      // A pin opens its stop directly (no "Choose Direction" step, C.16).
      m.on("click", (e) => {
        const hit = transitAt(m, e.point);
        if (hit) latest.current.navigate(hit.kind === "tc" ? `/explore/tc/${encodeURIComponent(hit.id)}` : `/explore/stop/${encodeURIComponent(hit.id)}`);
      });
      m.on("load", () => {
        addMarkerImages(m);
        addTransitLayers(m);
        addSceneLayers(m, "stops-notch");
        ready.current = true;
        rankLabels(m);
        const { scene, user, bottomPadding, tcData } = latest.current;
        if (tcData) showTransitCenters(m, tcData);
        void applyScene(m, scene, user, bottomPadding);
      });
    });
    return () => {
      cancelled = true;
      ready.current = false;
      map?.remove();
    };
  }, []);

  // The camera moves only when the scene changes (or a "user" focus gets its first fix), never on
  // GPS jitter or while the sheet is dragged.
  useEffect(() => {
    const { user, bottomPadding } = latest.current;
    if (!mapRef.current || !ready.current) return;
    void applyScene(mapRef.current, scene, user, bottomPadding);
    rankLabels(mapRef.current);
  }, [scene]);

  useEffect(() => {
    const { user, bottomPadding } = latest.current;
    if (locateNonce && user && mapRef.current) mapRef.current.easeTo({ center: [user.lon, user.lat], zoom: USER_ZOOM, padding: padding(bottomPadding) });
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
    rankLabels(map);
  }, [user]);

  useEffect(() => {
    if (mapRef.current && ready.current && tcData) showTransitCenters(mapRef.current, tcData);
  }, [tcData]);

  // The attribution follows the sheet's top edge so it is never hidden under it.
  return <div ref={container} className={styles.map} style={{ ["--attribution-bottom" as string]: `${bottomPadding}px` }} />;
}
