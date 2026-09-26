// The one MapLibre map, mounted once by AppShell and kept across navigation. The canvas is
// hidden from assistive technology: the sheet list is the accessible equivalent of everything
// on the map (C.16). The attribution's (i) button and its two links stay in the tab order.

import maplibregl, { type GeoJSONSource, type LngLatBoundsLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useTransitCenters } from "../api/hooks.ts";
import type { LatLon } from "../api/types.ts";
import { t, useLang } from "../i18n/index.ts";
import { haversineM } from "../lib/geo.ts";
import { loadStops } from "../lib/stops.ts";
import type { Fix } from "../state/location.tsx";
import { addMarkerImages } from "./layers/images.ts";
import { addSceneLayers, drawScene, hideSceneLabels, showUser, TALL_PINS } from "./layers/scene.ts";
import {
  addTransitLayers,
  LABELLED_NEAREST,
  rankFrom,
  setHighlightedStop,
  setNearLabels,
  setQuiet,
  showTransitCenters,
  STOPS_SOURCE,
  stopsCollection,
  transitAt,
} from "./layers/transit.ts";
import type { MapScene } from "./scene.ts";
import { ATTRIBUTION, DEFAULT_CAMERA, loadMapStyle, USER_ZOOM } from "./style.ts";
import styles from "./MapView.module.css";

/** Label ranking is recomputed only when the anchor moves this far. */
const RESORT_M = 50;
/** A fitted scene is fitted again this long after the sheet stops changing height. */
const SETTLE_MS = 300;
/** Right fit padding when a callout is drawn: the FAB column (72) plus half a street-name callout. */
const CALLOUT_RIGHT = 140;
/** The least map height a fit keeps between the paddings (at the full snap the sheet covers nearly all of it). */
const MIN_FIT_H = 64;

/**
 * Camera padding keeps fitted content clear of the chrome: at the top, the search bar (12 + 48),
 * the 8dp gap and the destination pin's 40dp body, which rises above its point. The bottom is
 * clamped so a fit never asks for more room than the canvas has.
 */
function padding(bottom: number, safeTop: number, canvasH: number): maplibregl.PaddingOptions {
  const top = safeTop + 108;
  return { top, left: 32, right: 72, bottom: Math.max(0, Math.min(bottom + 24, canvasH - top - MIN_FIT_H)) };
}

/**
 * A fitted box keeps room on the left as well as the right (FABs), so a marker label placed
 * beside a pin at the box's edge ("Transfer · #4789") stays on screen.
 */
function fitFocus(map: maplibregl.Map, [a, b]: [LatLon, LatLon], pad: maplibregl.PaddingOptions) {
  if (![a.lat, a.lon, b.lat, b.lon].every(Number.isFinite)) return;
  const bounds: LngLatBoundsLike = [
    [Math.min(a.lon, b.lon), Math.min(a.lat, b.lat)],
    [Math.max(a.lon, b.lon), Math.max(a.lat, b.lat)],
  ];
  const want = { top: pad.top ?? 0, bottom: pad.bottom ?? 0, left: Math.max(pad.left ?? 0, 88), right: Math.max(pad.right ?? 0, 88) };
  // MapLibre adds the padding an earlier easeTo left on the map to fitBounds' own (Home's
  // sheet-height bottom plus this one's could exceed the canvas: "Map cannot fit", and the camera
  // never moved to the route's stops). Ask only for the difference, so the total is `want`.
  const cur = map.getPadding();
  const delta = {
    top: want.top - (cur.top ?? 0),
    bottom: want.bottom - (cur.bottom ?? 0),
    left: want.left - (cur.left ?? 0),
    right: want.right - (cur.right ?? 0),
  };
  map.fitBounds(bounds, { padding: delta, maxZoom: 17 });
}

/** A walk or trip's callout is centred on its pin: keep the pin far enough from the FAB column for it to clear. */
function fitPad(scene: MapScene, pad: maplibregl.PaddingOptions): maplibregl.PaddingOptions {
  return scene.highlightStopId && scene.legs?.length ? { ...pad, right: Math.max(pad.right ?? 0, CALLOUT_RIGHT) } : pad;
}

/** Bumped by every applyScene call: a call that finishes after a newer one started does nothing. */
let sceneSeq = 0;

async function applyScene(map: maplibregl.Map, scene: MapScene, user: Fix | undefined, pad: maplibregl.PaddingOptions) {
  const seq = ++sceneSeq;
  showUser(map, user);
  // Without stops.json the scene still draws, just without the enlarged pin.
  const stops = scene.highlightStopId ? await loadStops().catch(() => undefined) : undefined;
  // stops.json (1.6 MB) can take seconds on a cold start: the rider may have moved on to another screen.
  if (seq !== sceneSeq) return;
  const highlight = scene.highlightStopId ? stops?.get(scene.highlightStopId) : undefined;
  setHighlightedStop(map, highlight?.id);
  // Walks and itineraries draw only their own stops: other pins, ID chips and TCs are noise there.
  setQuiet(map, Boolean(scene.legs?.length));
  // On a walk or trip the callout names the stop's street ("M L King Blvd", short enough to stay on
  // screen beside the FABs); elsewhere (the stop sheet) it marks which pin is the stop, as today's
  // "Stop: 342" does.
  const callout = !highlight ? "" : scene.legs?.length ? highlight.name.split(" @ ")[0] : t("map.stopCallout", { id: highlight.id });
  drawScene(map, scene, highlight, callout);

  const f = scene.focus;
  if (f?.kind === "bounds" && f.bounds) {
    fitFocus(map, f.bounds, fitPad(scene, pad));
  } else if (f) {
    const center = f.kind === "user" ? user : (f.point ?? highlight);
    if (center) map.easeTo({ center: [center.lon, center.lat], zoom: f.zoom ?? USER_ZOOM, padding: pad });
  }
}

type Rect = { l: number; t: number; r: number; b: number };
const overlaps = (a: Rect, b: Rect) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;

/**
 * What covers the map, in canvas px: the sheet (from its height) and every element marked
 * `data-map-obstacle` (the search bar and overlay slot, the FAB column).
 */
function obstacles(container: HTMLElement, sheetH: number): Rect[] {
  const box = container.getBoundingClientRect();
  const out: Rect[] = [{ l: -Infinity, t: box.height - sheetH, r: Infinity, b: Infinity }];
  for (const el of document.querySelectorAll<HTMLElement>("[data-map-obstacle]")) {
    const r = el.getBoundingClientRect();
    if (r.width && r.height) out.push({ l: r.left - box.left, t: r.top - box.top, r: r.right - box.left, b: r.bottom - box.top });
  }
  return out;
}

/** A stop's pin with its ID chip under it (or above it), in canvas px around the pin's point. */
const CHIP_BOX = { l: -34, t: -44, r: 34, b: 46 };
/**
 * Where a scene marker's label may land: centred above its marker (above the pin head for a tall
 * pin), or below it, as wide as its text (bold 14px, about 8px a character, wrapping at ~140px).
 */
function markerLabelBox(label: string, tall: boolean): Rect {
  const w = Math.min(label.length * 8, 140) / 2 + 6;
  return tall ? { l: -w, t: -100, r: w, b: 8 } : { l: -w, t: -50, r: w, b: 54 };
}

function clear(p: { x: number; y: number }, box: Rect, obs: Rect[], w: number): boolean {
  const r = { l: p.x + box.l, t: p.y + box.t, r: p.x + box.r, b: p.y + box.b };
  if (r.l < 0 || r.r > w || r.t < 0) return false;
  return !obs.some((o) => overlaps(r, o));
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
  const lang = useLang();
  const tcs = useTransitCenters();
  const tcData = tcs.data?.transitCenters;
  const container = useRef<HTMLDivElement>(null);
  const safeTopProbe = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const ready = useRef(false);
  const anchorRef = useRef<LatLon | null>(null);
  const hadUser = useRef(Boolean(user));
  const latest = useRef({ scene, user, bottomPadding, onCenterChange, navigate, tcData });
  latest.current = { scene, user, bottomPadding, onCenterChange, navigate, tcData };

  const rankLabels = (map: maplibregl.Map) => {
    const { scene, user } = latest.current;
    const anchor = labelAnchor(map, scene, user);
    if (anchorRef.current && haversineM(anchorRef.current.lat, anchorRef.current.lon, anchor.lat, anchor.lon) < RESORT_M) return;
    anchorRef.current = anchor;
    // A failed load is forgotten, so the next camera move or scene tries again.
    void loadStops().then(
      (stops) => (map.getSource(STOPS_SOURCE) as GeoJSONSource | undefined)?.setData(stopsCollection(stops.values(), anchor)),
      () => (anchorRef.current = null),
    );
  };
  /**
   * After the camera or the sheet settles: the ID chips go on the nearest stops whose chip is on
   * screen and clear of the sheet and chrome, and scene labels that would be covered are left out.
   */
  const placeLabels = (map: maplibregl.Map) => {
    const el = container.current;
    if (!el || !ready.current) return;
    const { scene, user, bottomPadding } = latest.current;
    const obs = obstacles(el, bottomPadding);
    const w = el.clientWidth;
    hideSceneLabels(
      map,
      (scene.markers ?? [])
        .filter((m) => m.label && !clear(map.project([m.point.lon, m.point.lat]), markerLabelBox(m.label, TALL_PINS.has(m.kind)), obs, w))
        .map((m) => m.id),
    );
    void loadStops().then((stops) => {
      if (!ready.current || mapRef.current !== map) return;
      const b = map.getBounds();
      const rank = rankFrom(labelAnchor(map, latest.current.scene, latest.current.user ?? user));
      const inView = [...stops.values()]
        .filter((s) => s.kind !== "rail" && s.id !== scene.highlightStopId && b.contains([s.lon, s.lat]))
        .sort((a, c) => rank(a) - rank(c));
      const ids: string[] = [];
      for (const s of inView) {
        if (ids.length === LABELLED_NEAREST) break;
        if (clear(map.project([s.lon, s.lat]), CHIP_BOX, obs, w)) ids.push(s.id);
      }
      setNearLabels(map, ids);
    }, () => undefined);
  };
  const pad = (bottom: number) => padding(bottom, safeTopProbe.current?.offsetHeight ?? 0, container.current?.clientHeight ?? 0);

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
      // Collapsed to its (i) button until tapped. MapLibre 5.x opens a compact attribution
      // (class maplibregl-compact-show) until the first drag; this class name is its internals.
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
        placeLabels(m);
      });
      // A pin opens its stop directly (no "Choose Direction" step, C.16).
      m.on("click", (e) => {
        const hit = transitAt(m, e.point);
        if (hit) latest.current.navigate(hit.kind === "tc" ? `/explore/tc/${encodeURIComponent(hit.id)}` : `/explore/stop/${encodeURIComponent(hit.id)}`);
      });
      m.on("load", () => {
        addMarkerImages(m);
        addTransitLayers(m);
        addSceneLayers(m);
        ready.current = true;
        rankLabels(m);
        const { scene, user, bottomPadding, tcData } = latest.current;
        if (tcData) showTransitCenters(m, tcData);
        // A fix that arrived before the map loaded is this scene's first: the user effect below
        // must not treat the next GPS update as the first fix and move the camera again.
        hadUser.current = Boolean(user);
        void applyScene(m, scene, user, pad(bottomPadding)).then(() => placeLabels(m));
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
    const map = mapRef.current;
    void applyScene(map, scene, user, pad(bottomPadding)).then(() => placeLabels(map));
    rankLabels(map);
    // `lang`: marker labels built by the screen are re-drawn in the new language.
  }, [scene, lang]);

  // The sheet moved to another snap: fit the scene again above it once it has settled (or, with
  // nothing to fit, re-place the labels the sheet may now cover).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const bounds = latest.current.scene.focus?.bounds;
    const id = setTimeout(() => {
      if (latest.current.scene.focus?.kind === "bounds" && bounds) fitFocus(map, bounds, fitPad(latest.current.scene, pad(bottomPadding)));
      else placeLabels(map);
    }, SETTLE_MS);
    return () => clearTimeout(id);
  }, [bottomPadding]);

  useEffect(() => {
    const { user, bottomPadding } = latest.current;
    if (locateNonce && user && mapRef.current) mapRef.current.easeTo({ center: [user.lon, user.lat], zoom: USER_ZOOM, padding: pad(bottomPadding) });
  }, [locateNonce]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const first = !hadUser.current && user;
    hadUser.current = Boolean(user);
    const { scene, bottomPadding } = latest.current;
    if (first && scene.focus?.kind === "user") void applyScene(map, scene, user, pad(bottomPadding)).then(() => placeLabels(map));
    else showUser(map, user);
    rankLabels(map);
  }, [user]);

  useEffect(() => {
    if (mapRef.current && ready.current && tcData) showTransitCenters(mapRef.current, tcData);
  }, [tcData]);

  return (
    <>
      {/* The attribution's (i) sits bottom-left, just above the sheet (clear of the FAB column on the right). */}
      <div ref={container} className={styles.map} style={{ ["--map-bottom" as string]: `${bottomPadding}px` }} />
      <div ref={safeTopProbe} className={styles.safeTop} aria-hidden="true" />
    </>
  );
}
