// METRO GTFS-RT TripUpdates (protobuf, ~900 KB, refreshed every 30 s).

import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { config } from "../config.ts";
import { TtlCache } from "../lib/cache.ts";
import { failureBackoff, fetchUpstream, metroKeyHeader } from "../lib/upstream.ts";

const URL_BASE = "https://api.ridemetro.org/GtfsRealtime/TripUpdates";
const { FeedMessage, TripDescriptor, TripUpdate } = GtfsRealtimeBindings.transit_realtime;

export interface StopUpdate {
  seq?: number;
  /** GTFS stop id with any bay suffix removed. */
  stopId?: string;
  bay?: string;
  timeMs?: number;
  delaySec?: number;
  skipped: boolean;
}

export interface TripRealtime {
  canceled: boolean;
  updates: StopUpdate[];
}

const cache = new TtlCache<Map<string, TripRealtime>>(30_000, 1);

export const hasTripUpdates = () => Boolean(config.metroApiKey) && !config.offline;

/** After a failed load, the feed isn't asked again for this long. */
const guarded = failureBackoff("metro-tripupdates", 45_000);

export function tripUpdates(): Promise<Map<string, TripRealtime>> {
  return cache.get("feed", () => guarded(async () => {
    const { body } = await fetchUpstream<Uint8Array>({
      service: "metro-tripupdates",
      url: URL_BASE,
      headers: metroKeyHeader(config.metroApiKey),
      fixtureKey: "tripupdates",
      binary: true,
      timeoutMs: 10_000,
    });
    return parseFeed(body);
  }));
}

function parseFeed(buf: Uint8Array): Map<string, TripRealtime> {
  const feed = FeedMessage.decode(buf);
  const out = new Map<string, TripRealtime>();
  for (const e of feed.entity) {
    const tu = e.tripUpdate;
    const tripId = tu?.trip?.tripId;
    if (!tu || !tripId) continue;
    out.set(tripId, {
      canceled: tu.trip.scheduleRelationship === TripDescriptor.ScheduleRelationship.CANCELED,
      updates: (tu.stopTimeUpdate ?? []).map((u) => {
        const [stopId, bay] = (u.stopId ?? "").split("_");
        const ev = u.departure ?? u.arrival;
        return {
          seq: u.stopSequence ?? undefined,
          stopId: stopId || undefined,
          bay,
          timeMs: ev?.time ? Number(ev.time) * 1000 : undefined,
          delaySec: ev?.delay ?? undefined,
          skipped: u.scheduleRelationship === TripUpdate.StopTimeUpdate.ScheduleRelationship.SKIPPED,
        };
      }),
    });
  }
  return out;
}

/**
 * Prediction for one stop of a trip. GTFS-RT delays propagate downstream, so a
 * stop without its own update inherits the delay of the closest earlier update.
 */
export function predictionFor(rt: TripRealtime, stopId: string, stopPosition: number, scheduledMs: number) {
  const exact = rt.updates.find((u) => u.stopId === stopId);
  if (exact) {
    const timeMs = exact.timeMs ?? scheduledMs + (exact.delaySec ?? 0) * 1000;
    return { timeMs, delaySec: Math.round((timeMs - scheduledMs) / 1000), bay: exact.bay, skipped: exact.skipped };
  }
  const earlier = rt.updates.filter((u) => u.seq !== undefined && u.seq <= stopPosition && u.delaySec !== undefined);
  const ref = earlier.at(-1) ?? rt.updates.find((u) => u.delaySec !== undefined);
  if (!ref) return null;
  return { timeMs: scheduledMs + ref.delaySec! * 1000, delaySec: ref.delaySec!, bay: undefined, skipped: false };
}
