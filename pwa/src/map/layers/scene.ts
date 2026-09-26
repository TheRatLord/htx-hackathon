// The layers a screen draws through the Scene API (C.16): the selected route, itinerary and walk
// legs under the stop pins; markers, live buses, the highlighted stop with its "Stop: 342"
// callout and the rider's dot above them.

import type { Feature as GeoFeature, FeatureCollection, Geometry } from "geojson";
import type maplibregl from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import type { ClientStop, LatLon } from "../../api/types.ts";
import type { Fix } from "../../state/location.tsx";
import type { MapScene } from "../scene.ts";
import { LABEL_FONT_BOLD, token } from "../style.ts";

type Feature = GeoFeature<Geometry, Record<string, string | number>>;
const collection = (features: Feature[]): FeatureCollection => ({ type: "FeatureCollection", features });
const point = (p: LatLon, props: Record<string, string | number>): Feature => ({ type: "Feature", properties: props, geometry: { type: "Point", coordinates: [p.lon, p.lat] } });
const line = (coords: [number, number][], props: Record<string, string>): Feature => ({ type: "Feature", properties: props, geometry: { type: "LineString", coordinates: coords } });

const round = { "line-cap": "round", "line-join": "round" } as const;
const kindIs = (...kinds: string[]) => ["in", ["get", "kind"], ["literal", kinds]] as maplibregl.FilterSpecification;

/** `below`: the first transit layer, so route lines run under the stop pins. */
export function addSceneLayers(map: maplibregl.Map, below: string) {
  for (const id of ["scene-route", "scene-legs", "scene-points", "scene-user"]) map.addSource(id, { type: "geojson", data: collection([]) });
  const lines: maplibregl.LayerSpecification[] = [
    { id: "scene-route-casing", type: "line", source: "scene-route", paint: { "line-color": "#fff", "line-width": 10 }, layout: round },
    { id: "scene-route", type: "line", source: "scene-route", paint: { "line-color": ["get", "color"], "line-width": 6 }, layout: round },
    { id: "scene-ride-casing", type: "line", source: "scene-legs", filter: ["==", ["get", "kind"], "ride"], paint: { "line-color": "#fff", "line-width": 10 }, layout: round },
    { id: "scene-ride", type: "line", source: "scene-legs", filter: ["==", ["get", "kind"], "ride"], paint: { "line-color": ["get", "color"], "line-width": 6 }, layout: round },
    {
      id: "scene-walk",
      type: "line",
      source: "scene-legs",
      filter: ["==", ["get", "kind"], "walk"],
      paint: { "line-color": token("--c-walk-line"), "line-width": 5, "line-dasharray": [0.1, 2] },
      layout: round,
    },
  ];
  for (const l of lines) map.addLayer(l, below);

  map.addLayer({
    id: "scene-stops",
    type: "circle",
    source: "scene-points",
    filter: kindIs("origin", "board", "alight", "transfer"),
    paint: {
      "circle-radius": ["match", ["get", "kind"], "origin", 8, 7],
      "circle-color": ["match", ["get", "kind"], "origin", token("--c-origin-dot"), "#fff"],
      "circle-stroke-color": ["match", ["get", "kind"], "origin", "#fff", token("--c-brand-navy")],
      "circle-stroke-width": ["match", ["get", "kind"], "origin", 2, 3],
    },
  });
  map.addLayer({
    id: "scene-icons",
    type: "symbol",
    source: "scene-points",
    filter: kindIs("destination", "vehicle", "highlight"),
    layout: {
      "icon-image": ["match", ["get", "kind"], "destination", "pin-dest", "vehicle", "vehicle", ["case", ["==", ["get", "rail"], 1], "pin-rail-lg", "pin-bus-lg"]],
      "icon-anchor": ["match", ["get", "kind"], "destination", "bottom", "center"],
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
  });
  map.addLayer({
    id: "scene-labels",
    type: "symbol",
    source: "scene-points",
    filter: ["all", ["has", "label"], ["!=", ["get", "kind"], "highlight"]],
    layout: {
      "text-field": ["get", "label"],
      "text-font": LABEL_FONT_BOLD,
      "text-size": 14,
      "text-anchor": "top",
      "text-offset": [0, 1.3],
      "icon-image": "label-chip",
      "icon-text-fit": "both",
      "icon-text-fit-padding": [1, 5, 1, 5],
      "text-allow-overlap": true,
      "icon-allow-overlap": true,
    },
    paint: { "text-color": token("--c-text") },
  });
  // Today's white "Stop: 342" callout with its pointer on the pin.
  map.addLayer({
    id: "scene-callout",
    type: "symbol",
    source: "scene-points",
    filter: ["==", ["get", "kind"], "highlight"],
    layout: {
      "text-field": ["get", "label"],
      "text-font": LABEL_FONT_BOLD,
      "text-size": 16,
      "text-anchor": "bottom",
      "text-offset": [0, -1.9],
      "icon-image": "callout",
      "icon-text-fit": "both",
      "icon-text-fit-padding": [4, 8, 10, 8],
      "text-allow-overlap": true,
      "icon-allow-overlap": true,
    },
    paint: { "text-color": token("--c-text") },
  });
  map.addLayer({
    id: "scene-user-halo",
    type: "circle",
    source: "scene-user",
    paint: { "circle-color": token("--c-user-dot"), "circle-opacity": 0.15 },
  });
  map.addLayer({
    id: "scene-user",
    type: "circle",
    source: "scene-user",
    paint: { "circle-radius": 8, "circle-color": token("--c-user-dot"), "circle-stroke-color": "#fff", "circle-stroke-width": 2 },
  });
}

const src = (map: maplibregl.Map, id: string) => map.getSource(id) as GeoJSONSource | undefined;

/** The accuracy halo in metres, as a pixel radius that follows the zoom. */
function haloRadius(user: Fix): maplibregl.ExpressionSpecification {
  const metresPerPxAtZ0 = 156543.03 * Math.cos((user.lat * Math.PI) / 180);
  const px = (z: number) => Math.max(8, user.accuracyM / (metresPerPxAtZ0 / 2 ** z));
  return ["interpolate", ["exponential", 2], ["zoom"], 10, px(10), 20, px(20)];
}

export function showUser(map: maplibregl.Map, user: Fix | undefined) {
  src(map, "scene-user")?.setData(collection(user ? [point(user, {})] : []));
  if (user) map.setPaintProperty("scene-user-halo", "circle-radius", haloRadius(user));
}

export function drawScene(map: maplibregl.Map, scene: MapScene, highlight: ClientStop | undefined, highlightLabel: string) {
  src(map, "scene-route")?.setData(collection(scene.routeLine ? [line(scene.routeLine.coords, { color: scene.routeLine.color })] : []));
  src(map, "scene-legs")?.setData(collection((scene.legs ?? []).map((l) => line(l.coords, { kind: l.kind, color: l.color }))));
  const points: Feature[] = [
    ...(scene.markers ?? []).map((m) => point(m.point, { kind: m.kind, ...(m.label && { label: m.label }) })),
    ...(scene.vehicles ?? []).map((v) => point(v.point, { kind: "vehicle", label: v.label })),
  ];
  if (highlight) points.push(point(highlight, { kind: "highlight", rail: highlight.kind === "rail" ? 1 : 0, label: highlightLabel }));
  src(map, "scene-points")?.setData(collection(points));
}
