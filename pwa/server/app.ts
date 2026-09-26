import { Hono, type Context, type MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { config } from "./config.ts";
import { findRoute, findStop } from "./gtfs/store.ts";
import { optionalNumber, parseLatLon, parsePlace, requireParam } from "./params.ts";
import { getAlerts } from "./services/alerts.ts";
import { getArrivals } from "./services/arrivals.ts";
import { UpstreamError } from "./lib/upstream.ts";
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

const MAX_QUERY_CHARS = 100;

/** Origins allowed to call the API from a browser: CORS_ORIGINS (comma-separated), and localhost for development. */
function allowedOrigin(origin: string): boolean {
  if (config.corsOrigins.includes(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

/** A token bucket per client address: bursts of BURST requests, refilled at PER_MINUTE a minute. */
const BURST = 30;
const PER_MINUTE = 60;
const buckets = new Map<string, { tokens: number; at: number }>();

const LOOPBACK = /^(127\.|::1$|::ffff:127\.)/;

/**
 * Behind a proxy, its X-Forwarded-For; otherwise the socket's address (@hono/node-server).
 * Undefined, not limited: a loopback caller with no proxy header (the Vite dev proxy, e2e runs) or
 * an in-process request (tests).
 */
function clientAddress(c: Context): string | undefined {
  const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const socket = (c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined)?.incoming?.socket?.remoteAddress;
  return socket && !LOOPBACK.test(socket) ? socket : undefined;
}

const rateLimit: MiddlewareHandler = async (c, next) => {
  const address = clientAddress(c);
  if (!address) return next();
  const key = `${c.req.path}|${address}`;
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: BURST, at: now };
  b.tokens = Math.min(BURST, b.tokens + ((now - b.at) / 60_000) * PER_MINUTE);
  b.at = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    c.header("Retry-After", "5");
    c.header("Cache-Control", "no-store");
    return c.json({ error: { code: "RATE_LIMITED", message: "Too many requests. Please wait a few seconds and try again." } }, 429);
  }
  b.tokens -= 1;
  buckets.set(key, b);
  // Forget idle clients now and then, so the map stays small.
  if (buckets.size > 5000) for (const [k, v] of buckets) if (now - v.at > 120_000) buckets.delete(k);
  await next();
};

/** /nearby's radius, in metres: at least a block, at most what the list can show. */
function clampRadius(r: number | undefined): number | undefined {
  return r === undefined ? undefined : Math.max(50, Math.min(r, 2000));
}

export function createApp() {
  const app = new Hono().basePath("/api");
  // Only the app's own pages may read the API from a browser: it proxies METRO's keyed feeds and
  // rate-limited community services (Transitous, Photon, OSRM), and must not be an open proxy.
  app.use("*", cors({ origin: (origin) => (allowedOrigin(origin) ? origin : null) }));
  // Per client: the endpoints that call an upstream on every cache miss.
  for (const path of ["/plan", "/search", "/walk", "/arrivals"]) app.use(path, rateLimit);

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
    return c.json(getStopSchedule(c.req.param("id"), route, Date.now(), c.req.query("date") || undefined));
  });

  app.get("/arrivals", async (c) => {
    const stop = requireParam(c.req.query("stop"), "stop");
    const limit = Math.max(1, Math.min(Math.floor(optionalNumber(c.req.query("limit"), "limit") ?? 10), 50));
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
        radiusM: clampRadius(optionalNumber(c.req.query("radius"), "radius")),
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
    const walk = await walkRoute(from, to, destination);
    // A straight-line estimate may be a passing upstream failure: browsers must not keep it.
    if (walk.source === "osrm") cacheFor(c, 3600, 86400);
    else c.header("Cache-Control", "no-store");
    return c.json(walk);
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
    // Longer than any stop, route or place name: nothing past this is forwarded to Photon.
    const q = requireParam(c.req.query("q"), "q").slice(0, MAX_QUERY_CHARS);
    const lat = optionalNumber(c.req.query("lat"), "lat");
    const lon = optionalNumber(c.req.query("lon"), "lon");
    const result = await search(q, { near: lat !== undefined && lon !== undefined ? { lat, lon } : undefined });
    // A degraded answer ("Address search is unavailable") must not be kept for 10 minutes.
    if (result.warnings?.length) c.header("Cache-Control", "public, max-age=15");
    else cacheFor(c, 300);
    return c.json(result);
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
    // Not an error the rider can fix, and polled: answer 200 with `available: false` so the
    // browser doesn't log a failed request every 15 s. The route still has to exist.
    if (!config.metroTransitApiKey || config.offline) {
      const routeId = c.req.query("route");
      if (routeId && !findRoute(routeId)) throw new ApiError(404, "ROUTE_NOT_FOUND", `Route ${routeId} doesn't exist.`);
      cacheFor(c, 300);
      return c.json({ vehicles: [], available: false, reason: config.offline ? "offline" : "no-key" });
    }
    // The live feed failing: no buses drawn, and the client polls less often until it is back (a
    // 500 here was logged with a stack every 15 s per rider).
    const vehicles = await getVehicles(c.req.query("route")).catch((err: unknown) => {
      if (err instanceof UpstreamError) return undefined;
      throw err;
    });
    if (!vehicles) {
      c.header("Cache-Control", "no-store");
      return c.json({ vehicles: [], available: false, reason: "upstream" });
    }
    cacheFor(c, 15);
    return c.json({ vehicles });
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
