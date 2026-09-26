// Where the map's labels go, decided in screen px before MapLibre draws them: each stop-ID chip and
// each scene label (a marker's "Transfer · #4789", a ride leg's route number) takes the first side
// of its point that is clear of the sheet, the map chrome (search bar, FABs, attribution), the
// markers and the labels already placed, and preferably of other pins and the trip's lines. A
// label with no clear side is left out: a label cut by the sheet's edge read as an empty white box
// (24-360), and a chip laid over the next stop's pin fused two stops into one (02).

import type { ClientStop } from "../api/types.ts";

export type Rect = { l: number; t: number; r: number; b: number };
export type Pt = { x: number; y: number };

export const overlaps = (a: Rect, b: Rect) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
export const around = (p: Pt, box: Rect): Rect => ({ l: p.x + box.l, t: p.y + box.t, r: p.x + box.r, b: p.y + box.b });
export const square = (half: number): Rect => ({ l: -half, t: -half, r: half, b: half });

/** Label text is bold 14px: about 8.4px a character, wrapping at MapLibre's 10em (140px). */
const TEXT_PX = 14;
const CHAR_W = 8.4;
const MAX_TEXT_W = 140;
const LINE_H = 17;
/**
 * The white chip around the text, as MapLibre collides it: icon-text-fit padding (1px, 5px) plus
 * the chip image's border outside its content box (3px, 4px) on each side.
 */
const CHIP_PAD_X = 18;
const CHIP_PAD_Y = 8;

export function labelSize(text: string, extra = 0): { w: number; h: number } {
  const textW = text.length * CHAR_W + extra;
  const lines = Math.max(1, Math.ceil(textW / MAX_TEXT_W));
  return { w: Math.min(textW, MAX_TEXT_W) + CHIP_PAD_X, h: lines * LINE_H + CHIP_PAD_Y };
}

/** A label's anchor and offset (px) from its point; the box it then covers follows from its size. */
type Anchor = "bottom" | "top" | "left" | "right" | "bottom-left" | "bottom-right" | "top-left" | "top-right" | "center";
type Placement = { anchor: Anchor; dx: number; dy: number };

/** The anchor is on the text's box; the chip reaches half its padding beyond it on every side. */
function boxFor({ anchor, dx, dy }: Placement, { w, h }: { w: number; h: number }): Rect {
  const [px, py] = [CHIP_PAD_X / 2, CHIP_PAD_Y / 2];
  const l = anchor.endsWith("left") ? dx - px : anchor.endsWith("right") ? dx - w + px : dx - w / 2;
  const t = anchor.startsWith("top") ? dy - py : anchor.startsWith("bottom") ? dy - h + py : dy - h / 2;
  return { l, t, r: l + w, b: t + h };
}

/**
 * Scene label sides, in order of preference. A dot marker's label clears a 36dp highlighted pin
 * that may share its point; a tall pin's (place, destination) goes above or beside its 40dp head.
 * The keys are the "lk" property the scene-labels layer matches on (layers/scene.ts).
 */
export const LABEL_PLACEMENTS: Record<string, Placement> = {
  a: { anchor: "bottom", dx: 0, dy: -28 },
  ar: { anchor: "bottom-left", dx: 14, dy: -20 },
  al: { anchor: "bottom-right", dx: -14, dy: -20 },
  r: { anchor: "left", dx: 34, dy: 0 },
  l: { anchor: "right", dx: -34, dy: 0 },
  b: { anchor: "top", dx: 0, dy: 28 },
  br: { anchor: "top-left", dx: 14, dy: 20 },
  bl: { anchor: "top-right", dx: -14, dy: 20 },
  ta: { anchor: "bottom", dx: 0, dy: -56 },
  tr: { anchor: "left", dx: 30, dy: -20 },
  tl: { anchor: "right", dx: -30, dy: -20 },
  tb: { anchor: "top", dx: 0, dy: 12 },
  c: { anchor: "center", dx: 0, dy: 0 },
};
const DOT_ORDER = ["a", "ar", "al", "r", "l", "b", "br", "bl"];
const TALL_ORDER = ["ta", "tr", "tl", "tb"];

/** Stop-ID chip sides: under the pin as in the spec, else above, beside, or at a corner. */
export const CHIP_PLACEMENTS: Record<string, Placement> = {
  below: { anchor: "top", dx: 0, dy: 20 },
  above: { anchor: "bottom", dx: 0, dy: -20 },
  right: { anchor: "left", dx: 24, dy: 0 },
  left: { anchor: "right", dx: -24, dy: 0 },
  belowLeft: { anchor: "top-right", dx: -10, dy: 18 },
  belowRight: { anchor: "top-left", dx: 10, dy: 18 },
};
const CHIP_ORDER = ["below", "above", "left", "right", "belowLeft", "belowRight"];

/** MapLibre's text-variable-anchor-offset value for one placement (offsets in ems of the text). */
export const anchorOffset = ({ anchor, dx, dy }: Placement): [Anchor, [number, number]] => [anchor, [dx / TEXT_PX, dy / TEXT_PX]];

export interface Surroundings {
  /** Canvas width: a label must stay on screen. */
  width: number;
  /** Never covered: the sheet, the chrome, the markers, labels placed so far. */
  hard: Rect[];
  /** Avoided when another side is free: other stop pins, the trip's lines. */
  soft: Rect[];
}

function pick(p: Pt, size: { w: number; h: number }, keys: string[], table: Record<string, Placement>, s: Surroundings): { key: string; box: Rect } | undefined {
  let fallback: { key: string; box: Rect } | undefined;
  for (const key of keys) {
    const box = around(p, boxFor(table[key], size));
    if (box.l < 0 || box.r > s.width || box.t < 0 || s.hard.some((o) => overlaps(box, o))) continue;
    if (!s.soft.some((o) => overlaps(box, o))) return { key, box };
    fallback ??= { key, box };
  }
  return fallback;
}

export type LabelKind = "dot" | "tall" | "leg";

/** The side for a scene label, or undefined to leave it out. */
export function placeSceneLabel(p: Pt, text: string, kind: LabelKind, s: Surroundings) {
  const keys = kind === "leg" ? ["c"] : kind === "tall" ? TALL_ORDER : DOT_ORDER;
  return pick(p, labelSize(text), keys, LABEL_PLACEMENTS, s);
}

/** The side for a stop's ID chip (`extra`: px for the saved star), or undefined to leave it out. */
export function placeChip(p: Pt, text: string, s: Surroundings, extra = 0) {
  return pick(p, labelSize(text, extra), CHIP_ORDER, CHIP_PLACEMENTS, s);
}

/** A line drawn on the map as small boxes every few px, for labels to keep off it. */
export function lineRects(points: Pt[], half = 4, step = 8): Rect[] {
  const out: Rect[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    out.push(around(a, square(half)));
    const b = points[i + 1];
    if (!b) break;
    const n = Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / step);
    for (let k = 1; k < n; k++) out.push(around({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n }, square(half)));
  }
  return out;
}

/** The point halfway along a line (by length), where a ride leg's route label goes. */
export function midpoint(coords: [number, number][]): [number, number] | undefined {
  if (coords.length < 2) return coords[0];
  const seg = coords.slice(1).map((c, i) => Math.hypot(c[0] - coords[i][0], c[1] - coords[i][1]));
  let half = seg.reduce((a, b) => a + b, 0) / 2;
  for (let i = 0; i < seg.length; i++) {
    if (half <= seg[i]) {
      const f = seg[i] ? half / seg[i] : 0;
      return [coords[i][0] + (coords[i + 1][0] - coords[i][0]) * f, coords[i][1] + (coords[i + 1][1] - coords[i][1]) * f];
    }
    half -= seg[i];
  }
  return coords.at(-1);
}

/**
 * The stops in a lon/lat box, from a grid built once per stops map: placing labels scanned all
 * 8,797 stops (a bounds test and a projection each) on every pan and sheet settle.
 */
const CELL = 0.005;
const grids = new WeakMap<Map<string, ClientStop>, Map<string, ClientStop[]>>();
const cellKey = (x: number, y: number) => `${x},${y}`;

export function stopsWithin(stops: Map<string, ClientStop>, w: number, s: number, e: number, n: number): ClientStop[] {
  let grid = grids.get(stops);
  if (!grid) {
    grid = new Map();
    for (const stop of stops.values()) {
      const k = cellKey(Math.floor(stop.lon / CELL), Math.floor(stop.lat / CELL));
      const list = grid.get(k);
      if (list) list.push(stop);
      else grid.set(k, [stop]);
    }
    grids.set(stops, grid);
  }
  const out: ClientStop[] = [];
  const [x0, x1, y0, y1] = [Math.floor(w / CELL), Math.floor(e / CELL), Math.floor(s / CELL), Math.floor(n / CELL)];
  // A zoomed-out view would visit thousands of cells: scan the stops instead.
  if ((x1 - x0 + 1) * (y1 - y0 + 1) > 4000) {
    for (const stop of stops.values()) if (stop.lon >= w && stop.lon <= e && stop.lat >= s && stop.lat <= n) out.push(stop);
    return out;
  }
  for (let x = x0; x <= x1; x++)
    for (let y = y0; y <= y1; y++)
      for (const stop of grid.get(cellKey(x, y)) ?? []) if (stop.lon >= w && stop.lon <= e && stop.lat >= s && stop.lat <= n) out.push(stop);
  return out;
}
