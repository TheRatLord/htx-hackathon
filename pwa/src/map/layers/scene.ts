// The layers a screen draws through the Scene API (C.16): the selected route, itinerary and walk
// legs under the stop pins; markers, live buses, the highlighted stop with its "Stop: 342"
// callout and the rider's dot above them; marker labels placed around them.

import type { Feature as GeoFeature, FeatureCollection, Geometry } from "geojson";
import type maplibregl from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import type { ClientStop, LatLon } from "../../api/types.ts";
import type { Fix } from "../../state/location.tsx";
import type { MapScene } from "../scene.ts";
import { LABEL_FONT_BOLD, token } from "../style.ts";
import { BOTTOM_TRANSIT_LAYER } from "./transit.ts";
import { STALE_VEHICLE_S } from "../../lib/format.ts";
import { anchorOffset, LABEL_MAX_EM, LABEL_PLACEMENTS, LABEL_POINTER, pointAlong } from "../placement.ts";

type Feature = GeoFeature<Geometry, Record<string, string | number>>;
const collection = (features: Feature[]): FeatureCollection => ({ type: "FeatureCollection", features });
const point = (p: LatLon, props: Record<string, string | number>): Feature => ({ type: "Feature", properties: props, geometry: { type: "Point", coordinates: [p.lon, p.lat] } });
const line = (coords: [number, number][], props: Record<string, string>): Feature => ({ type: "Feature", properties: props, geometry: { type: "LineString", coordinates: coords } });

const round = { "line-cap": "round", "line-join": "round" } as const;

const SCENE_LABEL_FILTER: maplibregl.ExpressionSpecification = ["all", ["has", "label"], ["!=", ["get", "kind"], "highlight"]];
let hiddenLabels: string[] = [];

/** Markers drawn as a pin standing on their point (their label goes above the pin's head). */
export const TALL_PINS = new Set(["place", "destination"]);

/**
 * Lines go under every transit layer. Markers, the callout and the user dot always show and
 * reserve their space; the scene's labels are placed next (moving off them), and before the stop
 * pins and ID chips, so dense stop pins never push a scene label off the map.
 */
export function addSceneLayers(map: maplibregl.Map) {
  hiddenLabels = [];
  labelSides = {};
  labelPoints = {};
  lastPoints = [];
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
  for (const l of lines) map.addLayer(l, BOTTOM_TRANSIT_LAYER);
  map.addLayer({
    id: "scene-labels",
    type: "symbol",
    source: "scene-points",
    filter: SCENE_LABEL_FILTER,
    layout: {
      "text-field": ["get", "label"],
      "text-font": LABEL_FONT_BOLD,
      "text-size": 14,
      // Above its marker (the camera's top padding leaves room; below, it could fall under the
      // sheet), else on whichever side is free of the markers, callout and user dot. Far enough
      // out to clear the 36dp highlighted pin a board marker may share a point with. A marker on
      // the scene's west or east edge puts its label on the inward side first, so a wide label
      // ("Transfer · #4789") never runs off the screen edge (see labelEdge).
      // A place or destination pin rises 40dp above its point: its label goes above the pin head
      // ("t" keys), not beside it where it ran into the FABs.
      "text-variable-anchor-offset": [
        "match",
        ["get", "lk"],
        "w",
        ["literal", ["bottom-left", [0.8, -1.4], "left", [2.6, 0], "bottom", [0, -2], "top-left", [0.8, 1.4], "top", [0, 2], "right", [-2.6, 0]]],
        "e",
        ["literal", ["bottom-right", [-0.8, -1.4], "right", [-2.6, 0], "bottom", [0, -2], "top-right", [-0.8, 1.4], "top", [0, 2], "left", [2.6, 0]]],
        "wt",
        ["literal", ["bottom-left", [0.8, -4], "bottom", [0, -4], "left", [1.8, -1.4], "right", [-1.8, -1.4]]],
        "et",
        ["literal", ["bottom-right", [-0.8, -4], "bottom", [0, -4], "right", [-1.8, -1.4], "left", [1.8, -1.4]]],
        "t",
        ["literal", ["bottom", [0, -4], "left", [1.8, -1.4], "right", [-1.8, -1.4]]],
        // The side placeLabels (MapView) chose, clear of the sheet, chrome, markers and lines.
        ...Object.entries(LABEL_PLACEMENTS).flatMap(([key, p]) => [key, ["literal", anchorOffset(p)]]),
        ["literal", ["bottom", [0, -2], "left", [2.6, 0], "right", [-2.6, 0], "top", [0, 2]]],
      ] as unknown as maplibregl.ExpressionSpecification,
      "text-max-width": LABEL_MAX_EM,
      // A label beside its marker points at it, as a stop's ID chip does ("567" read as the
      // rider's dot's label, 05); a leg's route chip sits on its line and has none.
      "icon-image": ["match", ["get", "lk"], ...Object.entries(LABEL_POINTER).flatMap(([k, dir]) => [k, `label-chip-${dir}`]), "label-chip"] as unknown as maplibregl.ExpressionSpecification,
      "icon-text-fit": "both",
      "icon-text-fit-padding": [1, 5, 1, 5],
      // placeLabels (MapView) already chose a side clear of the markers, lines and chrome, and left
      // out any label with no room: MapLibre's own collision test dropped a label whose pointer
      // reached its marker's box.
      "text-allow-overlap": true,
      "icon-allow-overlap": true,
    },
    paint: { "text-color": token("--c-text") },
  });
  map.addLayer({
    id: "scene-markers",
    type: "symbol",
    source: "scene-points",
    // A ride leg's route label has no marker of its own.
    filter: ["!=", ["get", "kind"], "leg"],
    layout: {
      "icon-image": [
        "match",
        ["get", "kind"],
        "origin",
        "dot-origin",
        "destination",
        "pin-dest",
        "place",
        "pin-place",
        "vehicle",
        "vehicle",
        "vehicle-stale",
        "vehicle-stale",
        "highlight",
        ["case", ["==", ["get", "rail"], 1], "pin-rail-lg", "pin-bus-lg"],
        "dot-stop",
      ],
      "icon-anchor": ["match", ["get", "kind"], ["destination", "place"], "bottom", "center"],
      "icon-allow-overlap": true,
    },
  });
  // Today's white callout with its pointer on the pin (the stop's name, on walk and trip scenes).
  map.addLayer({
    id: "scene-callout",
    type: "symbol",
    source: "scene-points",
    filter: ["all", ["==", ["get", "kind"], "highlight"], ["has", "label"]],
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
    type: "symbol",
    source: "scene-user",
    layout: { "icon-image": "dot-user", "icon-allow-overlap": true },
  });
}


/**
 * Marker labels (by marker id) that would fall under the sheet or the map chrome are left out:
 * "Transfer · #4789" cut in half by the sheet's edge read as a glitch, and the sheet lists it.
 */
export function hideSceneLabels(map: maplibregl.Map, ids: string[]) {
  if (ids.length === hiddenLabels.length && ids.every((id, i) => id === hiddenLabels[i])) return;
  hiddenLabels = ids;
  if (!map.getLayer("scene-labels")) return;
  map.setFilter("scene-labels", ids.length ? ["all", SCENE_LABEL_FILTER, ["!", ["in", ["get", "id"], ["literal", ids]]]] : SCENE_LABEL_FILTER);
}

/** Marker id to the side its label goes (a LABEL_PLACEMENTS key), set by placeLabels. */
let labelSides: Record<string, string> = {};
/** A leg label's point along its leg, when placeLabels moved it off the midpoint. */
let labelPoints: Record<string, [number, number]> = {};
let lastPoints: Feature[] = [];

const withSides = (features: Feature[]): Feature[] =>
  features.map((f) => {
    const id = String(f.properties.id ?? "");
    const side = labelSides[id];
    if (!side || !f.properties.label) return f;
    const at = labelPoints[id];
    return { ...f, properties: { ...f.properties, lk: side }, ...(at && { geometry: { type: "Point" as const, coordinates: at } }) };
  });

/**
 * Every scene label goes to the side placeLabels found clear (above first), rather than MapLibre's
 * own fallback, which put "Transfer · #4789" under the sheet's edge at 360 (24-360).
 */
export function setLabelSides(map: maplibregl.Map, sides: Record<string, string>, points: Record<string, [number, number]> = {}) {
  const key = (o: Record<string, unknown>) => Object.entries(o).sort().join();
  if (key(sides) === key(labelSides) && key(points) === key(labelPoints)) return;
  labelSides = sides;
  labelPoints = points;
  src(map, "scene-points")?.setData(collection(withSides(lastPoints)));
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

/**
 * "w" or "e" for a marker in the west or east quarter of the scene's extent (markers and legs):
 * a fitted scene puts those near the screen's edge, so their label goes on the inward side.
 */
function labelEdge(scene: MapScene): (lon: number) => string {
  const lons = [...(scene.markers ?? []).map((m) => m.point.lon), ...(scene.legs ?? []).flatMap((l) => l.coords.map((c) => c[0]))];
  const min = Math.min(...lons);
  const span = Math.max(...lons) - min;
  if (!(span > 0)) return () => "";
  return (lon) => {
    const f = (lon - min) / span;
    return f < 0.25 ? "w" : f > 0.75 ? "e" : "";
  };
}

/** The scene-points id of leg `i`'s route label. */
export const legLabelId = (i: number) => `leg-${i}`;

export function drawScene(map: maplibregl.Map, scene: MapScene, highlight: ClientStop | undefined, highlightLabel: string) {
  src(map, "scene-route")?.setData(collection(scene.routeLine ? [line(scene.routeLine.coords, { color: scene.routeLine.color })] : []));
  src(map, "scene-legs")?.setData(collection((scene.legs ?? []).map((l) => line(l.coords, { kind: l.kind, color: l.color ?? "" }))));
  const edge = labelEdge(scene);
  const points: Feature[] = [
    ...(scene.markers ?? []).map((m) =>
      point(m.point, { id: m.id, kind: m.kind, lk: `${edge(m.point.lon)}${TALL_PINS.has(m.kind) ? "t" : ""}`, ...(m.label && { label: m.label }) }),
    ),
    ...(scene.vehicles ?? []).map((v) => point(v.point, { kind: (v.ageSeconds ?? 0) > STALE_VEHICLE_S ? "vehicle-stale" : "vehicle", label: v.label })),
  ];
  // A route label halfway along each labelled ride leg, so a transfer between two navy lines reads
  // as two buses ([80] then [73], 25).
  (scene.legs ?? []).forEach((l, i) => {
    const mid = l.label ? pointAlong(l.coords) : undefined;
    if (mid) points.push(point({ lon: mid[0], lat: mid[1] }, { id: legLabelId(i), kind: "leg", lk: "c", label: l.label! }));
  });
  if (highlight) points.push(point(highlight, { kind: "highlight", rail: highlight.kind === "rail" ? 1 : 0, ...(highlightLabel && { label: highlightLabel }) }));
  lastPoints = points;
  src(map, "scene-points")?.setData(collection(withSides(points)));
}
