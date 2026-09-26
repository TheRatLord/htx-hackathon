// Upcoming departures at a stop: the schedule, overlaid with real-time data.
// GTFS-RT TripUpdates are applied first, then METRO's per-stop arrivals API
// (which also knows the bay); simulated predictions only when neither is available.

import type { Arrival, DataSource } from "../../shared/types.ts";
import { config } from "../config.ts";
import { scheduledDepartures, type ScheduledDeparture } from "../gtfs/schedule.ts";
import { findRoute, findStop, gtfs, tripInfo } from "../gtfs/store.ts";
import { hasTransitApi, parseODataStopId, stopArrivals, ODATA_PREFIX } from "../realtime/metroApi.ts";
import { simulatedDelay } from "../realtime/simulate.ts";
import { hasTripUpdates, predictionFor, tripUpdates } from "../realtime/tripUpdates.ts";
import { ApiError } from "./errors.ts";
import { bayFor } from "./transitCenters.ts";

/** Look back this far so late buses still show up. */
const LOOKBACK_MS = 15 * 60_000;
/** Simulated/real predictions only exist for buses already near; matches METRO's ~2 h window. */
const REALTIME_HORIZON_MS = 120 * 60_000;

export interface ArrivalsResult {
  stopId: string;
  stopName: string;
  generatedAt: string;
  /** Real-time sources that were applied; empty means schedule only. */
  realtimeSources: DataSource[];
  warnings: string[];
  arrivals: Arrival[];
}

interface Working {
  dep?: ScheduledDeparture;
  tripIdx: number;
  scheduledMs: number;
  predictedMs: number;
  isRealtime: boolean;
  source: DataSource;
  canceled: boolean;
  bay?: string;
}

export async function getArrivals(
  stopId: string,
  opts: { routeId?: string; limit?: number; horizonMin?: number; now?: number; realtime?: boolean } = {},
): Promise<ArrivalsResult> {
  const g = gtfs();
  const stop = findStop(stopId);
  if (!stop) throw new ApiError(404, "STOP_NOT_FOUND", `We couldn't find stop #${stopId}. Check the number on the stop sign.`);
  const now = opts.now ?? Date.now();
  const limit = opts.limit ?? 10;
  const route = opts.routeId ? findRoute(opts.routeId) : undefined;
  if (opts.routeId && !route) throw new ApiError(404, "ROUTE_NOT_FOUND", `Route ${opts.routeId} doesn't exist.`);
  const stopIdx = g.stopIndex.get(stopId)!;
  const deps = scheduledDepartures(stopIdx, now - LOOKBACK_MS, now + (opts.horizonMin ?? 180) * 60_000, {
    routeIdx: route ? new Set([g.routeIndex.get(route.id)!]) : undefined,
  });
  let items: Working[] = deps.map((dep) => ({
    dep,
    tripIdx: dep.tripIdx,
    scheduledMs: dep.epochMs,
    predictedMs: dep.epochMs,
    isRealtime: false,
    source: "schedule",
    canceled: false,
  }));

  const warnings: string[] = [];
  const realtimeSources: DataSource[] = [];
  const sources: [boolean, DataSource, () => Promise<Working[]>][] = [
    [hasTripUpdates(), "gtfs-rt", () => applyTripUpdates(stopId, items)],
    [hasTransitApi(), "metro-arrivals-api", () => applyMetroArrivals(stopId, items, route?.id)],
  ];
  for (const [enabled, name, apply] of sources) {
    if (!enabled || opts.realtime === false) continue;
    try {
      items = await apply();
      realtimeSources.push(name);
    } catch (err) {
      warnings.push(`${name} unavailable (${(err as Error).message}).`);
    }
  }
  if (!realtimeSources.length && config.demoRealtime && opts.realtime !== false) {
    applySimulation(items, now);
    realtimeSources.push("simulated");
  }

  const arrivals = items
    .filter((w) => w.predictedMs >= now - 30_000)
    .sort((a, b) => a.predictedMs - b.predictedMs)
    .slice(0, limit)
    .map((w) => toArrival(w, stopId, now));
  return { stopId, stopName: stop.name, generatedAt: new Date(now).toISOString(), realtimeSources, warnings, arrivals };
}

async function applyMetroArrivals(stopId: string, items: Working[], routeId?: string): Promise<Working[]> {
  const live = await stopArrivals(stopId);
  const g = gtfs();
  const byTrip = new Map(items.map((w) => [g.meta.trips.ids[w.tripIdx], w]));
  const extra: Working[] = [];
  for (const a of live) {
    const tripIdx = g.tripIndex.get(a.TripId.replace(ODATA_PREFIX, ""));
    if (tripIdx === undefined) continue;
    if (routeId && g.meta.trips.route[tripIdx] !== g.routeIndex.get(routeId)) continue;
    let w = byTrip.get(g.meta.trips.ids[tripIdx]);
    if (!w) {
      // e.g. a trip from yesterday's service day running past midnight
      w = { tripIdx, scheduledMs: Date.parse(a.ScheduledTime), predictedMs: 0, isRealtime: false, source: "schedule", canceled: false };
      extra.push(w);
      // The feed can list one trip twice; both entries update this one departure.
      byTrip.set(g.meta.trips.ids[tripIdx], w);
    }
    w.bay = parseODataStopId(a.StopId).bay ?? w.bay;
    w.canceled ||= a.IsCanceled;
    // A scheduled-only entry must not erase a GTFS-RT prediction.
    if (!a.IsRealTime && w.isRealtime) continue;
    w.predictedMs = Date.parse(a.UtcDepartureTime);
    w.isRealtime = a.IsRealTime;
    w.source = a.IsRealTime ? "metro-arrivals-api" : "schedule";
  }
  return items.concat(extra);
}

async function applyTripUpdates(stopId: string, items: Working[]): Promise<Working[]> {
  const feed = await tripUpdates();
  const g = gtfs();
  for (const w of items) {
    const rt = feed.get(g.meta.trips.ids[w.tripIdx]);
    if (!rt || !w.dep) continue;
    // METRO's stop_sequence is 1-based and contiguous, so position + 1 == stop_sequence.
    const position = w.dep.stIdx - g.st.tripOff[w.tripIdx] + 1;
    const p = predictionFor(rt, stopId, position, w.scheduledMs);
    w.canceled = rt.canceled || Boolean(p?.skipped);
    if (!p) continue;
    w.predictedMs = p.timeMs;
    w.isRealtime = true;
    w.source = "gtfs-rt";
    w.bay = p.bay ?? w.bay;
  }
  return items;
}

function applySimulation(items: Working[], now: number) {
  const g = gtfs();
  for (const w of items) {
    if (!w.dep || w.scheduledMs > now + REALTIME_HORIZON_MS) continue;
    const s = simulatedDelay(g.meta.trips.ids[w.tripIdx], w.dep.serviceDate);
    w.predictedMs = w.scheduledMs + s.delaySec * 1000;
    w.canceled = s.canceled;
    w.isRealtime = true;
    w.source = "simulated";
  }
}

function toArrival(w: Working, stopId: string, now: number): Arrival {
  const t = tripInfo(w.tripIdx);
  const bay = w.bay ?? bayFor(stopId, t.route.id, t.directionId, t.headsign);
  return {
    tripId: t.id,
    routeId: t.route.id,
    routeShortName: t.route.displayName,
    routeColor: t.route.color,
    routeTextColor: t.route.textColor,
    headsign: t.headsign,
    directionLabel: t.directionLabel,
    ...(bay && { bay }),
    scheduledTime: new Date(w.scheduledMs).toISOString(),
    departureTime: new Date(w.predictedMs).toISOString(),
    minutesAway: Math.max(0, Math.round((w.predictedMs - now) / 60_000)),
    isRealtime: w.isRealtime,
    source: w.source,
    delaySeconds: Math.round((w.predictedMs - w.scheduledMs) / 1000),
    canceled: w.canceled,
  };
}
