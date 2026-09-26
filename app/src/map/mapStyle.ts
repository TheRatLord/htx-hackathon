import type { StyleSpecification } from 'maplibre-gl';
import { blocks, highway, labelPoints, majorStreets, minorStreets, parks, water } from './basemap';

export type MapTheme = 'light' | 'dark';

export interface MapPalette {
  land: string;
  block: string;
  street: string;
  streetMajor: string;
  streetCasing: string;
  park: string;
  zoo: string;
  water: string;
  highway: string;
  highwayCasing: string;
  labelStreet: string;
  labelDistrict: string;
  labelPoi: string;
  labelWater: string;
  labelHalo: string;
  shield: string;
  poiDot: string;
}

/** Muted, low-contrast base so transit information stands out on top. */
export const PALETTES: Record<MapTheme, MapPalette> = {
  light: {
    land: '#efece6',
    block: '#e5e1d8',
    street: '#fbfaf8',
    streetMajor: '#ffffff',
    streetCasing: '#dcd7cc',
    park: '#d3e8cb',
    zoo: '#c6e0bc',
    water: '#b9d7ec',
    highway: '#f4d48a',
    highwayCasing: '#e0b75f',
    labelStreet: '#6f7480',
    labelDistrict: '#7b808c',
    labelPoi: '#4f5a6e',
    labelWater: '#4f7ea3',
    labelHalo: 'rgba(250,249,246,0.95)',
    shield: '#1c4f9c',
    poiDot: '#8a93a6',
  },
  dark: {
    land: '#131a26',
    block: '#182131',
    street: '#1f2a3c',
    streetMajor: '#2a3850',
    streetCasing: '#0f151f',
    park: '#15291f',
    zoo: '#183324',
    water: '#11304a',
    highway: '#5a4a26',
    highwayCasing: '#3b3019',
    labelStreet: '#8793a8',
    labelDistrict: '#7e8aa0',
    labelPoi: '#b3bdd0',
    labelWater: '#6ea3cc',
    labelHalo: 'rgba(19,26,38,0.95)',
    shield: '#2d66c6',
    poiDot: '#6d7890',
  },
};

// Built once: the geometry never changes, only colours do.
const DATA = {
  minor: minorStreets(),
  major: majorStreets(),
  blocks: blocks(),
  parks: parks(),
  water: water(),
  highway: highway(),
  labels: labelPoints(),
};

export const LABEL_SPECS = DATA.labels.specs;

export const SCENE_ROUTES_SOURCE = 'scene-routes';
export const ROUTE_LAYERS = ['route-walk', 'route-casing', 'route-line'] as const;
export const ROUTE_HIT_LAYER = 'route-hit';

const lineWidth = (base: number) =>
  ['interpolate', ['exponential', 1.6], ['zoom'], 12, base * 0.35, 15, base, 18, base * 3.2] as unknown as number;

export function buildStyle(theme: MapTheme): StyleSpecification {
  const p = PALETTES[theme];
  return {
    version: 8,
    name: `ridemetro-concept-${theme}`,
    sources: {
      minor: { type: 'geojson', data: DATA.minor },
      major: { type: 'geojson', data: DATA.major },
      blocks: { type: 'geojson', data: DATA.blocks },
      parks: { type: 'geojson', data: DATA.parks },
      water: { type: 'geojson', data: DATA.water },
      highway: { type: 'geojson', data: DATA.highway },
      labels: { type: 'geojson', data: DATA.labels.features },
      [SCENE_ROUTES_SOURCE]: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
    },
    layers: [
      { id: 'land', type: 'background', paint: { 'background-color': p.land } },
      {
        id: 'blocks',
        type: 'fill',
        source: 'blocks',
        minzoom: 13.5,
        paint: { 'fill-color': p.block, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 13.5, 0, 14.5, 1] },
      },
      {
        id: 'parks',
        type: 'fill',
        source: 'parks',
        paint: { 'fill-color': ['match', ['get', 'kind'], 'zoo', p.zoo, p.park] },
      },
      {
        id: 'water-fill',
        type: 'fill',
        source: 'water',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-color': p.water },
      },
      {
        id: 'water-line',
        type: 'line',
        source: 'water',
        filter: ['==', ['geometry-type'], 'LineString'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': p.water, 'line-width': lineWidth(14) },
      },
      {
        id: 'streets-minor',
        type: 'line',
        source: 'minor',
        layout: { 'line-cap': 'butt', 'line-join': 'miter' },
        paint: { 'line-color': p.street, 'line-width': lineWidth(5) },
      },
      {
        id: 'streets-major-casing',
        type: 'line',
        source: 'major',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': p.streetCasing, 'line-width': lineWidth(10) },
      },
      {
        id: 'streets-major',
        type: 'line',
        source: 'major',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': p.streetMajor, 'line-width': lineWidth(8) },
      },
      {
        id: 'highway-casing',
        type: 'line',
        source: 'highway',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': p.highwayCasing, 'line-width': lineWidth(14) },
      },
      {
        id: 'highway',
        type: 'line',
        source: 'highway',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': p.highway, 'line-width': lineWidth(11) },
      },
      {
        id: 'poi-dots',
        type: 'circle',
        source: 'labels',
        filter: ['==', ['get', 'kind'], 'poi'],
        paint: {
          'circle-color': p.poiDot,
          'circle-radius': 4,
          'circle-stroke-color': p.land,
          'circle-stroke-width': 2,
        },
      },
      {
        id: 'labels',
        type: 'symbol',
        source: 'labels',
        minzoom: 12.6,
        layout: {
          'icon-image': ['get', 'image'],
          'icon-rotate': ['get', 'rotate'],
          'icon-rotation-alignment': 'map',
          'icon-anchor': ['match', ['get', 'kind'], 'poi', 'left', 'center'],
          'icon-offset': ['match', ['get', 'kind'], 'poi', ['literal', [14, 0]], ['literal', [0, 0]]],
          'icon-padding': 4,
          'symbol-sort-key': ['get', 'rank'],
        },
        paint: {
          'icon-opacity': ['interpolate', ['linear'], ['zoom'], 12.6, 0, 13.1, 1],
        },
      },
      // Scene layers: route options drawn by the current screen.
      {
        id: 'route-walk',
        type: 'line',
        source: SCENE_ROUTES_SOURCE,
        filter: ['==', ['get', 'kind'], 'walk'],
        layout: { 'line-cap': 'round', 'line-join': 'round', 'line-sort-key': ['get', 'z'] },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['case', ['get', 'selected'], 5, 4],
          'line-dasharray': [0, 2],
          'line-opacity': ['case', ['get', 'selected'], 1, 0.55],
        },
      },
      {
        id: 'route-casing',
        type: 'line',
        source: SCENE_ROUTES_SOURCE,
        filter: ['==', ['get', 'kind'], 'ride'],
        layout: { 'line-cap': 'round', 'line-join': 'round', 'line-sort-key': ['get', 'z'] },
        paint: {
          'line-color': theme === 'dark' ? '#0b111d' : '#ffffff',
          'line-width': ['case', ['get', 'selected'], 11, 8],
          'line-opacity': ['case', ['get', 'selected'], 1, 0.7],
        },
      },
      {
        id: 'route-line',
        type: 'line',
        source: SCENE_ROUTES_SOURCE,
        filter: ['==', ['get', 'kind'], 'ride'],
        layout: { 'line-cap': 'round', 'line-join': 'round', 'line-sort-key': ['get', 'z'] },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['case', ['get', 'selected'], 7, 5],
          'line-opacity': ['case', ['get', 'selected'], 1, 0.5],
        },
      },
      {
        id: ROUTE_HIT_LAYER,
        type: 'line',
        source: SCENE_ROUTES_SOURCE,
        layout: { 'line-cap': 'round' },
        paint: { 'line-color': '#000000', 'line-width': 24, 'line-opacity': 0 },
      },
    ],
  };
}
