// Backend additions for the redesign (spec G.4, changes 1–7).
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../server/app.ts";
import { config } from "../server/config.ts";
import { serviceDayStart } from "../server/lib/time.ts";
import { getAlerts } from "../server/services/alerts.ts";
import { getArrivals } from "../server/services/arrivals.ts";
import { fetchUpstream } from "../server/lib/upstream.ts";
import { getNearby } from "../server/services/nearby.ts";
import { getRouteDetail } from "../server/services/routeDetail.ts";
import { getRouteNext } from "../server/services/routeNext.ts";
import { getStopDetail, getTransitCenterDetail } from "../server/services/stopDetail.ts";
import { getStopSchedule } from "../server/services/stopSchedule.ts";
import { walkRoute } from "../server/services/walk.ts";

vi.mock("../server/lib/upstream.ts", async (importActual) => {
  const actual = await importActual<typeof import("../server/lib/upstream.ts")>();
  return {
    ...actual,
    fetchUpstream: vi.fn((opts: Parameters<typeof actual.fetchUpstream>[0]) =>
      opts.service === "metro-alerts" ? Promise.reject(new actual.UpstreamError("metro-alerts", "boom")) : actual.fetchUpstream(opts),
    ),
  };
});

// Wednesday 2026-09-30, 5:00 PM in Houston.
const NOW = serviceDayStart("20260930") + 17 * 3600_000;

afterEach(() => {
  config.demoRealtime = false;
  config.offline = true;
  config.metroApiKey = undefined;
});

describe("1. /nearby transit centers", () => {
  it("lists a transit center within 1,000 m with a walk estimate", async () => {
    const res = await getNearby(29.789, -95.456, { now: NOW });
    const tc = res.transitCenters.find((t) => t.id === "northwest-transit-center");
    expect(tc).toBeDefined();
    expect(Math.abs(tc!.walkMin - 11)).toBeLessThanOrEqual(1);
    expect(tc!.bayCount).toBeGreaterThan(0);
    expect(res.transitCenters.every((t) => t.distanceM <= 1000)).toBe(true);
  });

  it("lists transit centers whatever the stop radius", async () => {
    const res = await getNearby(29.789, -95.456, { radiusM: 100, now: NOW });
    expect(res.transitCenters.map((t) => t.id)).toContain("northwest-transit-center");
  });
});

describe("2. /nearby departures carry their source", () => {
  it("marks simulated departures", async () => {
    config.demoRealtime = true;
    const res = await getNearby(29.7563, -95.3639, { now: NOW });
    const sources = res.stops.flatMap((s) => s.routes.flatMap((r) => r.departures.map((d) => d.source)));
    expect(sources).toContain("simulated");
  });
});

describe("3. transit center window", () => {
  it("returns windowEnd and a departure for every bay with a trip in the window", async () => {
    const tc = await getTransitCenterDetail("northwest-transit-center", NOW);
    expect(tc.windowEnd).not.toBeNull();
    expect(tc.platforms.find((p) => p.stopId === "79")?.name).toBe("Northwest Transit Center - Platform 2");
    for (const bay of tc.bays) {
      const { arrivals } = await getArrivals(bay.stopId, { limit: 1000, horizonMin: 90, now: NOW });
      if (arrivals.some((a) => a.bay === bay.bay)) expect(bay.departures.length).toBeGreaterThan(0);
    }
  });
});

describe("4. structured walk steps", () => {
  it("sets maneuver on recorded OSRM steps", async () => {
    const w = await walkRoute({ lat: 29.7831, lon: -95.4555 }, { lat: 29.78351, lon: -95.45547 }, { label: "stop #1", name: "Test stop" });
    expect(w.source).toBe("osrm");
    expect(w.steps.length).toBeGreaterThan(0);
    expect(w.steps.every((s) => typeof s.maneuver === "string")).toBe(true);
    expect(w.steps.at(-1)).toMatchObject({ maneuver: "arrive", street: "Test stop" });
  });

  it("falls back to one arrive step naming the stop", async () => {
    const w = await walkRoute({ lat: 29.7001, lon: -95.4001 }, { lat: 29.7011, lon: -95.4011 }, { label: "stop #9", name: "Main St @ Elm St" });
    expect(w.source).toBe("straight-line-estimate");
    expect(w.steps).toEqual([expect.objectContaining({ maneuver: "arrive", street: "Main St @ Elm St" })]);
  });
});

describe("5. stop schedule", () => {
  it("covers the whole service day; the next trip is later today while one remains", () => {
    const s = getStopSchedule("342", "40", NOW);
    expect(s.serviceDate).toBe("20260930");
    expect(s.departures.length).toBeGreaterThan(10);
    expect(Date.parse(s.departures[0].departureTime)).toBeLessThan(NOW - 6 * 3600_000);
    expect(s.nextServiceFirst!.serviceDate).toBe("20260930");
    expect(Date.parse(s.nextServiceFirst!.departureTime)).toBeGreaterThanOrEqual(NOW);
  });

  it("names the next day's first trip once today's service has ended", () => {
    const s = getStopSchedule("342", "40", serviceDayStart("20260930") + 26 * 3600_000);
    expect(s.nextServiceFirst!.serviceDate).toBe("20261001");
  });

  it("after midnight, before the first bus, the next trip is this morning (not tomorrow)", () => {
    // Sat 2:30 AM: Friday's late trips are over; Saturday's 5:47 AM is still ahead.
    const at = serviceDayStart("20260926") + 2.5 * 3600_000;
    const s = getStopSchedule("342", "40", at);
    expect(s.serviceDate).toBe("20260926");
    expect(s.nextServiceFirst!.serviceDate).toBe("20260926");
    expect(Date.parse(s.nextServiceFirst!.departureTime) - at).toBeLessThan(6 * 3600_000);
  });

  it("serves another day's schedule with date= (D7 day tabs)", () => {
    const sat = getStopSchedule("342", "40", NOW, "20261003");
    expect(sat.serviceDate).toBe("20261003");
    expect(sat.departures.length).toBeGreaterThan(5);
    expect(sat.nextServiceFirst).toBeNull();
    expect(getStopSchedule("342", "40", NOW, "20260930").nextServiceFirst).not.toBeNull();
    expect(() => getStopSchedule("342", "40", NOW, "2026-10-03")).toThrow();
  });

  it("is served over HTTP", async () => {
    const res = await createApp().request("/api/stops/342/schedule?route=40");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ stopId: "342", routeId: "040" });
  });

  it("is a 404 for a route that doesn't serve the stop", async () => {
    const res = await createApp().request("/api/stops/342/schedule?route=82");
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: { code: "STOP_NOT_ON_ROUTE" } });
  });
});

describe("6. route next departures", () => {
  it("returns one entry per stop of the direction", async () => {
    const r = await getRouteNext("82", 0, NOW);
    expect(r.stops).toHaveLength(101);
    expect(r.stops.some((s) => s.next)).toBe(true);
    expect(r.stops.every((s) => !s.then || (s.next && s.then.departureTime >= s.next.departureTime))).toBe(true);
    expect(r.stops.some((s) => s.then)).toBe(true);
  });

  it("is cached for a minute and validates dir", async () => {
    const app = createApp();
    const ok = await app.request("/api/routes/82/next?dir=1");
    expect(ok.headers.get("Cache-Control")).toBe("max-age=60");
    expect((await app.request("/api/routes/82/next?dir=2")).status).toBe(400);
  });
});

describe("7. honest alerts source", () => {
  afterEach(() => vi.useRealTimers());

  it("reports unavailable, not demo alerts, when the live feed fails, and caches that for a minute", async () => {
    // Step past the 60 s alerts cache so earlier tests can't have warmed it.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 10 * 60_000);
    config.offline = false;
    config.metroApiKey = "test-key";
    const alertCalls = () => vi.mocked(fetchUpstream).mock.calls.filter(([o]) => o.service === "metro-alerts").length;
    const before = alertCalls();

    const res = await getAlerts();
    expect(res.source).toBe("unavailable");
    expect(res.alerts).toEqual([]);

    await getAlerts({ routeId: "82" });
    expect(alertCalls()).toBe(before + 1);

    expect((await getStopDetail("342")).alertsSource).toBe("unavailable");
    expect((await getRouteDetail("82")).alertsSource).toBe("unavailable");
  });
});
