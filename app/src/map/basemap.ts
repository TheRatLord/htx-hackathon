import type { FeatureCollection, LineString, Point, Polygon } from 'geojson';
import {
  BUFFALO_BAYOU,
  DISTRICT_LABELS,
  GRID,
  HERMANN_PARK,
  HIGHWAY_69,
  MCGOVERN_LAKE,
  STREETS,
  ZOO_GROUNDS,
} from '../data/geography';
import { PLACES } from '../data/sampleData';
import type { LngLat } from '../data/types';

/**
 * Builds the offline basemap as GeoJSON: a street grid, blocks, parks, water,
 * the 69 freeway and labels. No tile server, no API key.
 */

function inPolygon([x, y]: LngLat, poly: LngLat[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const inPark = (p: LngLat) => inPolygon(p, HERMANN_PARK);

function gridLines(axis: 'ns' | 'ew'): number[] {
  const out: number[] = [];
  if (axis === 'ns') {
    const start = GRID.lngOrigin - Math.ceil((GRID.lngOrigin - GRID.minLng) / GRID.lngStep) * GRID.lngStep;
    for (let x = start; x <= GRID.maxLng; x += GRID.lngStep) out.push(+x.toFixed(6));
  } else {
    const start = GRID.latOrigin - Math.ceil((GRID.latOrigin - GRID.minLat) / GRID.latStep) * GRID.latStep;
    for (let y = start; y <= GRID.maxLat; y += GRID.latStep) out.push(+y.toFixed(6));
  }
  return out;
}

/** Minor streets: every grid line, clipped out of the park. */
export function minorStreets(): FeatureCollection<LineString> {
  const features: FeatureCollection<LineString>['features'] = [];
  const clipAgainstPark = (pts: LngLat[]) => {
    // Split a straight line into runs of points outside the park.
    const runs: LngLat[][] = [];
    let run: LngLat[] = [];
    for (const p of pts) {
      if (inPark(p)) {
        if (run.length > 1) runs.push(run);
        run = [];
      } else run.push(p);
    }
    if (run.length > 1) runs.push(run);
    return runs;
  };
  for (const x of gridLines('ns')) {
    const pts: LngLat[] = [];
    for (let y = GRID.minLat; y <= GRID.maxLat; y += 0.0005) pts.push([x, +y.toFixed(6)]);
    for (const run of clipAgainstPark(pts))
      features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: run } });
  }
  for (const y of gridLines('ew')) {
    const pts: LngLat[] = [];
    for (let x = GRID.minLng; x <= GRID.maxLng; x += 0.0005) pts.push([+x.toFixed(6), y]);
    for (const run of clipAgainstPark(pts))
      features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: run } });
  }
  return { type: 'FeatureCollection', features };
}

/** Building footprints: one inset rectangle per block, for texture. */
export function blocks(): FeatureCollection<Polygon> {
  const xs = gridLines('ns');
  const ys = gridLines('ew');
  const features: FeatureCollection<Polygon>['features'] = [];
  const insetX = GRID.lngStep * 0.16;
  const insetY = GRID.latStep * 0.16;
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const x0 = xs[i] + insetX;
      const x1 = xs[i + 1] - insetX;
      const y0 = ys[j] + insetY;
      const y1 = ys[j + 1] - insetY;
      const corners: LngLat[] = [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
      ];
      if (corners.some((c) => inPark(c))) continue;
      // Skip blocks under the bayou.
      if (y1 > 29.7605 && y0 < 29.7665) continue;
      // Vary footprints a little so the grid doesn't look stamped.
      const seed = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
      const r = seed - Math.floor(seed);
      const split = r > 0.55;
      if (split) {
        const mid = x0 + (x1 - x0) * (0.4 + r * 0.2);
        const gap = GRID.lngStep * 0.06;
        features.push(rect(x0, y0, mid - gap / 2, y1), rect(mid + gap / 2, y0, x1, y1));
      } else features.push(rect(x0, y0, x1, y1));
    }
  }
  return { type: 'FeatureCollection', features };
}

function rect(x0: number, y0: number, x1: number, y1: number): FeatureCollection<Polygon>['features'][number] {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [x0, y0],
          [x1, y0],
          [x1, y1],
          [x0, y1],
          [x0, y0],
        ],
      ],
    },
  };
}

export function majorStreets(): FeatureCollection<LineString> {
  return {
    type: 'FeatureCollection',
    features: STREETS.map((s) => ({
      type: 'Feature',
      properties: { name: s.name },
      geometry: {
        type: 'LineString',
        coordinates:
          s.axis === 'ns'
            ? [
                [s.at, s.from],
                [s.at, s.to],
              ]
            : [
                [s.from, s.at],
                [s.to, s.at],
              ],
      },
    })),
  };
}

const polygon = (ring: LngLat[], props: Record<string, string> = {}) => ({
  type: 'Feature' as const,
  properties: props,
  geometry: { type: 'Polygon' as const, coordinates: [ring] },
});

export function parks(): FeatureCollection<Polygon> {
  return {
    type: 'FeatureCollection',
    features: [polygon(HERMANN_PARK, { kind: 'park' }), polygon(ZOO_GROUNDS, { kind: 'zoo' })],
  };
}

export function water(): FeatureCollection<Polygon | LineString> {
  return {
    type: 'FeatureCollection',
    features: [
      polygon(MCGOVERN_LAKE),
      { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: BUFFALO_BAYOU } },
    ],
  };
}

export function highway(): FeatureCollection<LineString> {
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: HIGHWAY_69 } }],
  };
}

export interface LabelSpec {
  /** Image id registered with the map. */
  id: string;
  text: string;
  kind: 'street' | 'district' | 'poi' | 'shield' | 'water';
}

/** Point features for every label, each pointing at a label image by id. */
export function labelPoints(): { features: FeatureCollection<Point>; specs: LabelSpec[] } {
  const specs = new Map<string, LabelSpec>();
  const features: FeatureCollection<Point>['features'] = [];
  const add = (spec: LabelSpec, at: LngLat, rotate = 0, rank = 1) => {
    specs.set(spec.id, spec);
    features.push({
      type: 'Feature',
      properties: { image: spec.id, rotate, kind: spec.kind, rank },
      geometry: { type: 'Point', coordinates: at },
    });
  };

  for (const s of STREETS) {
    const spec: LabelSpec = { id: `street:${s.name}`, text: s.name, kind: 'street' };
    const step = s.axis === 'ns' ? 0.0078 : 0.0101;
    // Offset label positions so they sit mid-block, not on crossings.
    for (let v = s.from + step * 0.55; v < s.to - step * 0.3; v += step) {
      const at: LngLat = s.axis === 'ns' ? [s.at, v] : [v, s.at];
      if (inPark(at)) continue;
      add(spec, at, s.axis === 'ns' ? -90 : 0, 2);
    }
  }
  for (const d of DISTRICT_LABELS) add({ id: `district:${d.name}`, text: d.name, kind: 'district' }, d.position, 0, 0);
  for (const p of PLACES.filter((pl) => pl.category !== 'saved'))
    add({ id: `poi:${p.id}`, text: p.name, kind: 'poi' }, p.position, 0, 1);
  add({ id: 'shield:69', text: '69', kind: 'shield' }, [-95.3712, 29.7424], 0, 0);
  add({ id: 'shield:69', text: '69', kind: 'shield' }, [-95.3985, 29.7341], 0, 0);
  add({ id: 'water:Buffalo Bayou', text: 'Buffalo Bayou', kind: 'water' }, [-95.3902, 29.7626], 0, 1);

  return { features: { type: 'FeatureCollection', features }, specs: [...specs.values()] };
}
