import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getHeading, requestCompass, resetHeadingForTests, subscribeHeading } from "./heading.ts";

// A browser-shaped window for the store: its listeners, the screen's rotation and (for iOS) the
// permission call. Events are plain objects: the store reads only their fields.
const target = new EventTarget();
const fire = (type: string, fields: Record<string, unknown>) => target.dispatchEvent(Object.assign(new Event(type), fields));
const android = (alpha: number, beta = 0, gamma = 0) => fire("deviceorientationabsolute", { alpha, beta, gamma, absolute: true });
const ios = (heading: number, accuracy = 10) => fire("deviceorientation", { alpha: 0, beta: 0, gamma: 0, webkitCompassHeading: heading, webkitCompassAccuracy: accuracy });

let angle = 0;
let permission: ReturnType<typeof vi.fn> | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  angle = 0;
  permission = undefined;
  vi.stubGlobal("window", target);
  vi.stubGlobal("screen", { orientation: { get angle() { return angle; } } });
  vi.stubGlobal("DeviceOrientationEvent", {
    get requestPermission() {
      return permission;
    },
  });
  resetHeadingForTests();
});

afterEach(() => {
  resetHeadingForTests();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("heading store", () => {
  it("listens only while subscribed", () => {
    android(90);
    expect(getHeading()).toBeUndefined();
    const off = subscribeHeading(() => {});
    android(90);
    expect(getHeading()).toBe(270);
    off();
    expect(getHeading()).toBeUndefined();
    android(0);
    expect(getHeading()).toBeUndefined();
  });

  it("reads Android's absolute orientation and the screen's rotation", () => {
    subscribeHeading(() => {});
    angle = 90;
    android(0);
    expect(getHeading()).toBe(90);
  });

  it("reads iOS's compass heading, and skips it while uncalibrated", () => {
    subscribeHeading(() => {});
    ios(45, -1);
    expect(getHeading()).toBeUndefined();
    ios(45);
    expect(getHeading()).toBe(45);
  });

  it("ignores a relative (non-absolute) orientation without a compass heading", () => {
    subscribeHeading(() => {});
    fire("deviceorientation", { alpha: 90, beta: 0, gamma: 0, absolute: false });
    expect(getHeading()).toBeUndefined();
  });

  it("smooths readings and tells subscribers at most every 100 ms", () => {
    const heard = vi.fn();
    subscribeHeading(heard);
    android(0);
    expect(heard).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 10; i++) android(270); // turning to face east
    expect(heard).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    expect(heard).toHaveBeenCalledTimes(2);
    expect(getHeading()).toBeGreaterThan(85);
    expect(getHeading()).toBeLessThanOrEqual(90);
  });

  it("stays quiet about jitter under 2°", () => {
    const heard = vi.fn();
    subscribeHeading(heard);
    android(0);
    vi.advanceTimersByTime(200);
    android(359.5);
    android(0.5);
    vi.advanceTimersByTime(200);
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it("forgets a compass that goes quiet", () => {
    const heard = vi.fn();
    subscribeHeading(heard);
    android(0);
    vi.advanceTimersByTime(2900);
    expect(getHeading()).toBe(0);
    vi.advanceTimersByTime(200);
    expect(getHeading()).toBeUndefined();
    expect(heard).toHaveBeenCalledTimes(2);
  });

  it("asks iOS for motion access once, from a tap", async () => {
    permission = vi.fn(() => Promise.resolve("granted"));
    subscribeHeading(() => {});
    requestCompass();
    requestCompass();
    await vi.runAllTimersAsync();
    expect(permission).toHaveBeenCalledTimes(1);
    ios(180);
    expect(getHeading()).toBe(180);
  });

  it("asks nothing where no permission is needed", () => {
    expect(() => requestCompass()).not.toThrow();
  });
});
