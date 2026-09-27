// The stop-pin, direction-notch, stop-ID label and transit-center layers (C.16), plus the tap
// test that turns a tap on a pin or its ID chip into its stop or TC.

import type { FeatureCollection } from "geojson";
import type maplibregl from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import type { ClientStop, LatLon, TransitCenterSummary } from "../../api/types.ts";
import { anchorOffset, CHIP_PLACEMENTS } from "../placement.ts";
import { LABEL_FONT_BOLD, token } from "../style.ts";

export const STOPS_SOURCE = "stops";
const TCS_SOURCE = "transit-centers";
/** The few stops whose ID chip shows at walking zoom, each with the side MapView chose for it. */
const NEAR_LABELS_SOURCE = "stops-near-labels";
/** Pins closer than CLUSTER_PX drawn as one (MapView): each cluster's point and its stop IDs. */
const CLUSTERS_SOURCE = "stops-clusters";
const PIN_LAYERS = ["tc-pin", "stops-cluster", "stops-pin"];
/** How far outside a pin's square a tap still hits it. */
const TAP_SLOP = 12;
/** The query box reaches the edge of the largest pin plus the slop. */
const TAP_REACH = 18 + TAP_SLOP;

type Expr = maplibregl.ExpressionSpecification;
const isRail: Expr = ["==", ["get", "kind"], "rail"];
/** The 28dp pin, drawn smaller below zoom 16 (C.16's 20dp at 15). */
const pinImage: Expr = ["case", isRail, "pin-rail-md", "pin-bus-md"];
/** Stop pins show from here. */
export const PINS_ZOOM = 15;
/**
 * 20dp at zoom 15 growing to 28dp at 16, in step with the zoom: a pin that jumped from 20 to 28dp
 * at 16 (with every hidden pin appearing at once) made the map jump on the slightest scroll.
 */
const SMALL = 20 / 28;
const pinSize: Expr = ["interpolate", ["linear"], ["zoom"], PINS_ZOOM, SMALL, 16, 1];
/** A pin or stack a zoom just split out or merged fades in (fadeIn) rather than popping up. */
const fadeOpacity: Expr = ["coalesce", ["feature-state", "fade"], 1];
/** The size pinSize draws a pin at `zoom`, as a fraction of 28dp. */
export const pinScale = (zoom: number) => SMALL + (1 - SMALL) * Math.min(1, Math.max(0, zoom - PINS_ZOOM));

/** Only the stops nearest the anchor carry their ID chip at walking zoom (C.16, M4); the rest from LABEL_ALL_ZOOM. */
export const LABELLED_NEAREST = 3;
const LABEL_ALL_ZOOM = 18;

/** Squared equirectangular distance: enough to rank labels, and cheap for 8,797 stops. */
export function rankFrom(anchor: LatLon): (p: LatLon) => number {
  const k = Math.cos((anchor.lat * Math.PI) / 180);
  return (p) => ((p.lat - anchor.lat) ** 2 + ((p.lon - anchor.lon) * k) ** 2) * 1e8;
}

export function stopsCollection(stops: Iterable<ClientStop>, anchor: LatLon): FeatureCollection {
  const rank = rankFrom(anchor);
  const list = Array.from(stops, (s) => ({ s, sort: rank(s) }));
  return {
    type: "FeatureCollection",
    features: list.map(({ s, sort }) => ({
      type: "Feature",
      properties: {
        id: s.id,
        kind: s.kind === "rail" ? "rail" : "stop",
        ...(s.bearing !== undefined && { bearing: s.bearing }),
        sort,
      },
      geometry: { type: "Point", coordinates: [s.lon, s.lat] },
    })),
  };
}

/** "Northwest Transit Center" as "Northwest TC": one line on the map, as riders say it (06). */
export const tcMapName = (name: string) => name.replace(/\s*Transit Center\b/i, " TC").trim();

export function showTransitCenters(map: maplibregl.Map, tcs: TransitCenterSummary[]) {
  (map.getSource(TCS_SOURCE) as GeoJSONSource | undefined)?.setData({
    type: "FeatureCollection",
    features: tcs.map((tc) => ({ type: "Feature", properties: { id: tc.id, name: tcMapName(tc.name) }, geometry: { type: "Point", coordinates: [tc.lon, tc.lat] } })),
  });
}

/** The stop layer scene route lines and labels go under (see scene.ts). */
export const BOTTOM_TRANSIT_LAYER = "stops-pin";

/**
 * Layers are added bottom to top; MapLibre places symbols top to bottom. ID chips stand above their
 * pin, or hide, rather than cover the rider's dot or a scene marker.
 */
export function addTransitLayers(map: maplibregl.Map) {
  const empty: FeatureCollection = { type: "FeatureCollection", features: [] };
  highlighted = undefined;
  nearKey = "";
  clusterKey = "";
  clusterIds = new Set();
  coveredIds = [];
  fading.clear();
  // Keyed by stop (and a cluster by its stops) for the fade-in's feature state.
  map.addSource(STOPS_SOURCE, { type: "geojson", data: empty, promoteId: "id" });
  map.addSource(TCS_SOURCE, { type: "geojson", data: empty });
  map.addSource(NEAR_LABELS_SOURCE, { type: "geojson", data: empty });
  map.addSource(CLUSTERS_SOURCE, { type: "geojson", data: empty, promoteId: "ids" });
  const text = token("--c-text");

  // Two chip layers, one look: the nearest few stops from zoom 16, every stop from 18. A chip on
  // every pin hid the street names riders use to find their way.
  const chipLayout: maplibregl.SymbolLayerSpecification["layout"] = {
      "text-field": ["get", "id"],
      "text-font": LABEL_FONT_BOLD,
      "text-size": 14,
      // Always directly above its pin, pointing down at it, like the "Stop 342" callout (a chip
      // beside or below a pin read as the next pin's, 02); a chip with no room there is dropped.
      "text-variable-anchor-offset": ["literal", anchorOffset(CHIP_PLACEMENTS.above)] as unknown as Expr,
      "icon-image": "label-chip-down",
      "icon-text-fit": "both",
      "icon-text-fit-padding": [1, 5, 1, 5],
      // The pins nearest the anchor keep their labels when labels collide.
      "symbol-sort-key": ["get", "sort"],
      "symbol-z-order": "source",
  };
  // Every pin from zoom 15 (at 14 downtown, forty identical pins were noise, C.16); TC tiles show
  // from 11. Pins closer than a fingertip are one stacked pin (stops-cluster) at every zoom, so the
  // map thins out the same way whether it is zoomed to 15.9 or 16.1.
  map.addLayer({
    id: "stops-pin",
    type: "symbol",
    source: STOPS_SOURCE,
    minzoom: PINS_ZOOM,
    // Pins always show, and don't reserve space (ignore-placement): with a pin on every downtown
    // corner, reserving it pushed every street name off the map. The few ID chips may sit
    // beside or over a pin; they point at the nearest ones anyway.
    layout: { "icon-image": pinImage, "icon-size": pinSize, "icon-allow-overlap": true, "icon-padding": 0, "icon-ignore-placement": true },
    paint: { "icon-opacity": fadeOpacity },
  });
  // Two or more pins closer than a fingertip, drawn as one stacked pin (MapView clusters them and
  // hides their own pins); its tag names every stop in it ("567 · 259").
  map.addLayer({
    id: "stops-cluster",
    type: "symbol",
    source: CLUSTERS_SOURCE,
    minzoom: PINS_ZOOM,
    layout: { "icon-image": ["case", isRail, "pin-rail-stack", "pin-bus-stack"], "icon-size": pinSize, "icon-allow-overlap": true, "icon-ignore-placement": true },
    paint: { "icon-opacity": fadeOpacity },
  });
  // The direction notches fade in towards 16 rather than all appearing at once.
  map.addLayer({
    id: "stops-notch",
    type: "symbol",
    source: STOPS_SOURCE,
    minzoom: PINS_ZOOM + 0.5,
    filter: ["has", "bearing"],
    layout: {
      "icon-image": ["case", isRail, "notch-rail", "notch-bus"],
      "icon-rotate": ["get", "bearing"],
      "icon-rotation-alignment": "map",
      // The image is 7dp tall and anchored at its centre: its base overlaps the pin's white ring.
      "icon-offset": ["interpolate", ["linear"], ["zoom"], PINS_ZOOM, ["literal", [0, -12]], 16, ["literal", [0, -16]]],
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
    paint: { "icon-opacity": ["interpolate", ["linear"], ["zoom"], PINS_ZOOM + 0.5, 0, 16, fadeOpacity] },
  });
  map.addLayer({ id: "stops-label", type: "symbol", source: STOPS_SOURCE, minzoom: LABEL_ALL_ZOOM, layout: chipLayout, paint: { "text-color": text } });
  // The listed (else nearest) few: each on the side MapView found clear of the sheet, chrome and
  // other pins, pointing at its pin, and a saved stop's with a star before its number ("★ 2958", the stop the rider opened the app for).
  map.addLayer({
    id: "stops-label-near",
    type: "symbol",
    source: NEAR_LABELS_SOURCE,
    // Also above LABEL_ALL_ZOOM: a cluster's tag has no stop of its own in the stops-label layer.
    minzoom: 16,
    layout: {
      ...chipLayout,
      "text-field": [
        "case",
        ["==", ["get", "saved"], 1],
        ["format", ["image", "chip-star"], {}, ["concat", "\u2009", ["get", "text"]], {}],
        ["get", "text"],
      ] as unknown as Expr,
      "text-variable-anchor-offset": [
        "match",
        ["get", "side"],
        ...Object.entries(CHIP_PLACEMENTS).flatMap(([key, p]) => [key, ["literal", anchorOffset(p)]]),
        ["literal", anchorOffset(CHIP_PLACEMENTS.above)],
      ] as unknown as Expr,
      // MapView placed each chip clear of the chrome, markers and the other chips: MapLibre's own
      // collision test must not drop a listed stop's chip (3340 untagged at 412, 03).
      "text-allow-overlap": true,
      "icon-allow-overlap": true,
      // The chip's pointer faces its pin.
      "icon-image": [
        "match",
        ["get", "side"],
        ...Object.entries(CHIP_PLACEMENTS).flatMap(([key, p]) => [key, `label-chip-${p.pointer}`]),
        "label-chip-down",
      ] as unknown as Expr,
    },
    paint: { "text-color": text },
  });
  map.addLayer({
    id: "tc-label",
    type: "symbol",
    source: TCS_SOURCE,
    minzoom: 13,
    layout: {
      "text-field": ["get", "name"],
      "text-font": LABEL_FONT_BOLD,
      "text-size": 14,
      // Below the tile when there is room, else above or beside it: with the rider standing at the
      // TC, a fixed anchor collided with their dot and the name was dropped (06).
      "text-variable-anchor-offset": ["top", [0, 1.6], "bottom", [0, -1.6], "left", [1.8, 0], "right", [-1.8, 0]],
      "text-max-width": 20,
    },
    paint: { "text-color": token("--c-brand-navy"), "text-halo-color": "#fff", "text-halo-width": 2 },
  });
  map.addLayer({
    id: "tc-pin",
    type: "symbol",
    source: TCS_SOURCE,
    minzoom: 11,
    layout: { "icon-image": "pin-tc", "icon-allow-overlap": true },
  });
}

const QUIET_LAYERS = ["stops-pin", "stops-cluster", "stops-notch", "stops-label", "stops-label-near", "tc-pin", "tc-label"];

/** Walk and itinerary scenes show only their own markers: every other stop pin, chip and TC is hidden. */
export function setQuiet(map: maplibregl.Map, quiet: boolean) {
  for (const id of QUIET_LAYERS) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", quiet ? "none" : "visible");
}

let highlighted: string | undefined;
let nearKey = "";
let clusterKey = "";
/** The drawn clusters' `ids` properties, to tell a new stack from one already on the map. */
let clusterIds = new Set<string>();
let coveredIds: string[] = [];

/** Stops whose own pin, notch and chip are not drawn: covered by the chrome or a cluster pin, or highlighted. */
const hiddenIds = () => [...coveredIds, ...(highlighted ? [highlighted] : [])];
// Dev builds only: the layout guards (tests/e2e/helpers.ts) read which stop pins are hidden under a
// cluster or the enlarged pin from here, instead of re-deriving it from the stops-pin filter.
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { __transit: unknown }).__transit = { coveredIds: () => [...coveredIds], highlighted: () => highlighted };
}
/** The layers applyFilters hides `hiddenIds` from. */
const FILTERED = new Set(["stops-pin", "stops-label", "stops-notch"]);

function applyFilters(map: maplibregl.Map) {
  const hidden = hiddenIds();
  const shown: maplibregl.FilterSpecification = ["!", ["in", ["get", "id"], ["literal", hidden]]];
  map.setFilter("stops-pin", hidden.length ? shown : null);
  map.setFilter("stops-label", hidden.length ? shown : null);
  map.setFilter("stops-notch", hidden.length ? ["all", ["has", "bearing"], shown] : ["has", "bearing"]);
}

/**
 * Stops whose pin sits under the map's own buttons (search bar, FAB column, attribution): they are
 * left out rather than drawn half-hidden under "Plan Trip", where a rider could neither read nor tap
 * them. Panning brings them back.
 */
export function setCoveredStops(map: maplibregl.Map, ids: string[]) {
  if (ids.length === coveredIds.length && ids.every((id, i) => id === coveredIds[i])) return;
  const now = new Set(ids);
  fadeIn(map, STOPS_SOURCE, coveredIds.filter((id) => !now.has(id)));
  coveredIds = ids;
  applyFilters(map);
}

/** Hides one stop's normal pin and label while the scene shows it enlarged with its callout. */
export function setHighlightedStop(map: maplibregl.Map, stopId: string | undefined) {
  if (stopId === highlighted) return;
  highlighted = stopId;
  applyFilters(map);
}

export interface NearLabel {
  stop: ClientStop;
  /** A CHIP_PLACEMENTS key. */
  side: string;
  saved: boolean;
  /** A cluster's tag: every stop in it ("567 · 259"), drawn above the cluster pin at `at`. */
  cluster?: { text: string; at: LatLon; ids: string[] };
}

export interface StopCluster {
  at: LatLon;
  /** Its stops, the listed or nearest first. */
  ids: string[];
  rail: boolean;
}

/** The cluster pins drawn in place of their stops' own pins (MapView hides those with setCoveredStops). */
export function setClusters(map: maplibregl.Map, clusters: StopCluster[]) {
  const key = clusters.map((c) => `${c.ids.join("+")}@${c.at.lat.toFixed(6)},${c.at.lon.toFixed(6)}`).join();
  if (key === clusterKey) return;
  clusterKey = key;
  const now = clusters.map((c) => c.ids.join(","));
  const fresh = now.filter((ids) => !clusterIds.has(ids));
  clusterIds = new Set(now);
  (map.getSource(CLUSTERS_SOURCE) as GeoJSONSource | undefined)?.setData({
    type: "FeatureCollection",
    features: clusters.map((c) => ({
      type: "Feature",
      properties: { id: c.ids[0], ids: c.ids.join(","), kind: c.rail ? "rail" : "stop", cluster: 1 },
      geometry: { type: "Point", coordinates: [c.at.lon, c.at.lat] },
    })),
  });
  fadeIn(map, CLUSTERS_SOURCE, fresh);
}

/** How long a newly shown pin or stack takes to fade in (ms). */
const FADE_MS = 200;
const fading = new Map<string, { source: string; id: string; start: number }>();
let fadeFrame = 0;

/**
 * Stop pins a split just uncovered and stacks a merge just made fade in over FADE_MS: with the
 * rider's slightest zoom, a pair turning into a stack (or back) read as pins flickering on and off.
 * A pin that goes away is hidden at once, under the stack or pins that fade in over it.
 */
function fadeIn(map: maplibregl.Map, source: string, ids: string[]) {
  if (!ids.length || !map.getSource(source)) return;
  const start = performance.now();
  for (const id of ids) {
    fading.set(`${source}:${id}`, { source, id, start });
    map.setFeatureState({ source, id }, { fade: 0.15 });
  }
  if (fadeFrame) return;
  const step = () => {
    const t = performance.now();
    for (const [k, f] of fading) {
      if (!map.getSource(f.source)) {
        fading.delete(k);
        continue;
      }
      const a = Math.min(1, (t - f.start) / FADE_MS);
      map.setFeatureState({ source: f.source, id: f.id }, { fade: 0.15 + 0.85 * a * (2 - a) });
      if (a >= 1) fading.delete(k);
    }
    fadeFrame = fading.size ? requestAnimationFrame(step) : 0;
  };
  fadeFrame = requestAnimationFrame(step);
}

/**
 * The stops whose ID chip shows at walking zoom, and where (MapView picks the nearest ones whose
 * chip fits on screen, clear of the sheet, search bar, FABs and, where it can, the other pins).
 */
export function setNearLabels(map: maplibregl.Map, labels: NearLabel[]) {
  const key = labels.map((l) => `${l.stop.id}:${l.side}:${l.saved ? 1 : 0}:${l.cluster?.text ?? ""}`).join();
  if (key === nearKey) return;
  nearKey = key;
  (map.getSource(NEAR_LABELS_SOURCE) as GeoJSONSource | undefined)?.setData({
    type: "FeatureCollection",
    features: labels.map(({ stop, side, saved, cluster }, sort) => ({
      type: "Feature",
      properties: { id: stop.id, text: cluster?.text ?? stop.id, side, saved: saved ? 1 : 0, sort, ...(cluster && { cluster: 1, ids: cluster.ids.join(",") }) },
      geometry: { type: "Point", coordinates: cluster ? [cluster.at.lon, cluster.at.lat] : [stop.lon, stop.lat] },
    })),
  });
}

/** A cluster tap carries its point and stops: the map zooms in to split it. */
export type TransitTap = { kind: "stop" | "tc"; id: string } | { kind: "cluster"; id: string; ids: string[]; at: [number, number] };

/** Half the side of the square a pin layer draws at the current zoom (C.16: 20dp at 15 to 28dp at 16, TC 36dp). */
const pinHalf = (map: maplibregl.Map, layer: string) => (layer === "tc-pin" ? 18 : (layer === "stops-cluster" ? 18 : 14) * pinScale(map.getZoom()));

/**
 * The stop or TC under a tap: a tap on an ID chip opens that chip's stop; otherwise the pin whose
 * square is nearest, within TAP_SLOP of its edge (a 44dp target around a 20dp pin).
 */
export function transitAt(map: maplibregl.Map, point: maplibregl.Point): TransitTap | undefined {
  const tap = (f: maplibregl.MapGeoJSONFeature): TransitTap =>
    f.properties.cluster && f.geometry.type === "Point"
      ? { kind: "cluster", id: String(f.properties.id), ids: String(f.properties.ids).split(","), at: f.geometry.coordinates as [number, number] }
      : { kind: f.layer.id === "tc-pin" ? "tc" : "stop", id: String(f.properties.id) };
  const labelLayers = ["stops-label", "stops-label-near"].filter((l) => map.getLayer(l));
  const label = labelLayers.length > 0 && safeQuery(map, point, labelLayers)?.[0];
  if (label) return tap(label);

  const box: [maplibregl.PointLike, maplibregl.PointLike] = [
    [point.x - TAP_REACH, point.y - TAP_REACH],
    [point.x + TAP_REACH, point.y + TAP_REACH],
  ];
  const layers = PIN_LAYERS.filter((l) => map.getLayer(l));
  const hits: { tap: () => TransitTap; d: number }[] = [];
  const consider = (coords: [number, number], layer: string, tap: () => TransitTap) => {
    const p = map.project(coords);
    const half = pinHalf(map, layer);
    const d = Math.hypot(Math.max(0, Math.abs(p.x - point.x) - half), Math.max(0, Math.abs(p.y - point.y) - half));
    if (d <= TAP_SLOP) hits.push({ tap, d });
  };
  // One layer at a time: when maplibre's feature index for a GeoJSON tile is left empty after a
  // setData, querying it throws ("Out of bounds ... _numberToString") until the next update while its
  // pins still draw. A rider's tap on such a pin must still open the stop, so that layer is
  // hit-tested from the data the app gave its source instead.
  for (const layer of layers) {
    const found = safeQuery(map, box, [layer]);
    if (found) {
      for (const f of found) if (f.geometry.type === "Point") consider(f.geometry.coordinates as [number, number], layer, () => tap(f));
      continue;
    }
    for (const f of drawnFromData(map, layer)) {
      const kind = layer === "tc-pin" ? "tc" : "stop";
      consider(f.coordinates, layer, () =>
        f.ids ? { kind: "cluster", id: f.id, ids: f.ids, at: f.coordinates } : { kind, id: f.id },
      );
    }
  }
  // The nearest pin; on a tie, the one found first (PIN_LAYERS order: a TC over a stop).
  const best = hits.reduce<(typeof hits)[number] | undefined>((a, h) => (a && a.d <= h.d ? a : h), undefined);
  return best?.tap();
}

function safeQuery(map: maplibregl.Map, at: maplibregl.PointLike | [maplibregl.PointLike, maplibregl.PointLike], layers: string[]) {
  try {
    return map.queryRenderedFeatures(at, { layers });
  } catch {
    return undefined;
  }
}

type DataPin = { id: string; ids?: string[]; coordinates: [number, number] };

/**
 * The pins a layer draws, read from its source's data: what a tap falls back on when the layer's
 * rendered-feature query throws. Every pin layer draws every feature (overlap allowed), less the
 * stops applyFilters hides.
 */
function drawnFromData(map: maplibregl.Map, layer: string): DataPin[] {
  // The layer's own zoom range, source and visibility, as the style has them.
  const spec = map.getLayer(layer);
  const zoom = map.getZoom();
  if (!spec || zoom < spec.minzoom || zoom >= spec.maxzoom || spec.visibility === "none" || !spec.source) return [];
  const data = (map.getSource(spec.source) as GeoJSONSource | undefined)?.serialize().data;
  if (!data || typeof data !== "object" || !("features" in data)) return [];
  // The same stops applyFilters leaves out of the layer.
  const hidden = FILTERED.has(layer) ? new Set(hiddenIds()) : undefined;
  const out: DataPin[] = [];
  for (const f of (data as FeatureCollection).features) {
    if (f.geometry?.type !== "Point" || !f.properties) continue;
    const id = String(f.properties.id);
    if (hidden?.has(id)) continue;
    const ids = f.properties.cluster ? String(f.properties.ids).split(",") : undefined;
    out.push({ id, ids, coordinates: f.geometry.coordinates as [number, number] });
  }
  return out;
}
