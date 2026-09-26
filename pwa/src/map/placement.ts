// Where the map's labels go, decided in screen px before MapLibre draws them. A stop's tag stands
// directly above its own pin with a pointer down to it, like the "Stop 342" callout; pins closer
// than a fingertip are one cluster pin tagged with every ID ("567 · 259"). A scene label (a
// marker's "Transfer · #4789", a ride leg's route number) takes the first side of its point that is
// clear of the sheet, the map chrome (search bar, FABs, attribution), the markers and the labels
// already placed, and preferably of other pins and the trip's lines. A label with no clear side is
// left out (MapView then nudges the map): a label cut by the sheet's edge read as an empty white
// box (24-360), and a chip beside or between pins read as the next stop's (02, 06).

import type { ClientStop } from "../api/types.ts";

export type Rect = { l: number; t: number; r: number; b: number };
export type Pt = { x: number; y: number };

export const overlaps = (a: Rect, b: Rect) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
export const around = (p: Pt, box: Rect): Rect => ({ l: p.x + box.l, t: p.y + box.t, r: p.x + box.r, b: p.y + box.b });
export const square = (half: number): Rect => ({ l: -half, t: -half, r: half, b: half });

/**
 * Label text is bold 14px: about 8.4px a character, wrapping at 20em (280px; the scene-labels
 * layer's text-max-width): "Northwest TC · Bay M" on one line, not two (06).
 */
const TEXT_PX = 14;
const CHAR_W = 8.4;
export const LABEL_MAX_EM = 20;
const MAX_TEXT_W = LABEL_MAX_EM * TEXT_PX;
const LINE_H = 17;
/**
 * The white chip around the text, as MapLibre collides it: icon-text-fit padding (1px, 5px) plus
 * the chip image's border outside its content box (3px, 4px) on each side.
 */
const CHIP_PAD_X = 18;
const CHIP_PAD_Y = 8;
/** A side-set tag's pointer is this far (px) in from the end of its box, over its pin. */
export const CHIP_INSET = 12;
/** How much higher a raised stop tag sits (one chip and a gap): its pointer is this much longer. */
export const RAISE = 34;

/** Narrow glyphs in Noto Sans Bold 14px: a stop ID's digits, spaces and the "·" between IDs. */
const NARROW: Record<string, number> = { " ": 3.6, "·": 4.5, ".": 4, ",": 4, "#": 9.5 };
const DIGIT_W = 8.2;
const textWidth = (text: string) => [...text].reduce((w, c) => w + (NARROW[c] ?? (c >= "0" && c <= "9" ? DIGIT_W : CHAR_W)), 0);

function labelSize(text: string, extra = 0): { w: number; h: number } {
  const textW = textWidth(text) + extra;
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
  a: { anchor: "bottom", dx: 0, dy: -24 },
  a2: { anchor: "bottom", dx: 0, dy: -24 - RAISE },
  "a-r": { anchor: "bottom-left", dx: CHIP_PAD_X / 2 - CHIP_INSET, dy: -24 },
  "a-l": { anchor: "bottom-right", dx: CHIP_INSET - CHIP_PAD_X / 2, dy: -24 },
  ar: { anchor: "bottom-left", dx: 14, dy: -20 },
  al: { anchor: "bottom-right", dx: -14, dy: -20 },
  r: { anchor: "left", dx: 30, dy: 0 },
  l: { anchor: "right", dx: -30, dy: 0 },
  b: { anchor: "top", dx: 0, dy: 26 },
  br: { anchor: "top-left", dx: 14, dy: 20 },
  bl: { anchor: "top-right", dx: -14, dy: 20 },
  ta: { anchor: "bottom", dx: 0, dy: -56 },
  tr: { anchor: "left", dx: 30, dy: -20 },
  tl: { anchor: "right", dx: -30, dy: -20 },
  tb: { anchor: "top", dx: 0, dy: 12 },
  c: { anchor: "center", dx: 0, dy: 0 },
};
/** Sides with a pointer at the marker first (a, b, r, l), the corners only when those are taken. */
const DOT_ORDER = ["a", "b", "r", "l", "ar", "al", "br", "bl"];
/** The chip image for a scene label's side: its pointer faces the marker (layers/scene.ts). */
export const LABEL_POINTER: Record<string, string> = { a: "down", a2: "down-long", "a-r": "down-start", "a-l": "down-end", ta: "down", b: "up", tb: "up", r: "left", tr: "left", l: "right", tl: "right" };
const TALL_ORDER = ["ta", "tr", "tl", "tb"];
/**
 * A stop marker's tag (route near you): above its pin, centred or set to one side, else raised; only
 * when none of those is clear (the rider's dot right above the TC's bay, 06) below it, pointing up.
 */
const STOP_ORDER = ["a", "a-r", "a-l", "a2", "b"];

/**
 * Stop-ID chip sides. A stop's tag always sits directly above its own pin, with a pointer down to
 * it, like the "Stop 342" callout: never beside or below it, where it read as the next pin's tag
 * (02, 03, 06). When two tags above neighbouring pins would touch, the second is raised one chip
 * higher on a longer pointer ("above2"), so both still point straight down at their own pin.
 */
export const CHIP_PLACEMENTS: Record<string, Placement & { pointer: string }> = {
  above: { anchor: "bottom", dx: 0, dy: -25, pointer: "down" },
  // Still above the pin, the box set to one side with its pointer near that end: a neighbour's
  // pin or tag is in the way of the centred box (3340 beside the ★ 2958 pair, 03).
  "above-r": { anchor: "bottom-left", dx: CHIP_PAD_X / 2 - CHIP_INSET, dy: -25, pointer: "down-start" },
  "above-l": { anchor: "bottom-right", dx: CHIP_INSET - CHIP_PAD_X / 2, dy: -25, pointer: "down-end" },
  above2: { anchor: "bottom", dx: 0, dy: -25 - RAISE, pointer: "down-long" },
  "above2-r": { anchor: "bottom-left", dx: CHIP_PAD_X / 2 - CHIP_INSET, dy: -25 - RAISE, pointer: "down-long-start" },
  "above2-l": { anchor: "bottom-right", dx: CHIP_INSET - CHIP_PAD_X / 2, dy: -25 - RAISE, pointer: "down-long-end" },
  // Last resort, only when no nudge of the map can make room above (the rider's dot would go
  // under the sheet, 8895 at Northwest TC): beside its pin, still pointing at it.
  left: { anchor: "right", dx: -30, dy: 0, pointer: "right" },
  right: { anchor: "left", dx: 30, dy: 0, pointer: "left" },
};
const CHIP_ORDER = ["above", "above-r", "above-l", "above2", "above2-r", "above2-l"];
const CHIP_LAST_RESORT = ["left", "right"];

/** The room a stop's pin and its tag above it take, around the pin's point (for nudging the map to show both). */
export function chipRoom(text: string, extra = 0): Rect {
  const box = boxFor(CHIP_PLACEMENTS.above, labelSize(text, extra));
  return { l: Math.min(box.l, -16), t: box.t, r: Math.max(box.r, 16), b: 16 };
}

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

/**
 * The first side clear of everything; else the side that covers the fewest soft obstacles (a
 * label over two boxes of a bus line, not over its whole leg: "Transbordo · #4789" sat on the 80
 * line in Spanish, 44, when the first side merely touching the line won).
 */
function pick(p: Pt, size: { w: number; h: number }, keys: string[], table: Record<string, Placement>, s: Surroundings): { key: string; box: Rect } | undefined {
  let fallback: { key: string; box: Rect; n: number } | undefined;
  for (const key of keys) {
    const box = around(p, boxFor(table[key], size));
    if (box.l < 0 || box.r > s.width || box.t < 0 || s.hard.some((o) => overlaps(box, o))) continue;
    const n = s.soft.filter((o) => overlaps(box, o)).length;
    if (!n) return { key, box };
    if (!fallback || n < fallback.n) fallback = { key, box, n };
  }
  return fallback && { key: fallback.key, box: fallback.box };
}

/** "stop": a stop's ID tag (route near you), always above its pin like every stop tag. */
export type LabelKind = "dot" | "tall" | "leg" | "stop";

/**
 * A marker label's side is chosen for a label at least this many characters wide, so "Transfer ·
 * #4789" and "Transbordo · #4789" take the same side in every language (44: the wider Spanish
 * label fell on the 80 line where the English one had room).
 */
const SIDE_MIN_CHARS = 20;

/** The side for a scene label, or undefined to leave it out. */
export function placeSceneLabel(p: Pt, text: string, kind: LabelKind, s: Surroundings) {
  const keys = kind === "leg" ? ["c"] : kind === "tall" ? TALL_ORDER : kind === "stop" ? STOP_ORDER : DOT_ORDER;
  const sized = kind === "leg" || kind === "stop" ? text : text.padEnd(SIDE_MIN_CHARS, "x");
  return pick(p, labelSize(sized), keys, LABEL_PLACEMENTS, s);
}

/**
 * The side for a stop's ID chip (`extra`: px for the saved star), or undefined to leave it out.
 * `beside`: the map can't be nudged to make room above, so a listed stop's tag may go beside its pin.
 */
export function placeChip(p: Pt, text: string, s: Surroundings, extra = 0, beside = false) {
  const size = labelSize(text, extra);
  return pick(p, size, CHIP_ORDER, CHIP_PLACEMENTS, s) ?? (beside ? pick(p, size, CHIP_LAST_RESORT, CHIP_PLACEMENTS, s) : undefined);
}

export interface ClusterItem {
  id: string;
  p: Pt;
}

/**
 * Pins closer than `radius` px merge into one cluster pin, in priority order: each item joins the
 * first cluster whose first member is within reach, else starts its own. Two pins 25px apart
 * (567 and 259, 42) read as one stop with a tag floating between them.
 */
export function clusterPoints<T extends ClusterItem>(items: T[], radius = 40): { members: T[]; p: Pt }[] {
  const out: { members: T[]; p: Pt }[] = [];
  for (const it of items) {
    const near = out.find((c) => Math.hypot(c.members[0].p.x - it.p.x, c.members[0].p.y - it.p.y) < radius);
    if (near) near.members.push(it);
    else out.push({ members: [it], p: it.p });
  }
  for (const c of out)
    if (c.members.length > 1) c.p = { x: c.members.reduce((a, m) => a + m.p.x, 0) / c.members.length, y: c.members.reduce((a, m) => a + m.p.y, 0) / c.members.length };
  return out;
}

/** A cluster's tag: its IDs in priority order ("567 · 259"), at most three, then "+n". */
export function clusterLabel(ids: string[]): string {
  return ids.length > 3 ? `${ids.slice(0, 3).join(" · ")} +${ids.length - 3}` : ids.join(" · ");
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

const metres = (a: [number, number], b: [number, number]) => Math.hypot((a[0] - b[0]) * 111320 * Math.cos((a[1] * Math.PI) / 180), (a[1] - b[1]) * 110540);

/** The last point of `coords` is reached straight from where the line first comes within `nearM` of it and then wanders. */
function trimEnd(coords: [number, number][], nearM: number): [number, number][] {
  const end = coords[coords.length - 1];
  const rest: number[] = new Array(coords.length).fill(0);
  for (let i = coords.length - 2; i >= 0; i--) rest[i] = rest[i + 1] + metres(coords[i], coords[i + 1]);
  for (let i = 0; i < coords.length - 2; i++) {
    const d = metres(coords[i], end);
    if (d < nearM && rest[i] > 2 * d + 150) return [...coords.slice(0, i + 1), end];
  }
  return coords;
}

/**
 * A ride leg as drawn: a bus that loops around a terminal before its last stop (the 73 into Hobby,
 * 25) drew a knot of line at the destination pin. The line goes straight to the stop instead from
 * where the bus first comes near it, and likewise from its first stop.
 */
export function trimLoops(coords: [number, number][], nearM = 600): [number, number][] {
  if (coords.length < 4) return coords;
  return trimEnd(trimEnd(coords, nearM).reverse(), nearM).reverse();
}

/** The point a fraction `f` of the way along a line (by length): 0.5 is where a ride leg's route label goes first. */
export function pointAlong(coords: [number, number][], f = 0.5): [number, number] | undefined {
  if (coords.length < 2) return coords[0];
  const seg = coords.slice(1).map((c, i) => Math.hypot(c[0] - coords[i][0], c[1] - coords[i][1]));
  let rest = seg.reduce((a, b) => a + b, 0) * f;
  for (let i = 0; i < seg.length; i++) {
    if (rest <= seg[i]) {
      const k = seg[i] ? rest / seg[i] : 0;
      return [coords[i][0] + (coords[i + 1][0] - coords[i][0]) * k, coords[i][1] + (coords[i + 1][1] - coords[i][1]) * k];
    }
    rest -= seg[i];
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
