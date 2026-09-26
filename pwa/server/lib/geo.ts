import type { Cardinal } from "../../shared/types.ts";

const R = 6371008.8;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function cardinalOf(bearing: number): Cardinal {
  const b = ((bearing % 360) + 360) % 360;
  if (b >= 315 || b < 45) return "Northbound";
  if (b < 135) return "Eastbound";
  if (b < 225) return "Southbound";
  return "Westbound";
}

/** Compass word for a heading, e.g. for "Head northeast on Main St". */
export type Compass8 = "north" | "northeast" | "east" | "southeast" | "south" | "southwest" | "west" | "northwest";

export function compass8(bearing: number): Compass8 {
  const names: Compass8[] = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];
  return names[Math.round((((bearing % 360) + 360) % 360) / 45) % 8];
}

/** Weighted circular mean; `strength` is the mean resultant length (1 = all agree). */
export function circularMean(samples: { bearing: number; weight: number }[]): { bearing: number; strength: number } | null {
  let x = 0;
  let y = 0;
  let w = 0;
  for (const s of samples) {
    x += Math.cos(rad(s.bearing)) * s.weight;
    y += Math.sin(rad(s.bearing)) * s.weight;
    w += s.weight;
  }
  if (w === 0) return null;
  return { bearing: (deg(Math.atan2(y, x)) + 360) % 360, strength: Math.hypot(x, y) / w };
}

/** Local equirectangular projection in meters, accurate enough at city scale. */
function projector(lat0: number) {
  const kx = (Math.cos(rad(lat0)) * Math.PI * R) / 180;
  const ky = (Math.PI * R) / 180;
  return {
    toXY: (lat: number, lon: number): [number, number] => [lon * kx, lat * ky],
  };
}

/** Douglas-Peucker on [lat, lon] points with tolerance in meters. */
export function simplify(points: [number, number][], toleranceM: number): [number, number][] {
  if (points.length <= 2) return points;
  const p = projector(points[0][0]);
  const xy = points.map(([la, lo]) => p.toXY(la, lo));
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  const tol2 = toleranceM * toleranceM;
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let maxD = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = segDist2(xy[i], xy[a], xy[b]);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx >= 0 && maxD > tol2) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function segDist2(p: [number, number], a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const x = a[0] + t * dx - p[0];
  const y = a[1] + t * dy - p[1];
  return x * x + y * y;
}

export function encodePolyline(points: [number, number][], precision = 5): string {
  const f = 10 ** precision;
  let out = "";
  let pLat = 0;
  let pLon = 0;
  for (const [lat, lon] of points) {
    const iLat = Math.round(lat * f);
    const iLon = Math.round(lon * f);
    out += encodeSigned(iLat - pLat) + encodeSigned(iLon - pLon);
    pLat = iLat;
    pLon = iLon;
  }
  return out;
}

function encodeSigned(v: number): string {
  let n = v < 0 ? ~(v << 1) : v << 1;
  let s = "";
  while (n >= 0x20) {
    s += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
    n >>= 5;
  }
  return s + String.fromCharCode(n + 63);
}

export function decodePolyline(str: string, precision = 5): [number, number][] {
  const f = 10 ** precision;
  const pts: [number, number][] = [];
  let i = 0;
  let lat = 0;
  let lon = 0;
  const next = () => {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = str.charCodeAt(i++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (i < str.length) {
    lat += next();
    lon += next();
    pts.push([lat / f, lon / f]);
  }
  return pts;
}

export interface PreparedLine {
  xy: [number, number][];
  cum: number[];
  toXY: (lat: number, lon: number) => [number, number];
}

export function prepareLine(line: [number, number][]): PreparedLine {
  const { toXY } = projector(line[0]?.[0] ?? 30);
  const xy = line.map(([la, lo]) => toXY(la, lo));
  const cum = [0];
  for (let i = 1; i < xy.length; i++) cum.push(cum[i - 1] + Math.hypot(xy[i][0] - xy[i - 1][0], xy[i][1] - xy[i - 1][1]));
  return { xy, cum, toXY };
}

/**
 * Travel bearing of a line near a point: project the point onto the line,
 * then take the bearing between points `spanM` before and after it.
 */
export function bearingAlong(line: PreparedLine, lat: number, lon: number, spanM = 20): { bearing: number; offsetM: number } | null {
  const { xy, cum } = line;
  if (xy.length < 2) return null;
  const q = line.toXY(lat, lon);
  let best = Infinity;
  let bestAlong = 0;
  for (let i = 0; i < xy.length - 1; i++) {
    const a = xy[i];
    const b = xy[i + 1];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / len2)) : 0;
    const d = Math.hypot(a[0] + t * dx - q[0], a[1] + t * dy - q[1]);
    if (d < best) {
      best = d;
      bestAlong = cum[i] + t * Math.sqrt(len2);
    }
  }
  const at = (s: number): [number, number] => {
    s = Math.max(0, Math.min(cum[cum.length - 1], s));
    let i = 0;
    while (i < cum.length - 2 && cum[i + 1] < s) i++;
    const seg = cum[i + 1] - cum[i];
    const t = seg ? (s - cum[i]) / seg : 0;
    return [xy[i][0] + t * (xy[i + 1][0] - xy[i][0]), xy[i][1] + t * (xy[i + 1][1] - xy[i][1])];
  };
  const [x1, y1] = at(bestAlong - spanM);
  const [x2, y2] = at(bestAlong + spanM);
  if (x1 === x2 && y1 === y2) return null;
  return { bearing: (deg(Math.atan2(x2 - x1, y2 - y1)) + 360) % 360, offsetM: best };
}

const FT_PER_M = 3.28084;

/** US-style distance for riders: "150 ft", "0.3 mi", "1.2 mi". */
export function formatDistance(m: number): string {
  const ft = m * FT_PER_M;
  if (ft < 1000) return `${Math.max(50, Math.round(ft / 50) * 50)} ft`;
  return `${(m / 1609.344).toFixed(1)} mi`;
}
