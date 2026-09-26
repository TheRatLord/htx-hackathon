import type { LabelSpec } from './basemap';
import type { MapPalette } from './mapStyle';

/**
 * Map labels are drawn to small canvases and registered as images, so the
 * map needs no glyph server. They use the app font, so they match the UI.
 */

export const LABEL_PIXEL_RATIO = 2;

export interface LabelImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

const FONT_STACK = "'Atkinson Hyperlegible', system-ui, sans-serif";

export function drawLabel(spec: LabelSpec, palette: MapPalette): LabelImage {
  const pr = LABEL_PIXEL_RATIO;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { width: 1, height: 1, data: new Uint8ClampedArray(4) };

  const style = {
    street: { size: 11, weight: 400, color: palette.labelStreet, caps: false, spacing: 0 },
    district: { size: 12, weight: 700, color: palette.labelDistrict, caps: true, spacing: 2.4 },
    poi: { size: 12, weight: 700, color: palette.labelPoi, caps: false, spacing: 0 },
    water: { size: 11, weight: 400, color: palette.labelWater, caps: false, spacing: 0.4 },
    shield: { size: 11, weight: 700, color: '#ffffff', caps: false, spacing: 0 },
  }[spec.kind];

  const text = style.caps ? spec.text.toUpperCase() : spec.text;
  const font = `${spec.kind === 'water' ? 'italic ' : ''}${style.weight} ${style.size * pr}px ${FONT_STACK}`;
  ctx.font = font;
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${style.spacing * pr}px`;
  const textW = Math.ceil(ctx.measureText(text).width + style.spacing * pr * text.length);

  const padX = (spec.kind === 'shield' ? 6 : 3) * pr;
  const padY = (spec.kind === 'shield' ? 3 : 3) * pr;
  const w = textW + padX * 2;
  const h = Math.ceil(style.size * pr * 1.25) + padY * 2;
  canvas.width = w;
  canvas.height = h;

  // Resizing the canvas resets its state.
  ctx.font = font;
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${style.spacing * pr}px`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  if (spec.kind === 'shield') {
    ctx.fillStyle = palette.shield;
    roundRect(ctx, 0, 0, w, h, 4 * pr);
    ctx.fill();
  } else {
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3 * pr;
    ctx.strokeStyle = palette.labelHalo;
    ctx.strokeText(text, padX, h / 2 + pr * 0.5);
  }
  ctx.fillStyle = style.color;
  ctx.fillText(text, padX, h / 2 + pr * 0.5);

  const img = ctx.getImageData(0, 0, w, h);
  return { width: w, height: h, data: img.data };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
