// Which way the rider faces, from the phone's orientation sensors: degrees clockwise from north.

const RAD = Math.PI / 180;

/** Below this horizontal length a direction stands on end and says nothing about the heading. */
const MIN_HORIZONTAL = 0.2;
/**
 * The top edge's climb (its sine) where the back of the phone starts to take over from it, and
 * where it has taken over: tipped up past ~55° the top edge points more at the sky than ahead.
 */
const BACK_FROM = Math.sin(55 * RAD);
const BACK_ALL = Math.sin(75 * RAD);

/**
 * The way the phone points, from an absolute DeviceOrientationEvent (alpha, beta, gamma; earth
 * frame x east, y north, z up) for a screen turned `screenAngle` degrees (screen.orientation).
 * Flat or tipped up a little, that is where the screen's top edge points (a roll of the wrist
 * changes nothing); held up to look at the map, where the back of the phone does. Between the two
 * it blends, so the beam never jumps. Undefined when neither has a direction along the ground.
 */
export function orientationHeading(alpha: number, beta: number, gamma: number, screenAngle = 0): number | undefined {
  const [sa, ca] = [Math.sin(alpha * RAD), Math.cos(alpha * RAD)];
  const [sb, cb] = [Math.sin(beta * RAD), Math.cos(beta * RAD)];
  const [sg, cg] = [Math.sin(gamma * RAD), Math.cos(gamma * RAD)];
  // The device-to-earth rotation R = Rz(alpha) Rx(beta) Ry(gamma) (W3C DeviceOrientation spec).
  const r = [
    [ca * cg - sa * sb * sg, -cb * sa, cg * sa * sb + ca * sg],
    [cg * sa + ca * sb * sg, ca * cb, sa * sg - ca * cg * sb],
    [-cb * sg, sb, cb * cg],
  ];
  // The screen's up in device axes (the device's top, +y, turned by the screen's rotation), in earth axes.
  const [ux, uy] = [Math.sin(screenAngle * RAD), Math.cos(screenAngle * RAD)];
  const up = r.map((row) => row[0] * ux + row[1] * uy);
  // The back of the phone (-z) in earth axes.
  const back = r.map((row) => -row[2]);
  // Tipped back past upright (the screen faces down, looked up at): the top edge leans toward the
  // rider, so ahead is the other way along it.
  if (back[2] > 0) [up[0], up[1]] = [-up[0], -up[1]];
  const t = Math.min(1, Math.max(0, (up[2] - BACK_FROM) / (BACK_ALL - BACK_FROM)));
  const along = (v: number[]) => {
    const len = Math.hypot(v[0], v[1]);
    return len < MIN_HORIZONTAL ? undefined : [v[0] / len, v[1] / len];
  };
  const a = t < 1 ? along(up) : undefined;
  const b = t > 0 ? along(back) : undefined;
  const [east, north] = a && b ? [a[0] * (1 - t) + b[0] * t, a[1] * (1 - t) + b[1] * t] : (a ?? b ?? [0, 0]);
  if (Math.hypot(east, north) < 1e-6) return undefined;
  return normalize(Math.atan2(east, north) / RAD);
}

/** `deg` in [0, 360). */
export function normalize(deg: number): number {
  const d = deg % 360;
  return d < 0 ? d + 360 : d;
}

/** The signed turn from `a` to `b`, in (-180, 180]. */
export function turn(a: number, b: number): number {
  const d = normalize(b - a);
  return d > 180 ? d - 360 : d;
}

/** Eases `prev` toward `next` by `k` (0..1) the short way round, so 359° to 1° never swings through south. */
export function smooth(prev: number | undefined, next: number, k: number): number {
  return prev === undefined ? normalize(next) : normalize(prev + turn(prev, next) * k);
}
