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
const PIN_LAYERS = ["tc-pin", "stops-pin", "stops-pin-far"];
/** How far outside a pin's square a tap still hits it. */
const TAP_SLOP = 12;
/** The query box reaches the edge of the largest pin plus the slop. */
const TAP_REACH = 18 + TAP_SLOP;

type Expr = maplibregl.ExpressionSpecification;
const isRail: Expr = ["==", ["get", "kind"], "rail"];
/** 20dp pins below zoom 16, 28dp from 16 (C.16). */
const pinImage: Expr = ["step", ["zoom"], ["case", isRail, "pin-rail-sm", "pin-bus-sm"], 16, ["case", isRail, "pin-rail-md", "pin-bus-md"]];

/** Only the stops nearest the anchor carry their ID chip at walking zoom (C.16, M4); the rest from LABEL_ALL_ZOOM. */
export const LABELLED_NEAREST = 3;
const LABEL_ALL_ZOOM = 18;
/** From here every bus pin is drawn; below it (to 15) only pins that don't overlap another. */
const ALL_PINS_ZOOM = 16;

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

export function showTransitCenters(map: maplibregl.Map, tcs: TransitCenterSummary[]) {
  (map.getSource(TCS_SOURCE) as GeoJSONSource | undefined)?.setData({
    type: "FeatureCollection",
    features: tcs.map((tc) => ({ type: "Feature", properties: { id: tc.id, name: tc.name }, geometry: { type: "Point", coordinates: [tc.lon, tc.lat] } })),
  });
}

/** The stop layer scene route lines and labels go under (see scene.ts). */
export const BOTTOM_TRANSIT_LAYER = "stops-pin-far";

/**
 * Layers are added bottom to top; MapLibre places symbols top to bottom. ID chips move to
 * another side of their pin, or hide, rather than cover the rider's dot or a scene marker.
 */
export function addTransitLayers(map: maplibregl.Map) {
  const empty: FeatureCollection = { type: "FeatureCollection", features: [] };
  highlighted = undefined;
  nearKey = "";
  coveredIds = [];
  map.addSource(STOPS_SOURCE, { type: "geojson", data: empty });
  map.addSource(TCS_SOURCE, { type: "geojson", data: empty });
  map.addSource(NEAR_LABELS_SOURCE, { type: "geojson", data: empty });
  const text = token("--c-text");

  // Two chip layers, one look: the nearest few stops from zoom 16, every stop from 18. A chip on
  // every pin hid the street names riders use to find their way.
  const chipLayout: maplibregl.SymbolLayerSpecification["layout"] = {
      "text-field": ["get", "id"],
      "text-font": LABEL_FONT_BOLD,
      "text-size": 14,
      // Under the pin when there is room, as in the spec; otherwise above or beside it, always
      // clear of the pin's own square (in ems of the 14px text).
      "text-variable-anchor-offset": ["top", [0, 1.7], "bottom", [0, -1.7], "left", [2.3, 0], "right", [-2.3, 0]],
      "icon-image": "label-chip",
      "icon-text-fit": "both",
      "icon-text-fit-padding": [1, 5, 1, 5],
      // The pins nearest the anchor keep their labels when labels collide.
      "symbol-sort-key": ["get", "sort"],
      "symbol-z-order": "source",
  };
  // Zoom 15 (downtown without a location, fitted routes): only pins clear of each other, nearest
  // the anchor first. Forty overlapping pins downtown read as a flood, not as stops.
  map.addLayer({
    id: "stops-pin-far",
    type: "symbol",
    source: STOPS_SOURCE,
    minzoom: 15,
    maxzoom: ALL_PINS_ZOOM,
    layout: {
      "icon-image": pinImage,
      "icon-allow-overlap": false,
      // Room around each pin: about one pin per block downtown instead of one per corner.
      "icon-padding": 18,
      "symbol-sort-key": ["get", "sort"],
      "symbol-z-order": "source",
    },
  });
  map.addLayer({
    id: "stops-pin",
    type: "symbol",
    source: STOPS_SOURCE,
    // From 16 every pin (at 14 downtown, forty identical pins were noise, C.16); TC tiles show from 11.
    minzoom: ALL_PINS_ZOOM,
    // Pins always show, and don't reserve space (ignore-placement): with a pin on every downtown
    // corner, reserving it pushed every street name off the map. The few ID chips may sit
    // beside or over a pin; they point at the nearest ones anyway.
    layout: { "icon-image": pinImage, "icon-allow-overlap": true, "icon-padding": 0, "icon-ignore-placement": true },
  });
  map.addLayer({
    id: "stops-notch",
    type: "symbol",
    source: STOPS_SOURCE,
    minzoom: ALL_PINS_ZOOM,
    filter: ["has", "bearing"],
    layout: {
      "icon-image": ["case", isRail, "notch-rail", "notch-bus"],
      "icon-rotate": ["get", "bearing"],
      "icon-rotation-alignment": "map",
      // The image is 7dp tall and anchored at its centre: its base overlaps the pin's white ring.
      "icon-offset": ["step", ["zoom"], ["literal", [0, -12]], 16, ["literal", [0, -16]]],
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
  });
  map.addLayer({ id: "stops-label", type: "symbol", source: STOPS_SOURCE, minzoom: LABEL_ALL_ZOOM, layout: chipLayout, paint: { "text-color": text } });
  // The nearest few: each on the side MapView found clear of the sheet, chrome and other pins, and
  // a saved stop's with a star before its number ("★ 2958", the stop the rider opened the app for).
  map.addLayer({
    id: "stops-label-near",
    type: "symbol",
    source: NEAR_LABELS_SOURCE,
    minzoom: 16,
    maxzoom: LABEL_ALL_ZOOM,
    layout: {
      ...chipLayout,
      "text-field": [
        "case",
        ["==", ["get", "saved"], 1],
        ["format", ["image", "chip-star"], {}, ["concat", "\u2009", ["get", "id"]], {}],
        ["get", "id"],
      ] as unknown as Expr,
      "text-variable-anchor-offset": [
        "match",
        ["get", "side"],
        ...Object.entries(CHIP_PLACEMENTS).flatMap(([key, p]) => [key, ["literal", anchorOffset(p)]]),
        ["literal", anchorOffset(CHIP_PLACEMENTS.below)],
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
      "text-max-width": 9,
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

const QUIET_LAYERS = ["stops-pin-far", "stops-pin", "stops-notch", "stops-label", "stops-label-near", "tc-pin", "tc-label"];

/** Walk and itinerary scenes show only their own markers: every other stop pin, chip and TC is hidden. */
export function setQuiet(map: maplibregl.Map, quiet: boolean) {
  for (const id of QUIET_LAYERS) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", quiet ? "none" : "visible");
}

let highlighted: string | undefined;
let nearKey = "";
let coveredIds: string[] = [];

function applyFilters(map: maplibregl.Map) {
  const hidden = [...coveredIds, ...(highlighted ? [highlighted] : [])];
  const shown: maplibregl.FilterSpecification = ["!", ["in", ["get", "id"], ["literal", hidden]]];
  map.setFilter("stops-pin", hidden.length ? shown : null);
  map.setFilter("stops-pin-far", hidden.length ? shown : null);
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
}

/**
 * The stops whose ID chip shows at walking zoom, and where (MapView picks the nearest ones whose
 * chip fits on screen, clear of the sheet, search bar, FABs and, where it can, the other pins).
 */
export function setNearLabels(map: maplibregl.Map, labels: NearLabel[]) {
  const key = labels.map((l) => `${l.stop.id}:${l.side}:${l.saved ? 1 : 0}`).join();
  if (key === nearKey) return;
  nearKey = key;
  (map.getSource(NEAR_LABELS_SOURCE) as GeoJSONSource | undefined)?.setData({
    type: "FeatureCollection",
    features: labels.map(({ stop, side, saved }, sort) => ({
      type: "Feature",
      properties: { id: stop.id, side, saved: saved ? 1 : 0, sort },
      geometry: { type: "Point", coordinates: [stop.lon, stop.lat] },
    })),
  });
}

export type TransitTap = { kind: "stop" | "tc"; id: string };

/** Half the side of the square a pin layer draws at the current zoom (C.16: 20dp, 28dp from 16, TC 36dp). */
const pinHalf = (map: maplibregl.Map, layer: string) => (layer === "tc-pin" ? 18 : map.getZoom() >= ALL_PINS_ZOOM ? 14 : 10);

/**
 * The stop or TC under a tap: a tap on an ID chip opens that chip's stop; otherwise the pin whose
 * square is nearest, within TAP_SLOP of its edge (a 44dp target around a 20dp pin).
 */
export function transitAt(map: maplibregl.Map, point: maplibregl.Point): TransitTap | undefined {
  const tap = (f: maplibregl.MapGeoJSONFeature): TransitTap => ({ kind: f.layer.id === "tc-pin" ? "tc" : "stop", id: String(f.properties.id) });
  const labelLayers = ["stops-label", "stops-label-near"].filter((l) => map.getLayer(l));
  const label = labelLayers.length > 0 && map.queryRenderedFeatures(point, { layers: labelLayers })[0];
  if (label) return tap(label);

  const box: [maplibregl.PointLike, maplibregl.PointLike] = [
    [point.x - TAP_REACH, point.y - TAP_REACH],
    [point.x + TAP_REACH, point.y + TAP_REACH],
  ];
  const layers = PIN_LAYERS.filter((l) => map.getLayer(l));
  let best: { tap: TransitTap; d: number } | undefined;
  for (const f of map.queryRenderedFeatures(box, { layers })) {
    if (f.geometry.type !== "Point") continue;
    const p = map.project(f.geometry.coordinates as [number, number]);
    const half = pinHalf(map, f.layer.id);
    const d = Math.hypot(Math.max(0, Math.abs(p.x - point.x) - half), Math.max(0, Math.abs(p.y - point.y) - half));
    if (d > TAP_SLOP || (best && best.d <= d)) continue;
    best = { tap: tap(f), d };
  }
  return best?.tap;
}
