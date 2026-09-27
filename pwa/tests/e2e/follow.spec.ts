// Follow mode and the heading beam on the rider's dot. Locate centres on the rider and keeps the
// dot centred as fixes come in; a drag or another screen ends it, a zoom does not. The compass
// (deviceorientationabsolute here, as Android Chrome sends it) turns a beam on the dot; without one,
// the GPS course does while moving.

import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { GPS, hookMap, launch, settle, watchConsole } from "./helpers.ts";

const SHOTS = resolve(import.meta.dirname, ".results/follow");

type M = {
  getCenter: () => { lat: number; lng: number };
  getZoom: () => number;
  isMoving: () => boolean;
  loaded: () => boolean;
  getSource: (id: string) => { serialize: () => { data: { features: { properties: Record<string, unknown>; geometry: { coordinates: [number, number] } }[] } } } | undefined;
  queryRenderedFeatures: (o: unknown) => unknown[];
  once: (ev: string, fn: () => void) => void;
};

const metres = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const k = Math.PI / 180;
  const x = (b.lon - a.lon) * k * Math.cos(((a.lat + b.lat) / 2) * k);
  const y = (b.lat - a.lat) * k;
  return Math.hypot(x, y) * 6_371_000;
};

/** The camera's centre once the map has stopped moving. */
async function center(page: Page) {
  await expect.poll(() => page.evaluate(() => !(window as unknown as { __map: M }).__map.isMoving()), { timeout: 5000 }).toBe(true);
  return page.evaluate(() => {
    const c = (window as unknown as { __map: M }).__map.getCenter();
    return { lat: c.lat, lon: c.lng };
  });
}

/** How far the camera's centre is from `p` (m), once it settles there or the time runs out. */
async function expectCentredOn(page: Page, p: { lat: number; lon: number }, within = 3) {
  await expect.poll(async () => metres(await center(page), p), { timeout: 6000 }).toBeLessThan(within);
}

/** The user dot's feature as drawn: its point and heading (degrees), if any. */
function userFeature(page: Page) {
  return page.evaluate(() => {
    const f = (window as unknown as { __map: M }).__map.getSource("scene-user")?.serialize().data.features[0];
    return f ? { lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], heading: f.properties.heading as number | undefined } : null;
  });
}

/** Whether the beam is actually rendered on the canvas (not just in the source). */
function beamDrawn(page: Page) {
  return page.evaluate(() => (window as unknown as { __map: M }).__map.queryRenderedFeatures({ layers: ["scene-user-heading"] }).length > 0);
}

/** An absolute orientation reading, as Android Chrome sends it (alpha anticlockwise from north). */
function compass(page: Page, alpha: number, beta = 30, gamma = 0) {
  return page.evaluate(
    ([alpha, beta, gamma]) => window.dispatchEvent(new DeviceOrientationEvent("deviceorientationabsolute", { alpha, beta, gamma, absolute: true })),
    [alpha, beta, gamma],
  );
}

/** Keeps the compass alive (the store forgets one silent for 3 s) at `alpha` until the returned stop. */
async function holdCompass(page: Page, alpha: number) {
  await page.evaluate((alpha) => {
    const w = window as unknown as { __compass?: ReturnType<typeof setInterval> };
    clearInterval(w.__compass);
    const send = () => window.dispatchEvent(new DeviceOrientationEvent("deviceorientationabsolute", { alpha, beta: 30, gamma: 0, absolute: true }));
    send();
    w.__compass = setInterval(send, 50);
  }, alpha);
}

const locate = (page: Page) => page.getByRole("button", { name: /Show my location|Following your location/ });

/**
 * The open map strip's top and bottom at x = 120 (between the top chrome and the sheet): where a
 * drag moves the map, not the sheet.
 */
function mapStrip(page: Page): Promise<{ top: number; bottom: number }> {
  return page.evaluate(() => {
    const onMap = (y: number) => Boolean(document.elementFromPoint(120, y)?.closest(".maplibregl-canvas-container, .maplibregl-canvas"));
    // The longest run of map: a few px of it show above the search bar too.
    let best = { top: 0, bottom: 0 };
    for (let y = 0, start = -1; y <= innerHeight; y += 4) {
      if (y < innerHeight && onMap(y)) {
        if (start < 0) start = y;
      } else if (start >= 0) {
        if (y - 4 - start > best.bottom - best.top) best = { top: start, bottom: y - 4 };
        start = -1;
      }
    }
    return best;
  });
}

/** Drags the map by (dx, dy) within its open strip. */
async function dragMap(page: Page, dx: number, dy: number) {
  const { top, bottom } = await mapStrip(page);
  expect(bottom - top, "an open strip of map to drag").toBeGreaterThan(Math.abs(dy) + 20);
  const y0 = dy > 0 ? top + 10 : bottom - 10;
  await drag(page, [200, y0], [200 + dx, y0 + dy]);
}

async function drag(page: Page, from: [number, number], to: [number, number]) {
  await page.mouse.move(...from);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(from[0] + ((to[0] - from[0]) * i) / 8, from[1] + ((to[1] - from[1]) * i) / 8);
  await page.mouse.up();
}

type LatLon = { lat: number; lon: number };
const start: LatLon = { lat: GPS.downtown.latitude, lon: GPS.downtown.longitude };
const moveTo = (page: Page, p: { lat: number; lon: number }) => page.context().setGeolocation({ latitude: p.lat, longitude: p.lon, accuracy: 10 });
/** `m` metres north of `p`. */
const north = (p: { lat: number; lon: number }, m: number) => ({ lat: p.lat + m / 111_320, lon: p.lon });

test.describe("follow mode", () => {
  test("Locate follows the rider as they walk; a drag lets go", async ({ page }) => {
    const errors = watchConsole(page);
    await launch(page, "/explore");
    await hookMap(page);
    await expect(locate(page)).toHaveAccessibleName("Show my location");

    // Look somewhere else first, so Locate has something to do.
    await dragMap(page, -140, -100);
    await settle(page, 400);
    expect(metres(await center(page), start)).toBeGreaterThan(50);

    await locate(page).click();
    await expect(locate(page)).toHaveAccessibleName("Following your location");
    await expectCentredOn(page, start);

    // The rider walks north: the camera goes with them, fix by fix.
    let at = start;
    for (const step of [40, 40, 40]) {
      at = north(at, step);
      await moveTo(page, at);
      await expectCentredOn(page, at);
      expect(await userFeature(page)).toMatchObject({ lat: expect.closeTo(at.lat, 6), lon: expect.closeTo(at.lon, 6) });
    }
    await page.screenshot({ path: `${SHOTS}/01-following.png` });

    // A drag means "let me look elsewhere": follow ends and the next fix leaves the camera alone.
    await dragMap(page, -80, 80);
    await expect(locate(page)).toHaveAccessibleName("Show my location");
    const looked = await center(page);
    at = north(at, 60);
    await moveTo(page, at);
    await expect.poll(async () => (await userFeature(page))?.lat).toBeCloseTo(at.lat, 6);
    await page.waitForTimeout(800);
    expect(metres(await center(page), looked)).toBeLessThan(1);

    // Locate again picks the rider back up.
    await locate(page).click();
    await expectCentredOn(page, at);
    expect(errors).toEqual([]);
  });

  test("a zoom keeps following", async ({ page }) => {
    await launch(page, "/explore");
    await hookMap(page);
    await locate(page).click();
    await expectCentredOn(page, start);
    const z0 = await page.evaluate(() => (window as unknown as { __map: M }).__map.getZoom());
    // A wheel zoom off-centre drifts the camera toward the pointer; it comes back to the rider.
    await page.mouse.move(80, 260);
    for (let i = 0; i < 4; i++) await page.mouse.wheel(0, -120);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __map: M }).__map.getZoom())).toBeGreaterThan(z0 + 0.3);
    await expect(locate(page)).toHaveAccessibleName("Following your location");
    await expectCentredOn(page, start);
    const next = north(start, 30);
    await moveTo(page, next);
    await expectCentredOn(page, next);
  });

  test("another screen ends follow mode, and it is not back on return", async ({ page }) => {
    await launch(page, "/explore");
    await hookMap(page);
    await locate(page).click();
    await expect(locate(page)).toHaveAccessibleName("Following your location");
    // In-app navigation (a reload would reset everything anyway): the first stop card, then back.
    // The card is one big button under its text (the text takes the pointer, the button the click).
    await page.getByRole("button", { name: /^Fannin St @ McKinney St \(246\)/ }).dispatchEvent("click");
    await expect(page).toHaveURL(/\/explore\/stop\/246/);
    await settle(page, 400);
    await expect(locate(page)).toHaveAccessibleName("Show my location");
    await page.goBack();
    await expect(page).toHaveURL(/\/explore$/);
    await settle(page, 400);
    await expect(locate(page)).toHaveAccessibleName("Show my location");
  });

  test("on the walk screen, following keeps the dot centred over the route redraws", async ({ page }) => {
    const errors = watchConsole(page);
    await launch(page, "/explore/stop/342/walk");
    await hookMap(page);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("342");
    await locate(page).click();
    await expectCentredOn(page, start);
    // Far enough for the walk to be asked for again (a new route line, a new scene).
    let at = start;
    for (const step of [30, 30, 30]) {
      at = { lat: at.lat - step / 111_320, lon: at.lon + step / 96_000 };
      await moveTo(page, at);
      await expectCentredOn(page, at);
    }
    await settle(page, 400);
    await expectCentredOn(page, at);
    await expect(locate(page)).toHaveAccessibleName("Following your location");
    await page.screenshot({ path: `${SHOTS}/02-walk-following.png` });
    expect(errors).toEqual([]);
  });

  test("a sheet moved to another height re-centres the dot in the map that is left", async ({ page }) => {
    await launch(page, "/explore");
    await hookMap(page);
    await locate(page).click();
    await expectCentredOn(page, start);
    // Full (the map is covered), then back to half: the camera fits the dot to the strip left each time.
    await page.getByRole("button", { name: "Show list" }).click();
    await settle(page, 600);
    await page.getByRole("button", { name: "Show map" }).click();
    await settle(page, 600);
    await expect(locate(page)).toHaveAccessibleName("Following your location");
    await expectCentredOn(page, start);
  });
});

test.describe("heading beam", () => {
  test("the compass turns a beam on the dot", async ({ page }) => {
    const errors = watchConsole(page);
    await launch(page, "/explore");
    await hookMap(page);
    await locate(page).click();
    await expectCentredOn(page, start);
    // No compass yet (desktop, or no reading): no beam.
    expect((await userFeature(page))?.heading).toBeUndefined();

    await holdCompass(page, 0); // facing north
    await expect.poll(async () => (await userFeature(page))?.heading).toBe(0);
    await expect.poll(() => beamDrawn(page)).toBe(true);
    await page.screenshot({ path: `${SHOTS}/03-beam-north.png` });

    await holdCompass(page, 270); // alpha 270: facing east
    await expect.poll(async () => (await userFeature(page))?.heading, { timeout: 5000 }).toBeGreaterThanOrEqual(88);
    expect((await userFeature(page))?.heading).toBeLessThanOrEqual(92);
    await page.screenshot({ path: `${SHOTS}/04-beam-east.png` });

    // Held up to look at the map (beta 80), turned to face south-west.
    await page.evaluate(() => {
      const w = window as unknown as { __compass?: ReturnType<typeof setInterval> };
      clearInterval(w.__compass);
      w.__compass = setInterval(() => window.dispatchEvent(new DeviceOrientationEvent("deviceorientationabsolute", { alpha: 135, beta: 80, gamma: 0, absolute: true })), 50);
    });
    await expect.poll(async () => (await userFeature(page))?.heading, { timeout: 5000 }).toBeGreaterThanOrEqual(223);
    expect((await userFeature(page))?.heading).toBeLessThanOrEqual(227);

    // The beam moves with the dot.
    const next = north(start, 50);
    await moveTo(page, next);
    await expect.poll(async () => (await userFeature(page))?.lat).toBeCloseTo(next.lat, 6);
    expect((await userFeature(page))?.heading).toBeDefined();

    // The compass goes quiet (the sensor stopped): the beam goes after 3 s rather than point stale.
    await page.evaluate(() => clearInterval((window as unknown as { __compass?: ReturnType<typeof setInterval> }).__compass));
    await expect.poll(async () => (await userFeature(page))?.heading, { timeout: 6000 }).toBeUndefined();
    await expect.poll(() => beamDrawn(page)).toBe(false);
    expect(errors).toEqual([]);
  });

  test("a compass reading with no fix draws nothing", async ({ page }) => {
    await launch(page, "/explore", { gps: null });
    await hookMap(page);
    await compass(page, 0);
    await page.waitForTimeout(300);
    expect(await userFeature(page)).toBeNull();
  });

  test("without a compass, the GPS course points the beam while walking, not standing", async ({ page }) => {
    // The fix as a phone's GPS gives it: a course (heading) and a speed, which Playwright's
    // geolocation can't carry. Walking east at 1.4 m/s, then standing still.
    await page.addInitScript(() => {
      const w = window as unknown as { __speed: number };
      w.__speed = 1.4;
      navigator.geolocation.watchPosition = (ok) => {
        const send = () =>
          ok({
            coords: { latitude: 29.7563, longitude: -95.3639, accuracy: 8, altitude: null, altitudeAccuracy: null, heading: w.__speed ? 90 : null, speed: w.__speed, toJSON: () => ({}) },
            timestamp: Date.now(),
            toJSON: () => ({}),
          } as GeolocationPosition);
        setTimeout(send, 50);
        return setInterval(send, 500) as unknown as number;
      };
    });
    await launch(page, "/explore");
    await hookMap(page);
    await expect.poll(async () => (await userFeature(page))?.heading).toBe(90);
    await page.screenshot({ path: `${SHOTS}/05-course-east.png` });
    await page.evaluate(() => ((window as unknown as { __speed: number }).__speed = 0));
    await expect.poll(async () => (await userFeature(page))?.heading).toBeUndefined();
    // A compass, when there is one, wins over the course.
    await page.evaluate(() => ((window as unknown as { __speed: number }).__speed = 1.4));
    await holdCompass(page, 0);
    await expect.poll(async () => (await userFeature(page))?.heading).toBe(0);
  });

  test("Locate asks iOS for motion access, once, and the compass heading then turns the beam", async ({ page }) => {
    // Safari's shape: requestPermission() on DeviceOrientationEvent, webkitCompassHeading on the event.
    await page.addInitScript(() => {
      const w = window as unknown as { __asked: number };
      w.__asked = 0;
      (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission = () => {
        w.__asked++;
        return Promise.resolve("granted");
      };
    });
    await launch(page, "/explore");
    await hookMap(page);
    expect(await page.evaluate(() => (window as unknown as { __asked: number }).__asked)).toBe(0);
    await locate(page).click();
    await locate(page).click();
    expect(await page.evaluate(() => (window as unknown as { __asked: number }).__asked)).toBe(1);
    await page.evaluate(() => {
      const w = window as unknown as { __compass?: ReturnType<typeof setInterval> };
      w.__compass = setInterval(() => {
        const e = new DeviceOrientationEvent("deviceorientation", { alpha: 10, beta: 30, gamma: 0 });
        Object.assign(e, { webkitCompassHeading: 200, webkitCompassAccuracy: 15 });
        window.dispatchEvent(e);
      }, 50);
    });
    await expect.poll(async () => (await userFeature(page))?.heading).toBe(200);
  });
});
