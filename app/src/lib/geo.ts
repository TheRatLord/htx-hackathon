import type { LngLat } from '../data/types';

const EARTH_RADIUS_M = 6_371_000;

/** Straight-line distance in metres (haversine). */
export function distanceMeters(a: LngLat, b: LngLat): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Street walking is longer than a straight line; 1.2 is a common grid factor. */
export const WALK_DETOUR_FACTOR = 1.2;
/** 80 m/min is roughly 3 mph, a relaxed walking pace. */
export const WALK_METERS_PER_MINUTE = 80;

/** Estimated walking minutes, always at least 1. */
export function walkMinutes(a: LngLat, b: LngLat): number {
  const meters = distanceMeters(a, b) * WALK_DETOUR_FACTOR;
  return Math.max(1, Math.ceil(meters / WALK_METERS_PER_MINUTE));
}

/** Bounding box [[minLng, minLat], [maxLng, maxLat]] around points. */
export function boundsOf(points: LngLat[]): [LngLat, LngLat] {
  if (points.length === 0) throw new Error('boundsOf needs at least one point');
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of points) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

/** Point on a polyline at fraction t (0-1) of its length. Used to place route badges. */
export function pointAlong(path: LngLat[], t: number): LngLat {
  if (path.length === 1 || t <= 0) return path[0];
  if (t >= 1) return path[path.length - 1];
  const segs = path.slice(1).map((p, i) => distanceMeters(path[i], p));
  const total = segs.reduce((s, d) => s + d, 0);
  let target = Math.min(Math.max(t, 0), 1) * total;
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i] || i === segs.length - 1) {
      const f = segs[i] === 0 ? 0 : Math.min(target / segs[i], 1);
      const [a, b] = [path[i], path[i + 1]];
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    }
    target -= segs[i];
  }
  return path[path.length - 1];
}
