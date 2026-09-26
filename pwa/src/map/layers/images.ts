// Map marker images drawn on a canvas at device resolution, so they stay sharp and need no sprite
// file: stop pins (bus and rail, three sizes), the TC tile, the direction notch, the destination
// pin, the live-bus icon and the white chips behind stop-ID labels and the "Stop: 342" callout.

import type maplibregl from "maplibre-gl";
import { iconPath } from "../../ui/Icon.tsx";
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

/** A 16x10 chevron that points up; the layer rotates it to the stop's bearing. */
function notch(color: string): ImageData {
  return image(16, 10, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(8, 1.5);
    ctx.lineTo(14.5, 9);
    ctx.lineTo(1.5, 9);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#fff";
    ctx.lineJoin = "round";
    ctx.stroke();
  });
}

function tcTile(navy: string): ImageData {
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
    ctx.fillText("TC", size / 2, size / 2 + 1);
  });
}

function destinationPin(red: string): ImageData {
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

function vehicle(color: string): ImageData {
  return image(28, 28, (ctx) => {
    ctx.beginPath();
    ctx.arc(14, 14, 13, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#fff";
    ctx.stroke();
    glyph(ctx, iconPath("directions_bus"), 7, 7, 14, "#fff");
  });
}

/** A white box with a 1dp border, stretchable around its text (icon-text-fit). */
function chip(border: string, withPointer: boolean): { data: ImageData; options: Partial<maplibregl.StyleImageMetadata> } {
  const w = withPointer ? 40 : 24;
  const box = 20;
  const h = withPointer ? box + 6 : box;
  const data = image(w, h, (ctx) => {
    ctx.beginPath();
    ctx.roundRect(0.5, 0.5, w - 1, box - 1, withPointer ? 6 : 4);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = border;
    ctx.stroke();
    if (withPointer) {
      ctx.beginPath();
      ctx.moveTo(w / 2 - 6, box - 1);
      ctx.lineTo(w / 2, h - 0.5);
      ctx.lineTo(w / 2 + 6, box - 1);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(w / 2 - 6, box - 0.5);
      ctx.lineTo(w / 2, h - 0.5);
      ctx.lineTo(w / 2 + 6, box - 0.5);
      ctx.stroke();
    }
  });
  const px = (n: number) => n * RATIO;
  return {
    data,
    options: {
      pixelRatio: RATIO,
      // Stretch only the flat middle, never the corners or the pointer.
      stretchX: withPointer ? [[px(6), px(w / 2 - 7)], [px(w / 2 + 7), px(w - 6)]] : [[px(5), px(w - 5)]],
      stretchY: [[px(5), px(box - 5)]],
      content: [px(4), px(3), px(w - 4), px(box - 3)],
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
  add("notch-bus", notch(blue));
  add("notch-rail", notch(red));
  add("pin-tc", tcTile(navy));
  add("pin-dest", destinationPin(token("--c-dest-pin")));
  add("vehicle", vehicle(navy));
  const label = chip(token("--c-outline-strong"), false);
  add("label-chip", label.data, label.options);
  const callout = chip(token("--c-outline"), true);
  add("callout", callout.data, callout.options);
}
