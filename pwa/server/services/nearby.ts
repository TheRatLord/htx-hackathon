// "Near me": stops sorted by walking distance, each with its direction and the
// next departures per route, so riders can tell same-name stops apart.

import type { Arrival, DataSource } from "../../shared/types.ts";
import { scheduledDepartures } from "../gtfs/schedule.ts";
import { gtfs } from "../gtfs/store.ts";
import { stopsNear } from "../gtfs/spatial.ts";
import { formatDistance, haversineM } from "../lib/geo.ts";
import { getArrivals } from "./arrivals.ts";
import { stopSummary, type StopSummary } from "./present.ts";
import { transitCenters, type TransitCenter } from "./transitCenters.ts";
import { WALK_DETOUR_FACTOR, WALK_SPEED_MPS } from "../../shared/walk.ts";
import { walkRoute } from "./walk.ts";

/** Real-time lookups cost one upstream call per stop; only the closest stops get them. */
const REALTIME_STOPS = 6;
const PRECISE_WALK_STOPS = 3;
/** Transit centers are worth a walk: listed within this distance whatever the stop radius. */
const TRANSIT_CENTER_RADIUS_M = 1000;

export interface NearbyRoute {
  routeId: string;
  name: string;
  color: string;
  textColor: string;
  directionLabel: string;
  headsign: string;
  bay?: string;
  departures: Pick<Arrival, "departureTime" | "minutesAway" | "isRealtime" | "delaySeconds" | "canceled" | "tripId" | "source">[];
}

export interface NearbyStop {
  stop: StopSummary;
  distanceM: number;
  walkDistanceM: number;
  walkDistanceText: string;
  walkMin: number;
  walkSource: "estimate" | "osrm";
  routes: NearbyRoute[];
  /**
   * For a route serving the stop with nothing in the 2-hour window (late night): its next
   * scheduled departure within 18 hours, so the card says "First bus 5:10 AM" rather than
   * only "No buses in the next 2 hours". Keyed by route id.
   */
  laterFirst?: Record<string, string>;
  realtimeSources: DataSource[];
}

export interface NearbyTransitCenter {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distanceM: number;
  walkDistanceM: number;
  walkDistanceText: string;
  walkMin: number;
  bayCount: number;
  source: TransitCenter["source"];
}

function walkEstimate(straightM: number, walkDistanceM = straightM * WALK_DETOUR_FACTOR) {
  return {
    distanceM: Math.round(straightM),
    walkDistanceM: Math.round(walkDistanceM),
    walkDistanceText: formatDistance(walkDistanceM),
    walkMin: Math.max(1, Math.round(walkDistanceM / WALK_SPEED_MPS.normal / 60)),
  };
}

function transitCentersNear(lat: number, lon: number): NearbyTransitCenter[] {
  return transitCenters()
    .map((tc) => ({ tc, d: haversineM(lat, lon, tc.lat, tc.lon) }))
    .filter(({ d }) => d <= TRANSIT_CENTER_RADIUS_M)
    .sort((a, b) => a.d - b.d)
    .map(({ tc, d }) => ({ id: tc.id, name: tc.name, lat: tc.lat, lon: tc.lon, ...walkEstimate(d), bayCount: tc.bays.length, source: tc.source }));
}

export async function getNearby(lat: number, lon: number, opts: { radiusM?: number; limit?: number; precise?: boolean; now?: number } = {}) {
  const radiusM = Math.min(opts.radiusM ?? 500, 2000);
  const near = stopsNear(lat, lon, radiusM, opts.limit ?? 15).filter((n) => gtfs().stops[n.stopIdx].routeIds.length);
  const stops = await Promise.all(
    near.map(async (n, i): Promise<NearbyStop> => {
      const s = gtfs().stops[n.stopIdx];
      let walkDistanceM = n.distanceM * WALK_DETOUR_FACTOR;
      let walkSource: NearbyStop["walkSource"] = "estimate";
      if (opts.precise && i < PRECISE_WALK_STOPS) {
        const w = await walkRoute({ lat, lon }, s, undefined, { fast: true });
        if (w.source === "osrm") {
          walkDistanceM = w.distanceM;
          walkSource = "osrm";
        }
      }
      const arrivals = await getArrivals(s.id, { limit: 40, horizonMin: 120, realtime: i < REALTIME_STOPS, now: opts.now });
      const routes = groupByRoute(arrivals.arrivals);
      const laterFirst = firstLaterByRoute(n.stopIdx, s.routeIds, new Set(routes.map((r) => r.routeId)), opts.now ?? Date.now());
      return {
        stop: stopSummary(s),
        ...walkEstimate(n.distanceM, walkDistanceM),
        walkSource,
        routes,
        ...(laterFirst && { laterFirst }),
        realtimeSources: arrivals.realtimeSources,
      };
    }),
  );
  stops.sort((a, b) => a.walkDistanceM - b.walkDistanceM);
  return {
    origin: { lat, lon },
    radiusM,
    generatedAt: new Date().toISOString(),
    ...(!stops.length && { message: `No bus or rail stops within ${formatDistance(radiusM)}. Try a larger radius or search for a place.` }),
    stops,
    transitCenters: transitCentersNear(lat, lon),
  };
}

/** Beyond the 2-hour window, how far ahead a route's next departure is looked up. */
const LATER_FIRST_MS = 18 * 3600_000;

function firstLaterByRoute(stopIdx: number, routeIds: string[], running: Set<string>, now: number): Record<string, string> | undefined {
  const g = gtfs();
  let out: Record<string, string> | undefined;
  for (const routeId of routeIds) {
    const routeIdx = g.routeIndex.get(routeId);
    if (running.has(routeId) || routeIdx === undefined) continue;
    const [first] = scheduledDepartures(stopIdx, now, now + LATER_FIRST_MS, { routeIdx: new Set([routeIdx]), limit: 1 });
    if (first) (out ??= {})[routeId] = new Date(first.epochMs).toISOString();
  }
  return out;
}

function groupByRoute(arrivals: Arrival[]): NearbyRoute[] {
  const groups = new Map<string, NearbyRoute>();
  for (const a of arrivals) {
    const key = `${a.routeId}|${a.directionLabel}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        routeId: a.routeId,
        name: a.routeShortName,
        color: a.routeColor,
        textColor: a.routeTextColor,
        directionLabel: a.directionLabel,
        headsign: a.headsign,
        ...(a.bay && { bay: a.bay }),
        departures: [],
      };
      groups.set(key, g);
    }
    if (g.departures.length < 2) {
      const { departureTime, minutesAway, isRealtime, delaySeconds, canceled, tripId, source } = a;
      g.departures.push({ departureTime, minutesAway, isRealtime, delaySeconds, canceled, tripId, source });
    }
  }
  return [...groups.values()];
}
