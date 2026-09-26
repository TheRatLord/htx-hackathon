import { haversineM } from "../lib/geo.ts";
import { gtfs } from "./store.ts";

/** ~1.1 km grid cells; a radius query scans the covering cells only. */
const CELL_DEG = 0.01;
let grid: Map<string, number[]> | null = null;

const cellKey = (lat: number, lon: number) => `${Math.floor(lat / CELL_DEG)}:${Math.floor(lon / CELL_DEG)}`;

function stopGrid(): Map<string, number[]> {
  if (grid) return grid;
  grid = new Map();
  gtfs().stops.forEach((s, i) => {
    const k = cellKey(s.lat, s.lon);
    grid!.set(k, [...(grid!.get(k) ?? []), i]);
  });
  return grid;
}

/** Stops within `radiusM` (straight line), nearest first. */
export function stopsNear(lat: number, lon: number, radiusM: number, limit = 50): { stopIdx: number; distanceM: number }[] {
  const g = stopGrid();
  const { stops } = gtfs();
  const span = Math.ceil(radiusM / 1000 / (CELL_DEG * 100)) + 1;
  const [cy, cx] = [Math.floor(lat / CELL_DEG), Math.floor(lon / CELL_DEG)];
  const out: { stopIdx: number; distanceM: number }[] = [];
  for (let y = cy - span; y <= cy + span; y++) {
    for (let x = cx - span; x <= cx + span; x++) {
      for (const i of g.get(`${y}:${x}`) ?? []) {
        const d = haversineM(lat, lon, stops[i].lat, stops[i].lon);
        if (d <= radiusM) out.push({ stopIdx: i, distanceM: d });
      }
    }
  }
  return out.sort((a, b) => a.distanceM - b.distanceM).slice(0, limit);
}
