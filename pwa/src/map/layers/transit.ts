// The stop-pin, direction-notch, stop-ID label and transit-center layers (C.16), plus the tap
// test that turns a tap on a pin or its ID chip into its stop or TC.

import type { FeatureCollection } from "geojson";
import type maplibregl from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import type { ClientStop, LatLon, TransitCenterSummary } from "../../api/types.ts";
import { LABEL_FONT_BOLD, token } from "../style.ts";

export const STOPS_SOURCE = "stops";
const TCS_SOURCE = "transit-centers";
const PIN_LAYERS = ["tc-pin", "stops-pin"];
/** How far outside a pin's square a tap still hits it. */
const TAP_SLOP = 12;
/** The query box reaches the edge of the largest pin plus the slop. */
const TAP_REACH = 18 + TAP_SLOP;

type Expr = maplibregl.ExpressionSpecification;
const isRail: Expr = ["==", ["get", "kind"], "rail"];
/** 20dp pins below zoom 16, 28dp from 16 (C.16). */
const pinImage: Expr = ["step", ["zoom"], ["case", isRail, "pin-rail-sm", "pin-bus-sm"], 16, ["case", isRail, "pin-rail-md", "pin-bus-md"]];

export function stopsCollection(stops: ClientStop[], anchor: LatLon): FeatureCollection {
  // Squared equirectangular distance: enough to rank labels, and cheap for 8,797 stops.
  const k = Math.cos((anchor.lat * Math.PI) / 180);
  return {
    type: "FeatureCollection",
    features: stops.map((s) => ({
      type: "Feature",
      properties: { id: s.id, kind: s.kind === "rail" ? "rail" : "stop", ...(s.bearing !== undefined && { bearing: s.bearing }), sort: ((s.lat - anchor.lat) ** 2 + ((s.lon - anchor.lon) * k) ** 2) * 1e8 },
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
export const BOTTOM_TRANSIT_LAYER = "stops-label";

/**
 * Layers are added bottom to top; MapLibre places symbols top to bottom. So the pins (always
 * shown) are placed before the ID chips, and a chip moves to another side of its pin, or hides,
 * rather than cover a pin, the rider's dot or a scene marker.
 */
export function addTransitLayers(map: maplibregl.Map) {
  const empty: FeatureCollection = { type: "FeatureCollection", features: [] };
  map.addSource(STOPS_SOURCE, { type: "geojson", data: empty });
  map.addSource(TCS_SOURCE, { type: "geojson", data: empty });
  const text = token("--c-text");

  map.addLayer({
    id: "stops-label",
    type: "symbol",
    source: STOPS_SOURCE,
    minzoom: 16,
    layout: {
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
    },
    paint: { "text-color": text },
  });
  map.addLayer({
    id: "stops-pin",
    type: "symbol",
    source: STOPS_SOURCE,
    minzoom: 14,
    // Pins always show, and reserve exactly their square: labels may sit right next to them.
    layout: { "icon-image": pinImage, "icon-allow-overlap": true, "icon-padding": 0 },
  });
  map.addLayer({
    id: "stops-notch",
    type: "symbol",
    source: STOPS_SOURCE,
    minzoom: 14,
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
  map.addLayer({
    id: "tc-label",
    type: "symbol",
    source: TCS_SOURCE,
    minzoom: 13,
    layout: {
      "text-field": ["get", "name"],
      "text-font": LABEL_FONT_BOLD,
      "text-size": 14,
      "text-anchor": "top",
      "text-offset": [0, 1.6],
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

/** Hides one stop's normal pin and label while the scene shows it enlarged with its callout. */
export function setHighlightedStop(map: maplibregl.Map, stopId: string | undefined) {
  const filter: maplibregl.FilterSpecification | null = stopId ? ["!=", ["get", "id"], stopId] : null;
  map.setFilter("stops-pin", filter);
  map.setFilter("stops-label", filter);
  map.setFilter("stops-notch", stopId ? ["all", ["has", "bearing"], ["!=", ["get", "id"], stopId]] : ["has", "bearing"]);
}

export type TransitTap = { kind: "stop" | "tc"; id: string };

/** Half the side of the square a pin layer draws at the current zoom (C.16: 20dp, 28dp from 16, TC 36dp). */
const pinHalf = (map: maplibregl.Map, layer: string) => (layer === "tc-pin" ? 18 : map.getZoom() >= 16 ? 14 : 10);

/**
 * The stop or TC under a tap: a tap on an ID chip opens that chip's stop; otherwise the pin whose
 * square is nearest, within TAP_SLOP of its edge (a 44dp target around a 20dp pin).
 */
export function transitAt(map: maplibregl.Map, point: maplibregl.Point): TransitTap | undefined {
  const tap = (f: maplibregl.MapGeoJSONFeature): TransitTap => ({ kind: f.layer.id === "tc-pin" ? "tc" : "stop", id: String(f.properties.id) });
  const label = map.getLayer("stops-label") && map.queryRenderedFeatures(point, { layers: ["stops-label"] })[0];
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
