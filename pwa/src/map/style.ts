// The base map: OpenFreeMap's Liberty style repainted to look like the Google map riders know from
// today's app (C.16): light grey land, white streets, blue-grey freeways, green parks, pale blue
// water, grey labels, and no shop or food POIs.

import type { LayerSpecification, StyleSpecification } from "maplibre-gl";
import { DOWNTOWN } from "../lib/geo.ts";

export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
export const LABEL_FONT = ["Noto Sans Regular"];
/** Stop-ID chips and the TC tile read better in bold at 14px. */
export const LABEL_FONT_BOLD = ["Noto Sans Bold"];
export const ATTRIBUTION = "© OpenFreeMap © OpenStreetMap";

export const DEFAULT_CAMERA = { center: [DOWNTOWN.lon, DOWNTOWN.lat] as [number, number], zoom: 14 };
/** Zoom 16 shows the ID labels of the pins nearest the rider (M4). */
export const USER_ZOOM = 16;

/** Reads a colour token from tokens.css, so the map and the UI share one palette. */
export const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Layers that add noise without helping a rider find a stop. OSM's own bus stops are replaced by ours. */
const DROP = /^(natural_earth|park_outline|landuse_residential|landuse_school|landcover_wetland|landcover_sand|building-3d|poi_transit|road_area_pattern|boundary_)/;
const SHOP_FOOD = ["shop", "grocery", "clothing_store", "restaurant", "fast_food", "cafe", "bar", "beer", "ice_cream", "bakery", "alcohol_shop", "jewelry"];

type Paint = Record<string, unknown>;

function roadPaint(id: string, c: Record<string, string>): Paint | undefined {
  if (!/^(road|bridge|tunnel)_/.test(id) || /rail|one_way|pedestrian/.test(id)) return undefined;
  const freeway = id.includes("motorway");
  if (id.endsWith("_casing")) return { "line-color": freeway ? c.highway : c.casing };
  return { "line-color": freeway ? c.highway : c.road };
}

function restyleLayer(layer: LayerSpecification, c: Record<string, string>): LayerSpecification | null {
  const { id } = layer;
  if (DROP.test(id)) return null;
  const set = (paint: Paint) => ({ ...layer, paint: { ...(layer as { paint?: Paint }).paint, ...paint } }) as LayerSpecification;

  if (layer.type === "background") return set({ "background-color": c.land });
  if (id === "park") return set({ "fill-color": c.park, "fill-opacity": 1, "fill-outline-color": c.park });
  if (id.startsWith("landcover_wood") || id.startsWith("landcover_grass") || /landuse_(pitch|track|cemetery)/.test(id))
    return set({ "fill-color": c.park, "fill-opacity": 0.8 });
  if (id === "landuse_hospital") return set({ "fill-color": c.hospital });
  if (id === "water") return set({ "fill-color": c.water });
  if (id.startsWith("waterway") && layer.type === "line") return set({ "line-color": c.water });
  if (id === "aeroway_fill") return set({ "fill-color": c.casing, "fill-opacity": 1 });
  if (id.startsWith("aeroway_")) return set({ "line-color": c.road });
  if (id === "building") return set({ "fill-color": c.building, "fill-outline-color": c.casing });
  if (layer.type === "line") {
    const road = roadPaint(id, c);
    if (road) return set(road);
    if (/rail/.test(id)) return set({ "line-color": c.rail });
  }

  if (layer.type === "symbol") {
    if (id.startsWith("poi_")) {
      // POI icons only from zoom 17, and never shops or food (C.16).
      const filter = ["all", layer.filter ?? true, ["!", ["in", ["get", "class"], ["literal", SHOP_FOOD]]]];
      return { ...set({ "text-color": c.label, "text-halo-color": "#fff", "text-halo-width": 1.5 }), minzoom: 17, filter } as LayerSpecification;
    }
    if (id.startsWith("water") || id.startsWith("waterway")) return layer;
    if (id.startsWith("highway-name") || id.startsWith("label_") || id === "airport")
      return set({ "text-color": c.label, "text-halo-color": "#fff", "text-halo-width": 1.5, "text-halo-blur": 0 });
  }
  return layer;
}

/** A plain land-coloured style, used when the base style can't be fetched (offline, first run). */
function fallbackStyle(land: string): StyleSpecification {
  return { version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": land } }] };
}

export async function loadMapStyle(): Promise<StyleSpecification> {
  const c = {
    land: token("--c-map-land"),
    park: token("--c-map-park"),
    hospital: token("--c-map-hospital"),
    water: token("--c-map-water"),
    highway: token("--c-map-highway"),
    road: token("--c-map-road"),
    casing: token("--c-map-road-casing"),
    label: token("--c-map-label"),
    building: token("--c-chip-inactive"),
    rail: token("--c-outline"),
  };
  try {
    const res = await fetch(MAP_STYLE_URL);
    if (!res.ok) throw new Error(String(res.status));
    const base = (await res.json()) as StyleSpecification;
    const layers = base.layers.flatMap((l) => restyleLayer(l, c) ?? []);
    // The tile source's own attribution is replaced by the one compact line C.16 asks for.
    const sources = Object.fromEntries(Object.entries(base.sources).map(([k, s]) => [k, { ...s, attribution: ATTRIBUTION }]));
    return { ...base, sources, layers } as StyleSpecification;
  } catch {
    return fallbackStyle(c.land);
  }
}
