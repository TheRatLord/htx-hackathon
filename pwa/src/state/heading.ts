// The rider's compass heading, for the cone on the map's dot. Android Chrome sends absolute
// orientation (deviceorientationabsolute) without asking; iOS Safari sends webkitCompassHeading
// only after DeviceOrientationEvent.requestPermission(), which must be called from a tap (the
// Locate FAB does). Sensors are listened to only while something subscribes (the map, with a fix).

import { normalize, orientationHeading, smooth, turn } from "../lib/heading.ts";

type Listener = () => void;

/** How far each reading moves the shown heading: steadies the needle without lagging a turn. */
const SMOOTHING = 0.3;
/** Subscribers hear of a change this small or larger (degrees)... */
const MIN_CHANGE = 2;
/** ...at most this often (ms): the map redraws the cone, not the screen. */
const MIN_INTERVAL_MS = 100;
/** A compass that has gone quiet this long (ms) is no longer trusted (the sensor stopped, the page slept). */
const STALE_MS = 3000;

interface IosOrientationEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
}

type PermissionFn = () => Promise<"granted" | "denied">;
const iosPermission = (): PermissionFn | undefined =>
  typeof DeviceOrientationEvent !== "undefined" ? (DeviceOrientationEvent as unknown as { requestPermission?: PermissionFn }).requestPermission : undefined;

const listeners = new Set<Listener>();
let raw: number | undefined;
let shown: number | undefined;
let lastEmit = 0;
let lastReading = 0;
let staleTimer: ReturnType<typeof setTimeout> | undefined;
let emitTimer: ReturnType<typeof setTimeout> | undefined;
let attached = false;
/** iOS: "granted" once the rider allowed motion access this session. */
let iosState: "unasked" | "asking" | "granted" | "denied" = "unasked";
/** An absolute Android reading was seen: relative `deviceorientation` events are then ignored. */
let sawAbsolute = false;

function screenAngle(): number {
  const a = screen.orientation?.angle ?? (window as { orientation?: number }).orientation ?? 0;
  return Number.isFinite(a) ? a : 0;
}

function emit() {
  emitTimer = undefined;
  lastEmit = Date.now();
  for (const l of listeners) l();
}

function reading(deg: number | undefined) {
  if (deg === undefined || !Number.isFinite(deg)) return;
  lastReading = Date.now();
  raw = smooth(raw, deg, SMOOTHING);
  clearTimeout(staleTimer);
  staleTimer = setTimeout(() => {
    raw = shown = undefined;
    emit();
  }, STALE_MS);
  if (shown !== undefined && Math.abs(turn(shown, raw)) < MIN_CHANGE) return;
  shown = raw;
  if (emitTimer) return;
  const wait = MIN_INTERVAL_MS - (Date.now() - lastEmit);
  if (wait <= 0) emit();
  else emitTimer = setTimeout(emit, wait);
}

function onAbsolute(e: DeviceOrientationEvent) {
  if (e.alpha === null || e.beta === null || e.gamma === null) return;
  sawAbsolute = true;
  reading(orientationHeading(e.alpha, e.beta, e.gamma, screenAngle()));
}

function onOrientation(e: DeviceOrientationEvent) {
  const ios = e as IosOrientationEvent;
  // iOS: the compass heading of the device's top; a negative accuracy means it needs calibrating.
  if (typeof ios.webkitCompassHeading === "number") {
    if ((ios.webkitCompassAccuracy ?? 0) < 0) return;
    reading(normalize(ios.webkitCompassHeading + screenAngle()));
    return;
  }
  // Firefox for Android marks its absolute readings here; a relative alpha points nowhere.
  if (e.absolute && !sawAbsolute) onAbsolute(e);
}

function attach() {
  if (attached || typeof window === "undefined") return;
  attached = true;
  window.addEventListener("deviceorientationabsolute", onAbsolute as EventListener);
  window.addEventListener("deviceorientation", onOrientation);
}

function detach() {
  if (!attached) return;
  attached = false;
  window.removeEventListener("deviceorientationabsolute", onAbsolute as EventListener);
  window.removeEventListener("deviceorientation", onOrientation);
  clearTimeout(staleTimer);
  clearTimeout(emitTimer);
  emitTimer = undefined;
  raw = shown = undefined;
}

/** Starts the sensors with the first subscriber and stops them with the last. */
export function subscribeHeading(listener: Listener): () => void {
  listeners.add(listener);
  attach();
  return () => {
    listeners.delete(listener);
    if (!listeners.size) detach();
  };
}

/** The compass heading (degrees clockwise from north), or undefined without a live compass. */
export function getHeading(): number | undefined {
  return shown !== undefined && Date.now() - lastReading < STALE_MS ? shown : undefined;
}

/**
 * iOS asks for motion access here; elsewhere this does nothing. Call it synchronously from a tap:
 * Safari refuses a request made outside one. A refusal is final for the session (no pointer; the
 * map falls back to the GPS course while walking).
 */
export function requestCompass(): void {
  const ask = iosPermission();
  if (!ask || iosState !== "unasked") return;
  // A second tap while Safari's dialog is up must not ask again.
  iosState = "asking";
  ask.call(DeviceOrientationEvent).then(
    (state) => {
      iosState = state === "granted" ? "granted" : "denied";
      // Listeners added before the grant may not be told of it: start again.
      if (iosState === "granted" && attached) {
        detach();
        attach();
      }
    },
    () => (iosState = "unasked"),
  );
}

/** Test hook: forget everything (module state outlives a test). */
export function resetHeadingForTests() {
  detach();
  listeners.clear();
  iosState = "unasked";
  sawAbsolute = false;
  lastEmit = lastReading = 0;
}
