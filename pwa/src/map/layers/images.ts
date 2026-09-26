// Map marker images drawn on a canvas at device resolution, so they stay sharp and need no sprite
// file: stop pins (bus and rail, three sizes), the TC tile, the direction notch, the destination
// and place pins, the live-bus icon (grey when stale), the rider and itinerary dots, and the white
// chips behind stop-ID labels and the "Stop: 342" callout.

import type maplibregl from "maplibre-gl";
import { t } from "../../i18n/index.ts";
import { iconPath } from "../../ui/Icon.tsx";
import { CHIP_INSET, RAISE } from "../placement.ts";
import { token } from "../style.ts";

const RATIO = 2;

type Draw = (ctx: CanvasRenderingContext2D) => void;

function image(w: number, h: number, draw: Draw): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = w * RATIO;
  canvas.height = h * RATIO;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(RATIO, RATIO);
  draw(ctx);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function glyph(ctx: CanvasRenderingContext2D, path: string, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.fillStyle = color;
  ctx.fill(new Path2D(path));
  ctx.restore();
}

/** A rounded square with a white ring and a white glyph (C.16 stop pin). */
function pin(size: number, color: string, glyphName: "directions_bus" | "tram"): ImageData {
  const ring = size >= 28 ? 2 : 1.5;
  return image(size, size, (ctx) => {
    ctx.beginPath();
    ctx.roundRect(ring / 2, ring / 2, size - ring, size - ring, size / 4);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = ring;
    ctx.strokeStyle = "#fff";
    ctx.stroke();
    const g = Math.round(size * 0.64);
    glyph(ctx, iconPath(glyphName), (size - g) / 2, (size - g) / 2, g, "#fff");
  });
}

/**
 * A cluster pin: the stop pin with a second one peeking out behind it, so two stops a fingertip
 * apart read as a pair (its tag names both, "567 · 259").
 */
function stack(size: number, color: string, glyphName: "directions_bus" | "tram"): ImageData {
  const off = 5;
  const front = pin(size, color, glyphName);
  return image(size + off, size + off, (ctx) => {
    ctx.beginPath();
    ctx.roundRect(off + 1, 1, size - 2, size - 2, size / 4);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#fff";
    ctx.stroke();
    const c = document.createElement("canvas");
    c.width = front.width;
    c.height = front.height;
    c.getContext("2d")!.putImageData(front, 0, 0);
    ctx.drawImage(c, 0, off, size, size);
  });
}

/**
 * C.16's direction notch: a small white triangle that points up, outlined in the pin's colour on
 * its two outer sides so it shows on light streets. Its base merges with the pin's white ring;
 * the layer rotates it to the stop's bearing.
 */
function notch(color: string): ImageData {
  return image(12, 7, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(1, 7);
    ctx.lineTo(6, 1);
    ctx.lineTo(11, 7);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.stroke();
  });
}

function tcTile(navy: string, text: string): ImageData {
  const size = 36;
  return image(size, size, (ctx) => {
    ctx.beginPath();
    ctx.roundRect(1, 1, size - 2, size - 2, 6);
    ctx.fillStyle = navy;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#fff";
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = `700 15px ${token("--font-family")}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, size / 2, size / 2 + 1);
  });
}

/** The destination (red) and searched-place (black) pin. */
function placePin(red: string): ImageData {
  return image(32, 40, (ctx) => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.3)";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;
    glyph(ctx, iconPath("place"), -3, 0, 38, red);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(16, 13.5, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
  });
}

/** C.16: the live bus, a navy 24dp disc with a white ring and bus glyph. */
function vehicle(color: string): ImageData {
  return image(24, 24, (ctx) => {
    ctx.beginPath();
    ctx.arc(12, 12, 11, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#fff";
    ctx.stroke();
    glyph(ctx, iconPath("directions_bus"), 6, 6, 12, "#fff");
  });
}

/** A dot with a ring outside it, drawn as an image so it takes part in label placement. */
function dot(diameter: number, fill: string, ring: string, ringWidth: number): ImageData {
  const size = diameter + ringWidth * 2;
  const circle = (ctx: CanvasRenderingContext2D, r: number, color: string) => {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  };
  return image(size, size, (ctx) => {
    circle(ctx, size / 2, ring);
    circle(ctx, diameter / 2, fill);
  });
}

/** Which side of a chip its pointer is on: towards the pin it names. */
export type Pointer = "down" | "up" | "left" | "right";
/** How far a pointer reaches out of its chip (dp). */
export const POINTER = 6;
/** A side-set tag's pointer, this far from the box's end (placement.ts CHIP_INSET). */
const POINTER_INSET = CHIP_INSET;

/**
 * A white box with a 1dp border, stretchable around its text (icon-text-fit), with an optional
 * pointer on one side. Only the flat parts stretch, never the corners or the pointer.
 */
function chip(border: string, pointer?: Pointer, radius = 4, stem = 0, align: "center" | "start" | "end" = "center"): { data: ImageData; options: Partial<maplibregl.StyleImageMetadata> } {
  const vertical = pointer === "down" || pointer === "up";
  const side = pointer === "left" || pointer === "right";
  const bw = vertical ? 40 : 24;
  const bh = side ? 22 : 20;
  // Half the pointer's base: a side pointer is smaller, so the chip keeps its text's height.
  const half = side ? 5 : 6;
  const w = bw + (side ? POINTER : 0);
  const h = bh + (vertical ? POINTER + stem : 0);
  // The box's own origin inside the image.
  const ox = pointer === "left" ? POINTER : 0;
  const oy = pointer === "up" ? POINTER : 0;
  // Where a down pointer leaves the box: the middle, or near one end for a tag set to one side of its pin.
  const tipX = align === "start" ? POINTER_INSET : align === "end" ? bw - POINTER_INSET : bw / 2;
  const data = image(w, h, (ctx) => {
    ctx.beginPath();
    ctx.roundRect(ox + 0.5, oy + 0.5, bw - 1, bh - 1, radius);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = border;
    ctx.stroke();
    if (!pointer) return;
    // The triangle: its base overlaps the box's border (covering it), its tip points at the pin.
    const tri: [number, number][] =
      pointer === "down"
        ? [[tipX - half, bh - 1], [tipX, bh + POINTER - 0.5], [tipX + half, bh - 1]]
        : pointer === "up"
          ? [[bw / 2 - half, POINTER + 1], [bw / 2, 0.5], [bw / 2 + half, POINTER + 1]]
          : pointer === "left"
            ? [[POINTER + 1, bh / 2 - half], [0.5, bh / 2], [POINTER + 1, bh / 2 + half]]
            : [[bw - 1, bh / 2 - half], [w - 0.5, bh / 2], [bw - 1, bh / 2 + half]];
    ctx.beginPath();
    tri.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.beginPath();
    tri.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    // A raised tag's pointer: the triangle, then a 2dp stem straight down to its pin.
    if (stem) {
      ctx.fillStyle = border;
      ctx.fillRect(tipX - 1, bh + POINTER - 1.5, 2, stem + 1);
    }
  });
  const px = (n: number) => n * RATIO;
  const cy = oy + bh / 2;
  return {
    data,
    options: {
      pixelRatio: RATIO,
      stretchX: !vertical
        ? [[px(ox + 5), px(ox + bw - 5)]]
        : align === "start"
          ? [[px(tipX + half + 1), px(bw - 6)]]
          : align === "end"
            ? [[px(6), px(tipX - half - 1)]]
            : [[px(ox + 6), px(tipX - half - 1)], [px(tipX + half + 1), px(ox + bw - 6)]],
      stretchY: side ? [[px(oy + 4), px(cy - half - 1)], [px(cy + half + 1), px(oy + bh - 4)]] : [[px(oy + 5), px(oy + bh - 5)]],
      content: [px(ox + 4), px(oy + 3), px(ox + bw - 4), px(oy + bh - 3)],
    },
  };
}

/** Registers every marker image once per style load. */
export function addMarkerImages(map: maplibregl.Map) {
  const blue = token("--c-stop-pin");
  const red = token("--c-rail-red");
  const navy = token("--c-brand-navy");
  const add = (id: string, data: ImageData, options: Partial<maplibregl.StyleImageMetadata> = {}) => {
    if (!map.hasImage(id)) map.addImage(id, data, { pixelRatio: RATIO, ...options });
  };
  for (const [suffix, size] of [["sm", 20], ["md", 28], ["lg", 36]] as const) {
    add(`pin-bus-${suffix}`, pin(size, blue, "directions_bus"));
    add(`pin-rail-${suffix}`, pin(size, red, "tram"));
  }
  add("pin-bus-stack", stack(28, blue, "directions_bus"));
  add("pin-rail-stack", stack(28, red, "tram"));
  add("notch-bus", notch(blue));
  add("notch-rail", notch(red));
  add("pin-tc", tcTile(navy, t("card.tcTile")));
  add("pin-dest", placePin(token("--c-dest-pin")));
  add("pin-place", placePin(token("--c-text")));
  add("vehicle", vehicle(navy));
  add("vehicle-stale", vehicle(token("--c-text-disabled")));
  add("dot-user", dot(16, token("--c-user-dot"), "#fff", 2));
  add("dot-origin", dot(16, token("--c-origin-dot"), "#fff", 2));
  add("dot-stop", dot(14, "#fff", navy, 3));
  const label = chip(token("--c-outline-strong"));
  add("label-chip", label.data, label.options);
  // A stop's ID chip points at its own pin, from whichever side it sits on ("567" over its pin, not
  // floating between two, 02).
  for (const dir of ["down", "up", "left", "right"] as const) {
    const c = chip(token("--c-outline-strong"), dir);
    add(`label-chip-${dir}`, c.data, c.options);
  }
  // A raised stop tag (placement.ts "above2") reaches down past the tag below it to its own pin;
  // a tag set to one side of its pin ("above-r", "above-l") has its pointer near that end.
  for (const [suffix, stem] of [["", 0], ["-long", RAISE]] as const)
    for (const align of ["start", "end"] as const) {
      const c = chip(token("--c-outline-strong"), "down", 4, stem, align);
      add(`label-chip-down${suffix}-${align}`, c.data, c.options);
    }
  const long = chip(token("--c-outline-strong"), "down", 4, RAISE);
  add("label-chip-down-long", long.data, long.options);
  // The star before a saved stop's ID chip ("★ 2958"): the map font has no ★ glyph.
  add("chip-star", image(14, 14, (ctx) => glyph(ctx, iconPath("star_filled"), -1, -1, 16, token("--c-accent-icon"))));
  const callout = chip(token("--c-outline"), "down", 6);
  add("callout", callout.data, callout.options);
}
