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
import { addSceneLayers, drawScene, hideSceneLabels, legLabelId, legLine, type MarkerMerge, setLabelSides, showUser, TALL_PINS } from "./layers/scene.ts";
import {
  addTransitLayers,
  LABELLED_NEAREST,
  rankFrom,
  setClusters,
  setCoveredStops,
  setHighlightedStop,
  setNearLabels,
  type NearLabel,
  setQuiet,
  showTransitCenters,
  STOPS_SOURCE,
  type StopCluster,
  stopsCollection,
  transitAt,
} from "./layers/transit.ts";
import { around, chipRoom, roomAround, clusterLabel, clusterPoints, lineRects, overlaps, pointAlong, placeChip, placeSceneLabel, square, stopsWithin, type Pt, type Rect } from "./placement.ts";
import type { MapScene } from "./scene.ts";
import { ATTRIBUTION, DEFAULT_CAMERA, loadMapStyle, USER_ZOOM } from "./style.ts";
import styles from "./MapView.module.css";

type SceneMarker = NonNullable<MapScene["markers"]>[number];

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
/** Labels are placed again this long after the map's chrome stops changing size. */
const CHROME_SETTLE_MS = 200;
/** A fitted scene is fitted again this long after the sheet stops changing height. */
const SETTLE_MS = 300;
/** Right fit padding when a callout is drawn: the FAB column (72) plus half a street-name callout. */
const CALLOUT_RIGHT = 140;
/** The least map height a fit keeps between the paddings (at the full snap the sheet covers nearly all of it). */
const MIN_FIT_H = 64;
/** Room above the top chrome for a label drawn above the topmost pin ("Board 80 · #11424"). */
const TOP_LABEL_ROOM = 44;
/** Extra room above the sheet on a trip's map, for a label under its lowest ring. */
const BOTTOM_LABEL_ROOM = 24;
/** A fit keeps its pins (and a tag's pointer) this far above the sheet's edge. */
const SHEET_CLEAR = 40;
/** The search bar's usual bottom edge, before the layout can be measured. */
const SEARCH_BAR_H = 64;
/** A point focus with label room keeps its drawing this far (px) left of the FAB column. */
const FAB_GAP = 16;
/** The camera's side paddings (see padding()). */
const PAD_LEFT = 32;
const PAD_RIGHT = 72;

/**
 * Camera padding keeps fitted content clear of the chrome: at the top, the search bar (12 + 48),
 * the 8dp gap and the destination pin's 40dp body, which rises above its point. The bottom is
 * clamped so a fit never asks for more room than the canvas has.
 */
function padding(bottom: number, topChrome: number, canvasH: number): maplibregl.PaddingOptions {
  const top = topChrome + TOP_LABEL_ROOM;
  return { top, left: PAD_LEFT, right: PAD_RIGHT, bottom: Math.max(0, Math.min(bottom + SHEET_CLEAR, canvasH - top - MIN_FIT_H)) };
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
  const top = pad.top ?? 0;
  // Never ask for more padding than the canvas has ("Map cannot fit" leaves the camera where it was).
  const bottom = Math.max(0, Math.min(pad.bottom ?? 0, map.getContainer().clientHeight - top - MIN_FIT_H));
  const want = fabClear(map, { top, bottom, left: Math.max(pad.left ?? 0, 88), right: Math.max(pad.right ?? 0, 88) });
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

/**
 * Where a point focus is drawn, in px from the padded centre (easeTo's `offset`): half its label
 * room lower, and half the FAB column's overhang past the right padding to the left. The FAB column
 * is measured here, when the camera moves, so a later width change (fonts, language, text size)
 * never moves the camera on its own.
 */
function pointOffset(map: maplibregl.Map, labelRoomPx: number | undefined, pad: maplibregl.PaddingOptions): [number, number] {
  if (!labelRoomPx) return [0, 0];
  const canvas = map.getContainer().getBoundingClientRect();
  const fabs = document.querySelector<HTMLElement>("[data-map-fabs]")?.getBoundingClientRect();
  const overhang = fabs?.width ? Math.max(0, canvas.right - fabs.left + FAB_GAP - (pad.right ?? PAD_RIGHT)) : 0;
  return [-overhang / 2, labelRoomPx / 2];
}

/** A walk or trip's callout is centred on its pin: keep the pin far enough from the FAB column for it to clear. */
function fitPad(scene: MapScene, pad: maplibregl.PaddingOptions): maplibregl.PaddingOptions {
  if (!scene.legs?.length) return pad;
  // A trip's marker labels ("Transfer · #4789") may go below their ring: keep a label's height
  // above the sheet, or at 360x640 the transfer had no label at all (24-360).
  const out = { ...pad, bottom: (pad.bottom ?? 0) + BOTTOM_LABEL_ROOM };
  return scene.highlightStopId ? { ...out, right: Math.max(pad.right ?? 0, CALLOUT_RIGHT) } : out;
}

/** Per-map camera state, kept in a ref on the MapView that owns the map (never shared between maps). */
interface SceneState {
  /**
   * The bounds a trip scene was last fitted to. Live trip frames each step once, then redraws without
   * a focus: when the sheet settled at another height the target stop stayed half under it (26).
   */
  tripBounds?: [LatLon, LatLon];
  /** Bumped by every applyScene call: a call that finishes after a newer one started does nothing. */
  seq: number;
}

/** What a scene's camera move depends on: two scenes with the same key frame the same view. */
function focusKey(scene: MapScene): string {
  return JSON.stringify([scene.focus ?? null, scene.focus?.kind === "point" && !scene.focus.point ? (scene.highlightStopId ?? null) : null]);
}

async function applyScene(state: SceneState, map: maplibregl.Map, scene: MapScene, user: Fix | undefined, pad: maplibregl.PaddingOptions, fit = true) {
  const seq = ++state.seq;
  showUser(map, user);
  // Without stops.json the scene still draws, just without the enlarged pin and the route's stops.
  const stops = scene.highlightStopId || scene.routeLine?.stopIds?.length ? await loadStops().catch(() => undefined) : undefined;
  // stops.json (1.6 MB) can take seconds on a cold start: the rider may have moved on to another screen.
  if (seq !== state.seq) return;
  const highlight = scene.highlightStopId ? stops?.get(scene.highlightStopId) : undefined;
  setHighlightedStop(map, highlight?.id);
  // Walks and itineraries draw only their own stops: other pins, ID chips and TCs are noise there.
  setQuiet(map, Boolean(scene.legs?.length));
  // The callout says "Stop 342" on every screen (stop sheet, walk, trip), the number riders match to
  // the sign and to the stop sheet's title, as today's "Stop: 342" does.
  const callout = highlight ? t("map.stopCallout", { id: highlight.id }) : "";
  const routeStops = (scene.routeLine?.stopIds ?? []).flatMap((id) => stops?.get(id) ?? []);
  drawScene(map, scene, highlight, callout, routeStops);

  const f = fit ? scene.focus : undefined;
  if (scene.focus) state.tripBounds = scene.focus.kind === "bounds" && scene.legs?.length ? scene.focus.bounds : undefined;
  else if (!scene.legs?.length) state.tripBounds = undefined;
  if (f?.kind === "bounds" && f.bounds) {
    fitFocus(map, f.bounds, fitPad(scene, pad));
  } else if (f) {
    const center = f.kind === "user" ? user : (f.point ?? highlight);
    if (center) map.easeTo({ center: [center.lon, center.lat], zoom: f.zoom ?? USER_ZOOM, padding: pad, offset: pointOffset(map, f.kind === "point" ? f.labelRoomPx : undefined, pad) });
  }
}

/**
 * Where the map's top chrome (search bar, trip bar, banner) ends, in canvas px, or the safe area's
 * edge when a screen hides it: the itinerary has no search bar, and keeping its 108px at 360x640
 * squeezed the whole trip into 64px, too small for the [73] chip and "Transfer · #4789" (24-360).
 */
function topChrome(container: HTMLElement | null, safeTop: number): number {
  if (!container) return safeTop + SEARCH_BAR_H;
  const box = container.getBoundingClientRect();
  let bottom = safeTop;
  for (const el of document.querySelectorAll<HTMLElement>("[data-map-obstacle]:not([data-map-fabs])")) {
    if (!el.childElementCount) continue;
    const r = el.getBoundingClientRect();
    if (r.height) bottom = Math.max(bottom, r.bottom - box.top);
  }
  return bottom;
}

/**
 * The map's own chrome, in canvas px: every element marked `data-map-obstacle` (the search bar and
 * overlay slot, the FAB column) and the attribution's (i).
 */
function chrome(container: HTMLElement): (Rect & { fab?: boolean })[] {
  const box = container.getBoundingClientRect();
  const out: (Rect & { fab?: boolean })[] = [];
  const els = [...document.querySelectorAll<HTMLElement>("[data-map-obstacle]"), ...container.querySelectorAll<HTMLElement>(".maplibregl-ctrl-attrib")];
  for (const el of els) {
    // The FAB column by its buttons: the column is as wide as "Plan Trip", and a pin beside the
    // small Locate button above it is not under anything.
    const fab = el.hasAttribute("data-map-fabs");
    for (const part of fab && el.childElementCount ? [...el.children] : [el]) {
      const r = part.getBoundingClientRect();
      if (r.width && r.height) out.push({ l: r.left - box.left, t: r.top - box.top, r: r.right - box.left, b: r.bottom - box.top, ...(fab && { fab: true }) });
    }
  }
  return out;
}

/** Where along a ride leg its route chip may go, in order of preference. */
const LEG_LABEL_AT = [0.5, 0.35, 0.65, 0.25, 0.75];

/** Two listed stops closer than this (px) whose tags can't both stand above their pins merge into one. */
const MERGE_PX = 72;
/** Past this zoom a cluster tap opens its first stop instead of zooming in. */
const CLUSTER_MAX_ZOOM = 19;
/** Pins closer than this (px) are drawn as one cluster pin tagged with every ID ("567 · 259"). */
const CLUSTER_PX = 40;
/** A listed stop, its tag or a place pin is kept this far (px) from the FAB column, search bar and sheet edge. */
const CLEAR_PX = 40;
/** A tag keeps this far (px) from the search bar. */
const TOP_CLEAR_PX = 4;
/** A tag keeps this far (px) from the screen's sides. */
const EDGE_PX = 4;
const grow = (r: Rect, by: number): Rect => ({ l: r.l - by, t: r.t - by, r: r.r + by, b: r.b + by });

/** A pin's square (28dp from zoom 16, 20dp below) plus a little room, around its point. */
const PIN_BOX = square(16);
/**
 * A pin closer than this to the search bar or a FAB is left out (or, listed, nudged into view): a
 * pin touching "Plan Trip" read as part of the button (02, 259).
 */
const CHROME_GAP = 24;
const CHROME_GAP_BOX = square(CHROME_GAP);
/**
 * What a nudge keeps between a pin and the chrome: a pixel more than the hiding rule, so a pin
 * nudged to the very edge of the gap is not hidden again by the pan's rounding (567 in Spanish, 02).
 */
const NUDGE_GAP_BOX = square(CHROME_GAP + 2);
/** A tall pin's head (place, destination), 40dp above its point. */
const TALL_BOX: Rect = { l: -16, t: -40, r: 16, b: 0 };
/** The highlighted 36dp pin with its "Stop 342" callout above it. */
const HIGHLIGHT_BOX: Rect = { l: -70, t: -80, r: 70, b: 20 };
/** The least a tag needs above its pin: its height, and its pointer's end over the pin. */
const TAG_MIN_ROOM: Rect = { l: -16, t: -46, r: 16, b: 16 };
/** Nudges per scene or sheet snap: a second one finishes what the first began (a pair merged into one tag after the first). */
const NUDGES = 3;
/** A nudge never moves the map further than this (px): past it, the rider loses their bearings. */
const MAX_NUDGE = 160;

/** `guard`: what this one must clear, when not the listed stops' (a place pin needs less room than a tag). */
type Blocked = { p: Pt; room: Rect; guard?: Rect[]; need?: "tag" | "pin" | "near" };

/**
 * The smallest pan that brings every listed stop in `blocked` out from under the chrome (Plan Trip,
 * Locate, the search bar), keeping the rider's dot and the other listed stops on the map strip.
 * Home's "Planear viaje", wider than "Plan Trip", hid stop 567 (card 2) in Spanish (42).
 */

function nudgeFor(blocked: Blocked[], keep: Blocked[], guard: Rect[], covering: Rect[], w: number, mapBottom: number, strict = false): [number, number] | undefined {
  if (!blocked.length) return undefined;
  const options: [number, number][] = [];
  const xs: number[] = [];
  const ys: number[] = [];
  for (const { p, room, guard: own } of blocked)
    for (const o of own ?? guard) {
      const need = around(p, room);
      if (!overlaps(need, o)) continue;
      xs.push(need.r - o.l + 4, need.l - o.r - 4);
      ys.push(need.b - o.t + 4, need.t - o.b - 4);
    }
  // One axis, else both: a tag in the top-left corner needs to come down and in (03, ★ 2958).
  for (const dx of xs) options.push([dx, 0]);
  for (const dy of ys) options.push([0, dy]);
  for (const dx of xs) for (const dy of ys) options.push([dx, dy]);
  options.sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
  const fits = (q: Pt, box: Rect) => {
    const r = around(q, box);
    return r.l >= 0 && r.r <= w && r.t >= 0 && r.b <= mapBottom && !covering.some((o) => overlaps(r, o));
  };
  const clear = (q: Pt, room: Rect, own?: Rect[]) => !(own ?? guard).some((o) => overlaps(around(q, room), o));
  // With `strict`, what is clear of the margins now stays clear: two nudges for margins alone must
  // not undo each other (06).
  const keepClear = keep.map(({ p, room }) => strict && clear(p, room));
  // The hiding rule (placeStopTags): a pin this close to the chrome is left out.
  const shown = (q: Pt) => !covering.some((o) => overlaps(around(q, CHROME_GAP_BOX), o));
  const keepShown = keep.map(({ p }) => shown(p));
  return options.find(
    ([dx, dy]) =>
      Math.hypot(dx, dy) <= MAX_NUDGE &&
      blocked.every(({ p, room, guard: own }) => fits({ x: p.x - dx, y: p.y - dy }, own ? square(4) : NUDGE_GAP_BOX) && clear({ x: p.x - dx, y: p.y - dy }, room, own)) &&
      // A kept pin must stay clear of the chrome by the hiding rule's gap, not just keep its tag's
      // room: bringing 567 out from under "Planear viaje" pushed card 1's 246 under the search bar,
      // where it was hidden (02-es-360).
      keep.every(({ p, room }, i) => {
        const q = { x: p.x - dx, y: p.y - dy };
        return fits(q, room) && (!keepShown[i] || shown(q)) && (!keepClear[i] || clear(q, room));
      }),
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
  const sceneState = useRef<SceneState>({ seq: 0 });
  const ready = useRef(false);
  const anchorRef = useRef<LatLon | null>(null);
  const hadUser = useRef(Boolean(user));
  const savedIds = useSaved().stops.map((s) => s.id);
  const nudgeArmed = useRef(0);
  /** Set when no nudge could make room above a listed stop: its tag may then go beside its pin. */
  const besideOk = useRef(false);
  /** A new scene, sheet snap or chrome change: the map may be nudged again, above-only tags first. */
  const arm = () => {
    nudgeArmed.current = NUDGES;
    besideOk.current = false;
  };
  /** The focus the camera last moved to (see focusKey). */
  const lastFocus = useRef<string | undefined>(undefined);
  /** The rider panned or zoomed the map by hand since the camera last fitted a scene. */
  const riderMoved = useRef(false);
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
   * so it shows (`nudgeArmed`: up to NUDGES times per scene or sheet snap, never after the rider's own pan).
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
      const unproj = (p: Pt): [number, number] => map.unproject([p.x, p.y]).toArray() as [number, number];
      const onScreen = (r: Rect) => r.r > 0 && r.l < w && r.b > 0 && r.t < mapBottom;
      // What a listed stop, its tag or a place pin must stay CLEAR_PX clear of: the chrome and the sheet's edge.
      const guard: Rect[] = [
        // The FAB column by CLEAR_PX (a pin beside "Plan Trip" read as part of the button); the search bar by less.
        ...covering.map((o) => grow(o, o.fab ? CLEAR_PX - CHROME_GAP : TOP_CLEAR_PX)),
        { l: -Infinity, t: mapBottom - CLEAR_PX, r: Infinity, b: Infinity },
        // The screen's sides: a tag cut by the edge is no tag.
        { l: -Infinity, t: -Infinity, r: EDGE_PX, b: Infinity },
        { l: w - EDGE_PX, t: -Infinity, r: Infinity, b: Infinity },
      ];
      /** Listed stops (with the room their tag takes) and place pins the map should be nudged to show. */
      const blocked: Blocked[] = [];
      /** Listed stops the nudge must keep on the map strip. */
      const keepPts: Blocked[] = [];

      // Route near you tags its stops' markers: those closer than CLUSTER_PX merge into one, tagged
      // with every ID ("8249 · 8895"), so no tag floats between two pins (06).
      const stopTags = Boolean(scene.tagStopIds);
      const tagOrder = new Map((scene.tagStopIds ?? []).map((id, i) => [id, i]));
      const isStopMarker = (m: SceneMarker) => stopTags && Boolean(m.label) && (m.kind === "board" || m.kind === "bay" || m.kind === "alight");
      const merges: Record<string, MarkerMerge> = {};
      const markerAt = new Map<string, Pt>();
      const stopMarkers = (scene.markers ?? [])
        .filter(isStopMarker)
        .map((m, i) => ({ id: m.id, m, p: proj(m.point), r: m.kind === "bay" ? -1 : (tagOrder.get(m.id) ?? 1000 + i) }))
        .sort((a, b) => a.r - b.r);
      for (const c of clusterPoints(stopMarkers, CLUSTER_PX)) {
        const [first, ...rest] = c.members;
        markerAt.set(first.id, c.p);
        if (!rest.length) continue;
        merges[first.id] = { label: clusterLabel(c.members.map((x) => x.m.label!)), at: unproj(c.p) };
        for (const x of rest) merges[x.id] = "hidden";
      }
      const labelOf = (m: SceneMarker) => (merges[m.id] && merges[m.id] !== "hidden" ? (merges[m.id] as { label: string }).label : m.label);

      const hard: Rect[] = [{ l: -Infinity, t: mapBottom, r: Infinity, b: Infinity }, ...covering];
      // The rider's dot (16dp and its ring).
      if (user) hard.push(around(proj(user), square(11)));
      for (const m of scene.markers ?? []) {
        if (merges[m.id] === "hidden") continue;
        hard.push(around(markerAt.get(m.id) ?? proj(m.point), TALL_PINS.has(m.kind) ? TALL_BOX : square(12)));
      }
      for (const v of scene.vehicles ?? []) hard.push(around(proj(v.point), square(12)));
      const highlight = scene.highlightStopId ? stops?.get(scene.highlightStopId) : undefined;
      if (highlight) hard.push(around(proj(highlight), HIGHLIGHT_BOX));
      const lines = [...(scene.legs ?? []).map(legLine), ...(scene.routeLine ? [scene.routeLine.coords] : [])].flatMap((coords) =>
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
        const coords = legLine(l);
        for (const f of LEG_LABEL_AT) {
          const at = pointAlong(coords, f);
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
      // Listed stops' tags before the other markers' labels.
      const markers = [...(scene.markers ?? [])].sort((a, b) => Number(isStopMarker(b)) - Number(isStopMarker(a)));
      for (const m of markers) {
        const label = labelOf(m);
        if (!label || merges[m.id] === "hidden") continue;
        const p = markerAt.get(m.id) ?? proj(m.point);
        const kind = isStopMarker(m) ? "stop" : TALL_PINS.has(m.kind) ? "tall" : "dot";
        const spot = placeSceneLabel(p, label, kind, { width: w, hard, soft: lines });
        const room = kind === "stop" ? chipRoom(label) : TALL_BOX;
        if (!spot) {
          hidden.push(m.id);
          if (kind === "stop" && p.y < mapBottom) blocked.push({ p, room, need: "tag" });
        } else {
          sides[m.id] = spot.key;
          hard.push(spot.box);
          if (kind === "stop") keepPts.push({ p, room: roomAround(p, spot.box, 12) });
          if (kind === "stop" && guard.some((o) => overlaps(around(p, room), o))) blocked.push({ p, room, need: "near" });
        }
        // A searched place's pin clear of the sheet's edge and the FABs (HMNS under Plan Trip, 07).
        // Its whole pin above the sheet and off the FABs: a place view at zoom 16 has little room.
        const placeGuard = [...covering, { l: -Infinity, t: mapBottom - 4, r: Infinity, b: Infinity }];
        if (kind === "tall" && m.kind === "place" && placeGuard.some((o) => overlaps(around(p, TALL_BOX), o))) blocked.push({ p, room: TALL_BOX, guard: placeGuard, need: "pin" });
      }
      setLabelSides(map, sides, legPoints, merges);
      hideSceneLabels(map, hidden);

      if (stops) placeStopTags(stops);

      if (!nudgeArmed.current || map.isMoving()) return;
      nudgeArmed.current -= 1;
      if (!blocked.length) return;
      // Only what is on the map strip now must stay there (a place view's rider may be miles away).
      const keep = [...keepPts, ...stopMarkers.map((x) => ({ p: x.p, room: PIN_BOX })), ...(user ? [{ p: proj(user), room: PIN_BOX }] : [])].filter(
        ({ p }) => p.x >= 0 && p.x <= w && p.y >= 0 && p.y < mapBottom,
      );
      // The full margins first; else the least that shows everything; else what must show: a listed
      // stop's tag, then pins under the chrome (at 360x640 a half sheet leaves too little map for all).
      const loose: Rect[] = [...covering.map((o) => grow(o, TOP_CLEAR_PX)), { l: -Infinity, t: mapBottom - 8, r: Infinity, b: Infinity }, ...guard.slice(-2)];
      const shift =
        nudgeFor(blocked, keep, guard, covering, w, mapBottom, true) ??
        nudgeFor(blocked, keep, loose, covering, w, mapBottom) ??
        nudgeFor(blocked.filter((b) => b.need !== "near"), keep, loose, covering, w, mapBottom) ??
        nudgeFor(blocked.filter((b) => b.need === "tag"), keep, loose, covering, w, mapBottom);
      if (shift) map.panBy(shift, { duration: 300 });
      // No nudge makes room above a listed stop's pin: its tag goes beside it rather than nowhere.
      else if (!besideOk.current && blocked.some((b) => b.need === "tag")) {
        besideOk.current = true;
        placeLabels(map);
      }

      function placeStopTags(stops: Map<string, ClientStop>) {
        const b = map.getBounds();
        const rank = rankFrom(labelAnchor(map, scene, user));
        // The scene's own stops (the cards listed in the sheet) are tagged first, then the nearest.
        const tagged = scene.tagStopIds ?? [];
        const taggedAt = new Map(tagged.map((id, i) => [id, i]));
        const z16 = map.getZoom() >= 16;
        const pinHalf = z16 ? 14 : 10;
        const inView: { id: string; s: ClientStop; p: Pt; r: number }[] = [];
        const covered: string[] = [];
        for (const s of stopsWithin(stops, b.getWest(), b.getSouth(), b.getEast(), b.getNorth())) {
          if (s.id === scene.highlightStopId) continue;
          inView.push({ id: s.id, s, p: proj(s), r: taggedAt.get(s.id) ?? 1e6 + rank(s) });
        }
        inView.sort((a, c) => a.r - c.r);
        // From zoom 16 (every pin drawn), pins closer than CLUSTER_PX are one cluster pin, bus and
        // rail apart: its tag names each stop, the listed ones first ("567 · 259", 42). Pins under
        // the chrome are clustered too, so the pair is the same whether or not a FAB hides one.
        type Group = { members: typeof inView; p: Pt };
        // A bay stop under a TC tile stays its own pin: merged with a stop beside the TC, the pair's
        // pin moved under the tile (13170 · 79 at Northwest TC).
        const tcAt = scene.legs?.length ? [] : (latest.current.tcData ?? []).map((tc) => proj(tc));
        const underTc = (x: { p: Pt }) => tcAt.some((t) => Math.abs(t.x - x.p.x) < 20 && Math.abs(t.y - x.p.y) < 20);
        const loose = inView.filter(underTc).map((x) => ({ members: [x], p: x.p }));
        const isListed = (g: Group) => g.members.some((x) => taggedAt.has(x.id));
        /**
         * A listed stop whose pin sits under the chrome joins the nearest listed pin beside it (one
         * stacked pin tagged "★ 2958 · 3340") when their shared pin is clear: at Extra large the map
         * strip is too short to nudge the starred 2958 out from under the search bar and keep the
         * rider's dot, and it went untagged (03-xlarge-360).
         */
        function mergeCovered(gs: Group[]): Group[] {
          let out = gs;
          for (const g of gs) {
            if (!out.includes(g) || !isListed(g) || !isCovered(g.p) || g.members.some(underTc)) continue;
            const near = out
              .filter((h) => h !== g && isListed(h) && !isCovered(h.p) && h.members[0].s.kind === g.members[0].s.kind && !h.members.some(underTc))
              .map((h) => ({ h, d: Math.hypot(h.p.x - g.p.x, h.p.y - g.p.y) }))
              .filter(({ d }) => d < MERGE_PX)
              .sort((a, c) => a.d - c.d)[0]?.h;
            if (!near) continue;
            const members = [...near.members, ...g.members].sort((a, c) => a.r - c.r);
            const p = { x: members.reduce((a, m) => a + m.p.x, 0) / members.length, y: members.reduce((a, m) => a + m.p.y, 0) / members.length };
            if (isCovered(p)) continue;
            out = [...out.filter((x) => x !== g && x !== near), { members, p }];
          }
          return out.sort((a, c) => a.members[0].r - c.members[0].r);
        }
        const free = inView.filter((x) => !underTc(x));
        const isCovered = (p: Pt) => covering.some((o) => overlaps(around(p, CHROME_GAP_BOX), o));
        let groups: Group[] = z16
          ? [...clusterPoints(free.filter((x) => x.s.kind !== "rail"), CLUSTER_PX), ...clusterPoints(free.filter((x) => x.s.kind === "rail"), CLUSTER_PX), ...loose]
          : inView.map((x) => ({ members: [x], p: x.p }));
        if (z16) groups = mergeCovered(groups);
        groups = groups.filter((g) => {
          // A pin under the search bar or a FAB is left out; a listed one is nudged into view.
          if (!isCovered(g.p)) return true;
          covered.push(...g.members.map((x) => x.id));
          if (g.members.some((x) => taggedAt.has(x.id)) && g.p.y < mapBottom) blocked.push({ p: g.p, room: square(16), need: "pin" });
          return false;
        });
        const halfOf = (g: Group) => (g.members.length > 1 ? 16 : pinHalf);
        // The sheet's own stops only, when it lists some: an unlisted stop's tag ("3425" over
        // Westheimer Rd, 03) was one more number to match against the cards, and none of them.
        const want = tagged.length || LABELLED_NEAREST;
        const tagAll = (groups: Group[]) => {
          const visible = groups.filter(({ p }) => p.y < mapBottom);
          // A listed stop's pin is never covered by another tag; other pins are avoided where possible.
          const pins = [...visible.filter((g) => !isListed(g)).map((g) => around(g.p, square(halfOf(g)))), ...tcAt.map((t) => around(t, square(18)))];
          const taken = [...hard, ...visible.filter(isListed).map((g) => around(g.p, square(halfOf(g))))];
          const labels: NearLabel[] = [];
          const tagBoxes: Rect[] = [];
          const failed: Group[] = [];
          const placed: { g: Group; box: Rect }[] = [];
          const candidates = tagged.length ? groups.filter(isListed) : groups.filter((g) => g.members.every((x) => x.s.kind !== "rail"));
          if (z16)
            for (const g of candidates) {
              if (labels.length >= want) break;
              const ids = g.members.map((x) => x.id);
              // A saved stop's ID leads its cluster's tag, with the star ("★ 2958 · 3340").
              const savedFirst = [...ids.filter((id) => savedIds.includes(id)), ...ids.filter((id) => !savedIds.includes(id))];
              const saved = savedIds.includes(savedFirst[0]);
              const text = clusterLabel(savedFirst);
              const spot = placeChip(g.p, text, { width: w, hard: taken, soft: [...pins, ...lines] }, saved ? 16 : 0, besideOk.current && isListed(g));
              if (spot) {
                const at = { lat: map.unproject([g.p.x, g.p.y]).lat, lon: map.unproject([g.p.x, g.p.y]).lng };
                labels.push({ stop: stops.get(savedFirst[0]) ?? g.members[0].s, side: spot.key, saved, ...(ids.length > 1 && { cluster: { text, at, ids: savedFirst } }) });
                taken.push(spot.box);
                tagBoxes.push(spot.box);
                placed.push({ g, box: spot.box });
              } else if (isListed(g) && g.p.y < mapBottom) failed.push(g);
            }
          return { visible, labels, tagBoxes, failed, placed };
        };
        // Two listed stops too close for both tags to stand above their pins (688 and 2504 across
        // Main St, 07) become one pin tagged "688 · 2504", rather than one card's stop going untagged.
        let result = tagAll(groups);
        for (let round = 0; round < 3 && result.failed.length; round++) {
          const merged = new Set<Group>();
          for (const g of result.failed) {
            if (merged.has(g) || g.members.some(underTc)) continue;
            const near = groups
              .filter((h) => h !== g && !merged.has(h) && isListed(h) && h.members[0].s.kind === g.members[0].s.kind && !h.members.some(underTc))
              .map((h) => ({ h, d: Math.hypot(h.p.x - g.p.x, h.p.y - g.p.y) }))
              .filter(({ d }) => d < MERGE_PX)
              .sort((a, c) => a.d - c.d)[0]?.h;
            if (!near) continue;
            const members = [...near.members, ...g.members].sort((a, c) => a.r - c.r);
            const p = { x: members.reduce((a, m) => a + m.p.x, 0) / members.length, y: members.reduce((a, m) => a + m.p.y, 0) / members.length };
            groups = [...groups.filter((x) => x !== g && x !== near), { members, p }];
            merged.add(g).add(near);
          }
          if (!merged.size) break;
          groups.sort((a, c) => a.members[0].r - c.members[0].r);
          result = tagAll(groups);
        }
        const { visible, labels, tagBoxes } = result;
        // Room for the tag's height above the pin: its width may go to either side (above-r, above-l),
        // chosen once the pin has room (a later nudge takes what is still missing).
        for (const g of result.failed) blocked.push({ p: g.p, room: TAG_MIN_ROOM, need: "tag" });
        // A tag set where it fits (to one side of its pin, say) needs only that room, not the centred one.
        const tagRoom = new Map(result.placed.map(({ g, box }) => [g, roomAround(g.p, box, 16, 16)]));
        for (const [g, room] of tagRoom) if (isListed(g) && guard.some((o) => overlaps(around(g.p, room), o))) blocked.push({ p: g.p, room, need: "near" });
        for (const g of visible) if (isListed(g)) hard.push(around(g.p, square(halfOf(g))));
        hard.push(...tagBoxes);
        // Listed stops stay on the map strip with their tags when the map is nudged for something else.
        keepPts.push(...visible.filter(isListed).map((g) => ({ p: g.p, room: tagRoom.get(g) ?? PIN_BOX })));
        const clusters: StopCluster[] = [];
        for (const g of groups) {
          if (g.members.length < 2) continue;
          clusters.push({ at: { lat: map.unproject([g.p.x, g.p.y]).lat, lon: map.unproject([g.p.x, g.p.y]).lng }, ids: g.members.map((x) => x.id), rail: g.members[0].s.kind === "rail" });
          covered.push(...g.members.map((x) => x.id));
        }
        setClusters(map, clusters);
        // A pin a tag had to be laid over (no clear side) is left out rather than shown half-hidden
        // under another stop's number; panning or zooming brings it back.
        const withTag = new Set(labels.flatMap((l) => l.cluster?.ids ?? [l.stop.id]));
        for (const g of visible)
          if (!g.members.some((x) => withTag.has(x.id)) && tagBoxes.some((o) => overlaps(o, around(g.p, square(halfOf(g))))))
            covered.push(...g.members.map((x) => x.id));
        setCoveredStops(map, covered);
        setNearLabels(map, labels);
      }
    };
    void loadStops().then(place, () => place());
  };
  const pad = (bottom: number) => padding(bottom, topChrome(container.current, safeTopProbe.current?.offsetHeight ?? 0), container.current?.clientHeight ?? 0);

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
        // Labels appear at once, fully drawn. With MapLibre's 300ms fade a tag placed after a nudge
        // could stay invisible until the next repaint: HMNS's "688 · 2504" and the street names
        // were placed (queryRenderedFeatures found them) but not on screen (07).
        fadeDuration: 0,
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
      // Only a gesture has an originalEvent: fitBounds, easeTo and panBy do not.
      m.on("movestart", (e) => {
        if ((e as { originalEvent?: Event }).originalEvent) riderMoved.current = true;
      });
      // A pin opens its stop directly (no "Choose Direction" step, C.16).
      m.on("click", (e) => {
        const hit = transitAt(m, e.point);
        if (!hit) return;
        // A cluster zooms in until its stops come apart; at street level it opens its first stop.
        if (hit.kind === "cluster" && m.getZoom() < CLUSTER_MAX_ZOOM) {
          m.easeTo({ center: hit.at, zoom: Math.min(CLUSTER_MAX_ZOOM, m.getZoom() + 1.5) });
          return;
        }
        latest.current.navigate(hit.kind === "tc" ? `/explore/tc/${encodeURIComponent(hit.id)}` : `/explore/stop/${encodeURIComponent(hit.id)}`);
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
        arm();
        lastFocus.current = focusKey(scene);
        void applyScene(sceneState.current, m, scene, user, pad(bottomPadding)).then(() => placeLabels(m));
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
    // A new scene object with the same focus (Walk or Route near you after a 40 m move, a language
    // switch) redraws without moving the camera once the rider has panned or zoomed by hand, so
    // they are not snapped back. Untouched, the camera is fitted again (the same view once settled).
    const key = focusKey(scene);
    const fit = key !== lastFocus.current || !riderMoved.current;
    lastFocus.current = key;
    if (fit) {
      riderMoved.current = false;
      arm();
    }
    void applyScene(sceneState.current, map, scene, user, pad(bottomPadding), fit).then(() => placeLabels(map));
    rankLabels(map);
    // `lang`: marker labels built by the screen are re-drawn in the new language.
  }, [scene, lang]);

  // The sheet moved to another snap: fit the scene again above it once it has settled (or, with
  // nothing to fit, re-place the labels the sheet may now cover).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const { scene } = latest.current;
    const bounds = scene.focus?.kind === "bounds" ? scene.focus.bounds : !scene.focus && !riderMoved.current ? sceneState.current.tripBounds : undefined;
    const id = setTimeout(() => {
      arm();
      const { scene: now, user } = latest.current;
      const f = now.focus;
      const center = f?.kind === "point" ? (f.point ?? undefined) : undefined;
      if (bounds) fitFocus(map, bounds, fitPad(now, pad(bottomPadding)));
      // A place or stop the camera centred before the sheet settled is centred again in the map
      // strip that is left (07: the museum pin ended under the sheet's edge), unless the rider moved the map.
      else if (center && !riderMoved.current) map.easeTo({ center: [center.lon, center.lat], zoom: f?.zoom ?? USER_ZOOM, padding: pad(bottomPadding) });
      else if (f?.kind === "user" && user && !riderMoved.current) map.easeTo({ center: [user.lon, user.lat], zoom: f.zoom ?? USER_ZOOM, padding: pad(bottomPadding) });
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
    if (first && scene.focus?.kind === "user") arm();
    if (first && scene.focus?.kind === "user") void applyScene(sceneState.current, map, scene, user, pad(bottomPadding)).then(() => placeLabels(map));
    else showUser(map, user);
    rankLabels(map);
  }, [user]);

  useEffect(() => {
    if (mapRef.current && ready.current && tcData) showTransitCenters(mapRef.current, tcData);
  }, [tcData]);

  // The map's chrome changed size (a banner under the search bar came or went, the FAB column
  // changed): the tags it covered, or now leaves room for, are placed again, and a listed stop it
  // hid is nudged into view unless the rider has moved the map (07: a passing banner hid 2504).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    const observed = new Set<Element>();
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const map = mapRef.current;
        if (!map || !ready.current || map.isMoving()) return;
        if (!riderMoved.current) arm();
        placeLabels(map);
      }, CHROME_SETTLE_MS);
    });
    // Obstacles that left the page are let go (the observer would otherwise keep every unmounted
    // banner alive), and new ones observed: at most once a frame, however many mutations it had.
    const watch = () => {
      frame = 0;
      for (const el of observed)
        if (!el.isConnected) {
          ro.unobserve(el);
          observed.delete(el);
        }
      for (const el of document.querySelectorAll("[data-map-obstacle]"))
        if (!observed.has(el)) {
          observed.add(el);
          ro.observe(el);
        }
    };
    watch();
    const mo = new MutationObserver(() => {
      if (!frame) frame = requestAnimationFrame(watch);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      observed.clear();
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

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
