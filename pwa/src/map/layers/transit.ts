// The stop-pin, direction-notch, stop-ID label and transit-center layers (C.16), plus the tap
// test that turns a tap near a pin into its stop or TC.

import type { FeatureCollection } from "geojson";
import type maplibregl from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import type { ClientStop, LatLon, TransitCenterSummary } from "../../api/types.ts";
import { LABEL_FONT_BOLD, token } from "../style.ts";

export const STOPS_SOURCE = "stops";
const TCS_SOURCE = "transit-centers";
const TAP_LAYERS = ["tc-pin", "stops-pin"];
/** Half of the 44dp hit area around a pin. */
const TAP_RADIUS = 22;

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

export function addTransitLayers(map: maplibregl.Map) {
  const empty: FeatureCollection = { type: "FeatureCollection", features: [] };
  map.addSource(STOPS_SOURCE, { type: "geojson", data: empty });
  map.addSource(TCS_SOURCE, { type: "geojson", data: empty });
  const text = token("--c-text");

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
      // Just outside the pin's edge: 10dp + half the notch at 20dp pins, 14dp + half at 28dp.
      "icon-offset": ["step", ["zoom"], ["literal", [0, -14]], 16, ["literal", [0, -18]]],
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
  });
  map.addLayer({
    id: "stops-pin",
    type: "symbol",
    source: STOPS_SOURCE,
    minzoom: 14,
    layout: { "icon-image": pinImage, "icon-allow-overlap": true, "icon-ignore-placement": true },
  });
  map.addLayer({
    id: "stops-label",
    type: "symbol",
    source: STOPS_SOURCE,
    minzoom: 16,
    layout: {
      "text-field": ["get", "id"],
      "text-font": LABEL_FONT_BOLD,
      "text-size": 14,
      "text-anchor": "top",
      "text-offset": [0, 1.35],
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
    id: "tc-pin",
    type: "symbol",
    source: TCS_SOURCE,
    minzoom: 11,
    layout: { "icon-image": "pin-tc", "icon-allow-overlap": true, "icon-ignore-placement": true },
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
}

/** Hides one stop's normal pin and label while the scene shows it enlarged with its callout. */
export function setHighlightedStop(map: maplibregl.Map, stopId: string | undefined) {
  const filter: maplibregl.FilterSpecification | null = stopId ? ["!=", ["get", "id"], stopId] : null;
  map.setFilter("stops-pin", filter);
  map.setFilter("stops-label", filter);
  map.setFilter("stops-notch", stopId ? ["all", ["has", "bearing"], ["!=", ["get", "id"], stopId]] : ["has", "bearing"]);
}

export type TransitTap = { kind: "stop" | "tc"; id: string };

/** The stop or TC nearest a tap, within 22dp of its pin. */
export function transitAt(map: maplibregl.Map, point: maplibregl.Point): TransitTap | undefined {
  const box: [maplibregl.PointLike, maplibregl.PointLike] = [
    [point.x - TAP_RADIUS, point.y - TAP_RADIUS],
    [point.x + TAP_RADIUS, point.y + TAP_RADIUS],
  ];
  const layers = TAP_LAYERS.filter((l) => map.getLayer(l));
  let best: { tap: TransitTap; d: number } | undefined;
  for (const f of map.queryRenderedFeatures(box, { layers })) {
    if (f.geometry.type !== "Point") continue;
    const p = map.project(f.geometry.coordinates as [number, number]);
    const d = Math.hypot(p.x - point.x, p.y - point.y);
    if (d > TAP_RADIUS * Math.SQRT2 || (best && best.d <= d)) continue;
    best = { tap: { kind: f.layer.id === "tc-pin" ? "tc" : "stop", id: String(f.properties.id) }, d };
  }
  return best?.tap;
}
