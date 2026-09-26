// The one MapLibre map, mounted once by AppShell and kept across navigation. The canvas is
// hidden from assistive technology: the sheet list is the accessible equivalent of everything
// on the map (C.16). The attribution's (i) button and its two links stay in the tab order.

import maplibregl, { type GeoJSONSource, type LngLatBoundsLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useTransitCenters } from "../api/hooks.ts";
import type { ClientStop, LatLon } from "../api/types.ts";
import { t, useLang } from "../i18n/index.ts";
import { haversineM } from "../lib/geo.ts";
import { loadStops } from "../lib/stops.ts";
import type { Fix } from "../state/location.tsx";
import { useSaved } from "../state/saved.ts";
import { addMarkerImages } from "./layers/images.ts";
import { addSceneLayers, drawScene, hideSceneLabels, legLabelId, setLabelSides, showUser, TALL_PINS } from "./layers/scene.ts";
import {
  addTransitLayers,
  LABELLED_NEAREST,
  rankFrom,
  setCoveredStops,
  setHighlightedStop,
  setNearLabels,
  type NearLabel,
  setQuiet,
  showTransitCenters,
  STOPS_SOURCE,
  stopsCollection,
  transitAt,
} from "./layers/transit.ts";
import { around, lineRects, overlaps, pointAlong, placeChip, placeSceneLabel, square, stopsWithin, type Pt, type Rect } from "./placement.ts";
import type { MapScene } from "./scene.ts";
import { ATTRIBUTION, DEFAULT_CAMERA, loadMapStyle, USER_ZOOM } from "./style.ts";
import styles from "./MapView.module.css";

/** Label ranking is recomputed only when the anchor moves this far (the rider or the scene's point). */
const RESORT_M = 50;
/**
 * Without either, the anchor is the map centre: re-ranking (re-sending all 8,797 stops to the map's
 * worker) on every pan made panning janky on low-end phones. The ranking only picks which of two
 * overlapping pins wins at zoom 15, so a coarse anchor is enough.
 */
const RESORT_CENTRE_M = 800;
/**
 * Below this much visible map (px), the attribution (i) is hidden: over a half-height sheet's map
 * strip it sat on the stops and the park the rider was looking at (07, 46). It shows whenever the
 * map is the main view (Show map, a peeked sheet), where it has room.
 */
const ATTRIB_MIN_MAP_H = 440;
/** A fit keeps its stops this far from the FAB column: a pin and its ID label (half a chip wide). */
const FAB_LABEL_ROOM = 40;
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
  const want = fabClear(map, { top: pad.top ?? 0, bottom: pad.bottom ?? 0, left: Math.max(pad.left ?? 0, 88), right: Math.max(pad.right ?? 0, 88) });
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

/**
 * The FAB column ("Plan Trip" is ~150px wide, not the 72px a round FAB needs) covers the bottom
 * right of the map. A fit keeps its content out from under it, by padding the right or the bottom,
 * whichever leaves the larger box: route near you drew card 1's stop under Plan Trip (05).
 */
function fabClear(map: maplibregl.Map, want: { top: number; bottom: number; left: number; right: number }) {
  const canvas = map.getContainer().getBoundingClientRect();
  const fabs = document.querySelector<HTMLElement>("[data-map-fabs]")?.getBoundingClientRect();
  if (!fabs?.width) return want;
  // Room for a stop's ID label beside its pin, too, not just the pin.
  const right = Math.max(want.right, canvas.right - fabs.left + FAB_LABEL_ROOM);
  const bottom = Math.max(want.bottom, canvas.bottom - fabs.top + FAB_LABEL_ROOM);
  const w = canvas.width - want.left;
  const h = canvas.height - want.top;
  const byRight = (w - right) * (h - want.bottom);
  const byBottom = (w - want.right) * (h - bottom);
  if (h - bottom < MIN_FIT_H) return { ...want, right };
  return byRight >= byBottom ? { ...want, right } : { ...want, bottom };
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
  // The callout says "Stop 342" on every screen (stop sheet, walk, trip), the number riders match to
  // the sign and to the stop sheet's title, as today's "Stop: 342" does.
  const callout = highlight ? t("map.stopCallout", { id: highlight.id }) : "";
  drawScene(map, scene, highlight, callout);

  const f = scene.focus;
  if (f?.kind === "bounds" && f.bounds) {
    fitFocus(map, f.bounds, fitPad(scene, pad));
  } else if (f) {
    const center = f.kind === "user" ? user : (f.point ?? highlight);
    if (center) map.easeTo({ center: [center.lon, center.lat], zoom: f.zoom ?? USER_ZOOM, padding: pad });
  }
}

/**
 * The map's own chrome, in canvas px: every element marked `data-map-obstacle` (the search bar and
 * overlay slot, the FAB column) and the attribution's (i).
 */
function chrome(container: HTMLElement): Rect[] {
  const box = container.getBoundingClientRect();
  const out: Rect[] = [];
  const els = [...document.querySelectorAll<HTMLElement>("[data-map-obstacle]"), ...container.querySelectorAll<HTMLElement>(".maplibregl-ctrl-attrib")];
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width && r.height) out.push({ l: r.left - box.left, t: r.top - box.top, r: r.right - box.left, b: r.bottom - box.top });
  }
  return out;
}

/** Where along a ride leg its route chip may go, in order of preference. */
const LEG_LABEL_AT = [0.5, 0.35, 0.65, 0.25, 0.75];

/** A pin's square (28dp from zoom 16, 20dp below) plus a little room, around its point. */
const PIN_BOX = square(16);
/**
 * A pin closer than this to the search bar or a FAB is left out (or, listed, nudged into view): a
 * pin touching "Plan Trip" read as part of the button (02, 259).
 */
const CHROME_GAP_BOX = square(24);
/** A tall pin's head (place, destination), 40dp above its point. */
const TALL_BOX: Rect = { l: -16, t: -40, r: 16, b: 0 };
/** The highlighted 36dp pin with its "Stop 342" callout above it. */
const HIGHLIGHT_BOX: Rect = { l: -70, t: -80, r: 70, b: 20 };
/** What a listed stop needs clear of the chrome: its pin, and room for an ID chip beside it. */
const TAGGED_ROOM: Rect = { l: -44, t: -20, r: 44, b: 20 };
/** A nudge never moves the map further than this (px): past it, the rider loses their bearings. */
const MAX_NUDGE = 160;

/**
 * The smallest pan that brings every listed stop in `blocked` out from under the chrome (Plan Trip,
 * Locate, the search bar), keeping the rider's dot and the other listed stops on the map strip.
 * Home's "Planear viaje", wider than "Plan Trip", hid stop 567 (card 2) in Spanish (42).
 */
function nudgeFor(blocked: Pt[], keep: Pt[], covering: Rect[], w: number, mapBottom: number): [number, number] | undefined {
  const options: [number, number][] = [];
  for (const p of blocked)
    for (const o of covering) {
      const need = around(p, TAGGED_ROOM);
      if (!overlaps(need, o)) continue;
      options.push([need.r - o.l + 4, 0], [need.l - o.r - 4, 0], [0, need.b - o.t + 4], [0, need.t - o.b - 4]);
    }
  options.sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
  const fits = (q: Pt, box: Rect) => {
    const r = around(q, box);
    return r.l >= 0 && r.r <= w && r.t >= 0 && r.b <= mapBottom && !covering.some((o) => overlaps(r, o));
  };
  return options.find(
    ([dx, dy]) =>
      Math.hypot(dx, dy) <= MAX_NUDGE &&
      blocked.every((p) => fits({ x: p.x - dx, y: p.y - dy }, CHROME_GAP_BOX)) &&
      keep.every((p) => fits({ x: p.x - dx, y: p.y - dy }, PIN_BOX)),
  );
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
  const savedIds = useSaved().stops.map((s) => s.id);
  const nudgeArmed = useRef(false);
  const latest = useRef({ scene, user, bottomPadding, onCenterChange, navigate, tcData, savedIds });
  latest.current = { scene, user, bottomPadding, onCenterChange, navigate, tcData, savedIds };

  const rankLabels = (map: maplibregl.Map) => {
    const { scene, user } = latest.current;
    const anchor = labelAnchor(map, scene, user);
    const fixed = Boolean(user ?? scene.focus?.point);
    if (anchorRef.current && haversineM(anchorRef.current.lat, anchorRef.current.lon, anchor.lat, anchor.lon) < (fixed ? RESORT_M : RESORT_CENTRE_M)) return;
    anchorRef.current = anchor;
    // A failed load is forgotten, so the next camera move or scene tries again.
    void loadStops().then(
      (stops) => {
        // The map may have been removed (unmount) while stops.json loaded.
        if (!ready.current || mapRef.current !== map) return;
        (map.getSource(STOPS_SOURCE) as GeoJSONSource | undefined)?.setData(stopsCollection(stops.values(), anchor));
      },
      () => (anchorRef.current = null),
    );
  };
  /**
   * After the camera or the sheet settles: every scene label and the ID chips of the listed and
   * nearest stops go on a side clear of the sheet and chrome (placement.ts); a stop whose pin sits
   * under the chrome is left out. When a listed stop is under the chrome, the map is nudged once
   * so it shows (`nudgeArmed`: once per scene or sheet snap, never after the rider's own pan).
   */
  const placeLabels = (map: maplibregl.Map) => {
    const el = container.current;
    if (!el || !ready.current) return;
    el.classList.toggle(styles.noAttrib, el.clientHeight - latest.current.bottomPadding < ATTRIB_MIN_MAP_H);
    const place = (stops?: Map<string, ClientStop>) => {
      if (!ready.current || mapRef.current !== map) return;
      const { scene, user, bottomPadding, savedIds } = latest.current;
      const w = el.clientWidth;
      const mapBottom = el.clientHeight - bottomPadding;
      const covering = chrome(el);
      const proj = (p: LatLon): Pt => map.project([p.lon, p.lat]);
      const onScreen = (r: Rect) => r.r > 0 && r.l < w && r.b > 0 && r.t < mapBottom;
      const hard: Rect[] = [{ l: -Infinity, t: mapBottom, r: Infinity, b: Infinity }, ...covering];
      if (user) hard.push(around(proj(user), square(14)));
      for (const m of scene.markers ?? []) hard.push(around(proj(m.point), TALL_PINS.has(m.kind) ? TALL_BOX : square(12)));
      for (const v of scene.vehicles ?? []) hard.push(around(proj(v.point), square(12)));
      const highlight = scene.highlightStopId ? stops?.get(scene.highlightStopId) : undefined;
      if (highlight) hard.push(around(proj(highlight), HIGHLIGHT_BOX));
      const lines = [...(scene.legs ?? []).map((l) => l.coords), ...(scene.routeLine ? [scene.routeLine.coords] : [])].flatMap((coords) =>
        lineRects(coords.map(([lon, lat]) => proj({ lat, lon }))).filter(onScreen),
      );

      // Scene labels first: the ride legs' route numbers ([80], [73]: the only cue where one bus
      // ends and the next begins), then the markers' ("Board 80 · #11424"). A leg's chip goes
      // halfway along it, else a third or a quarter of the way from either end: in Spanish the
      // wider "Transbordo · #4789" took the midpoint and both chips were dropped (44).
      const sides: Record<string, string> = {};
      const legPoints: Record<string, [number, number]> = {};
      const hidden: string[] = [];
      (scene.legs ?? []).forEach((l, i) => {
        if (!l.label) return;
        const id = legLabelId(i);
        for (const f of LEG_LABEL_AT) {
          const at = pointAlong(l.coords, f);
          if (!at) break;
          const spot = placeSceneLabel(proj({ lon: at[0], lat: at[1] }), l.label, "leg", { width: w, hard, soft: [] });
          if (!spot) continue;
          sides[id] = spot.key;
          legPoints[id] = at;
          hard.push(spot.box);
          return;
        }
        hidden.push(id);
      });
      for (const m of scene.markers ?? []) {
        if (!m.label) continue;
        const spot = placeSceneLabel(proj(m.point), m.label, TALL_PINS.has(m.kind) ? "tall" : "dot", { width: w, hard, soft: lines });
        if (!spot) hidden.push(m.id);
        else {
          sides[m.id] = spot.key;
          hard.push(spot.box);
        }
      }
      setLabelSides(map, sides, legPoints);
      hideSceneLabels(map, hidden);
      if (!stops) return;

      const b = map.getBounds();
      const rank = rankFrom(labelAnchor(map, scene, user));
      // The scene's own stops (the cards listed in the sheet) are tagged first, then the nearest.
      const tagged = scene.tagStopIds ?? [];
      const taggedAt = new Map(tagged.map((id, i) => [id, i]));
      const pinHalf = map.getZoom() >= 16 ? 14 : 10;
      const inView: { s: ClientStop; p: Pt; r: number }[] = [];
      const covered: string[] = [];
      const blocked: Pt[] = [];
      for (const s of stopsWithin(stops, b.getWest(), b.getSouth(), b.getEast(), b.getNorth())) {
        if (s.id === scene.highlightStopId) continue;
        const p = proj(s);
        if (covering.some((o) => overlaps(around(p, CHROME_GAP_BOX), o))) {
          covered.push(s.id);
          if (taggedAt.has(s.id) && p.y < mapBottom) blocked.push(p);
          continue;
        }
        if (s.kind !== "rail") inView.push({ s, p, r: taggedAt.get(s.id) ?? 1e6 + rank(s) });
      }
      inView.sort((a, c) => a.r - c.r);
      const visible = inView.filter(({ p }) => p.y < mapBottom);
      // A listed stop's pin is never covered by another chip; other pins are avoided where possible.
      const pins = visible.filter(({ s }) => !taggedAt.has(s.id)).map(({ p }) => around(p, square(pinHalf)));
      for (const { s, p } of visible) if (taggedAt.has(s.id)) hard.push(around(p, square(pinHalf)));
      const labels: NearLabel[] = [];
      // The sheet's own stops only, when it lists some: an unlisted stop's chip ("3425" over
      // Westheimer Rd, 03) was one more number to match against the cards, and none of them.
      const candidates = tagged.length ? inView.filter(({ s }) => taggedAt.has(s.id)) : inView;
      const want = tagged.length || LABELLED_NEAREST;
      if (map.getZoom() >= 16)
        for (const { s, p } of candidates) {
          if (labels.length >= want) break;
          const saved = savedIds.includes(s.id);
          const spot = placeChip(p, s.id, { width: w, hard, soft: [...pins, ...lines] }, saved ? 16 : 0);
          if (spot) {
            labels.push({ stop: s, side: spot.key, saved });
            hard.push(spot.box);
          } else if (taggedAt.has(s.id) && covering.some((o) => overlaps(around(p, TAGGED_ROOM), o))) blocked.push(p);
        }
      setCoveredStops(map, covered);
      setNearLabels(map, labels);

      if (!nudgeArmed.current || map.isMoving()) return;
      nudgeArmed.current = false;
      if (!blocked.length) return;
      const keep = [...inView.filter(({ s }) => taggedAt.has(s.id)).map(({ p }) => p), ...(user ? [proj(user)] : [])].filter((p) => p.y < mapBottom);
      const shift = nudgeFor(blocked, keep, covering, w, mapBottom);
      if (shift) map.panBy(shift, { duration: 300 });
    };
    void loadStops().then(place, () => place());
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
        nudgeArmed.current = true;
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
    nudgeArmed.current = true;
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
      nudgeArmed.current = true;
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
    if (first && scene.focus?.kind === "user") nudgeArmed.current = true;
    if (first && scene.focus?.kind === "user") void applyScene(map, scene, user, pad(bottomPadding)).then(() => placeLabels(map));
    else showUser(map, user);
    rankLabels(map);
  }, [user]);

  useEffect(() => {
    if (mapRef.current && ready.current && tcData) showTransitCenters(mapRef.current, tcData);
  }, [tcData]);

  // A stop saved or unsaved: its chip gains or loses the star.
  useEffect(() => {
    if (mapRef.current && ready.current) placeLabels(mapRef.current);
  }, [savedIds.join()]);

  return (
    <>
      {/* The attribution's (i) sits bottom-left, just above the sheet (clear of the FAB column on the right). */}
      <div ref={container} className={styles.map} style={{ ["--map-bottom" as string]: `${bottomPadding}px` }} />
      <div ref={safeTopProbe} className={styles.safeTop} aria-hidden="true" />
    </>
  );
}
