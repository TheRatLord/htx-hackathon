import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { config } from "./config.ts";
import { findStop } from "./gtfs/store.ts";
import { optionalNumber, parseLatLon, parsePlace, requireParam } from "./params.ts";
import { getAlerts } from "./services/alerts.ts";
import { getArrivals } from "./services/arrivals.ts";
import { ApiError } from "./services/errors.ts";
import { getHealth } from "./services/health.ts";
import { getNearby } from "./services/nearby.ts";
import { plan } from "./services/plan.ts";
import { getRouteDetail } from "./services/routeDetail.ts";
import { getRouteNext } from "./services/routeNext.ts";
import { search } from "./services/search.ts";
import { getStopDetail, getTransitCenterDetail } from "./services/stopDetail.ts";
import { getStopSchedule } from "./services/stopSchedule.ts";
import { transitCenters } from "./services/transitCenters.ts";
import { getTrip } from "./services/trips.ts";
import { getVehicles } from "./services/vehicles.ts";
import { walkRoute } from "./services/walk.ts";

/** Browser/CDN caching; `swr` lets a CDN serve slightly stale data while refreshing. */
function cacheFor(c: Context, maxAge: number, swr = maxAge) {
  c.header("Cache-Control", `public, max-age=${maxAge}, stale-while-revalidate=${swr}`);
}

export function createApp() {
  const app = new Hono().basePath("/api");
  app.use("*", cors());

  app.onError((err, c) => {
    c.header("Cache-Control", "no-store");
    if (err instanceof ApiError) return c.json({ error: { code: err.code, message: err.message } }, err.status);
    console.error(err);
    return c.json({ error: { code: "INTERNAL", message: "Something went wrong on our side. Please try again." } }, 500);
  });
  app.notFound((c) => c.json({ error: { code: "NOT_FOUND", message: `No endpoint ${c.req.method} ${c.req.path}` } }, 404));

  app.get("/health", (c) => c.json(getHealth()));

  app.get("/stops/:id", async (c) => {
    cacheFor(c, 15);
    return c.json(await getStopDetail(c.req.param("id")));
  });

  app.get("/stops/:id/schedule", (c) => {
    const route = requireParam(c.req.query("route"), "route");
    cacheFor(c, 300);
    return c.json(getStopSchedule(c.req.param("id"), route));
  });

  app.get("/arrivals", async (c) => {
    const stop = requireParam(c.req.query("stop"), "stop");
    const limit = Math.min(optionalNumber(c.req.query("limit"), "limit") ?? 10, 50);
    cacheFor(c, 15);
    return c.json(await getArrivals(stop, { routeId: c.req.query("route"), limit }));
  });

  app.get("/nearby", async (c) => {
    const lat = optionalNumber(c.req.query("lat"), "lat");
    const lon = optionalNumber(c.req.query("lon"), "lon");
    if (lat === undefined || lon === undefined) throw new ApiError(400, "MISSING_PARAMETER", 'Provide "lat" and "lon"');
    cacheFor(c, 15);
    return c.json(
      await getNearby(lat, lon, {
        radiusM: optionalNumber(c.req.query("radius"), "radius"),
        precise: c.req.query("precise") === "1",
      }),
    );
  });

  app.get("/alerts", async (c) => {
    cacheFor(c, 60);
    return c.json(await getAlerts({ routeId: c.req.query("route"), stopId: c.req.query("stop") }));
  });

  app.get("/walk", async (c) => {
    const from = parseLatLon(c.req.query("from"), "from");
    const toStopId = c.req.query("toStop");
    const toStop = toStopId ? findStop(toStopId) : undefined;
    if (toStopId && !toStop) throw new ApiError(404, "STOP_NOT_FOUND", `We couldn't find stop #${toStopId}.`);
    const to = c.req.query("to") ? parseLatLon(c.req.query("to"), "to") : toStop;
    if (!to) throw new ApiError(400, "MISSING_PARAMETER", 'Provide "to" (lat,lon) or "toStop"');
    const destination = toStop && {
      label: `stop #${toStop.id} (${toStop.name}${toStop.dir ? `, ${toStop.dir.toLowerCase()}` : ""})`,
      name: toStop.name,
    };
    cacheFor(c, 3600, 86400);
    return c.json(await walkRoute(from, to, destination));
  });

  app.get("/plan", async (c) => {
    const time = c.req.query("time");
    if (time && Number.isNaN(Date.parse(time))) throw new ApiError(400, "BAD_TIME", '"time" must be an ISO date-time');
    cacheFor(c, 60);
    return c.json(
      await plan({
        from: parsePlace(c.req.query("from"), "from"),
        to: parsePlace(c.req.query("to"), "to"),
        time,
        arriveBy: c.req.query("arriveBy") === "true" || c.req.query("arriveBy") === "1",
      }),
    );
  });

  app.get("/search", async (c) => {
    const q = requireParam(c.req.query("q"), "q");
    const lat = optionalNumber(c.req.query("lat"), "lat");
    const lon = optionalNumber(c.req.query("lon"), "lon");
    cacheFor(c, 300);
    return c.json(await search(q, { near: lat !== undefined && lon !== undefined ? { lat, lon } : undefined }));
  });

  app.get("/routes/:id", async (c) => {
    cacheFor(c, 300);
    return c.json(await getRouteDetail(c.req.param("id")));
  });

  app.get("/routes/:id/next", async (c) => {
    const dir = c.req.query("dir") ?? "0";
    if (dir !== "0" && dir !== "1") throw new ApiError(400, "BAD_DIRECTION", '"dir" must be 0 or 1');
    c.header("Cache-Control", "max-age=60");
    return c.json(await getRouteNext(c.req.param("id"), Number(dir) as 0 | 1));
  });

  app.get("/trips/:id", (c) => {
    cacheFor(c, 60);
    return c.json(getTrip(c.req.param("id"), c.req.query("fromStop")));
  });

  app.get("/vehicles", async (c) => {
    if (!config.metroTransitApiKey || config.offline)
      throw new ApiError(503, "REALTIME_UNAVAILABLE", "Live bus locations need METRO_TRANSIT_API_KEY (not available offline).");
    cacheFor(c, 15);
    return c.json({ vehicles: await getVehicles(c.req.query("route")) });
  });

  app.get("/transit-centers", (c) => {
    cacheFor(c, 3600);
    return c.json({
      transitCenters: transitCenters().map(({ bays, ...t }) => ({ ...t, bayCount: bays.length })),
    });
  });

  app.get("/transit-centers/:id", async (c) => {
    cacheFor(c, 15);
    return c.json(await getTransitCenterDetail(c.req.param("id")));
  });

  return app;
}
