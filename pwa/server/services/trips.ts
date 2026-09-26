import { activeServices, stopTimeOf } from "../gtfs/schedule.ts";
import { findStop, gtfs, tripInfo } from "../gtfs/store.ts";
import { addDays, localDate, serviceDayStart } from "../lib/time.ts";
import { ApiError } from "./errors.ts";

/** A trip's stops (optionally only those after `fromStopId`) with scheduled times, for "N stops left" UIs. */
export function getTrip(tripId: string, fromStopId?: string, now = Date.now()) {
  const g = gtfs();
  const ti = g.tripIndex.get(tripId);
  if (ti === undefined) throw new ApiError(404, "TRIP_NOT_FOUND", `Trip ${tripId} isn't in the current schedule.`);
  const info = tripInfo(ti);
  const start = g.st.tripOff[ti];
  const end = g.st.tripOff[ti + 1];
  let from = start;
  if (fromStopId) {
    const stop = findStop(fromStopId);
    const k = stop ? stopTimeOf(ti, g.stopIndex.get(stop.id)!) : -1;
    if (k < 0) throw new ApiError(404, "STOP_NOT_ON_TRIP", `Stop #${fromStopId} isn't on this trip.`);
    from = k;
  }
  // The trip's service day: today's if it runs today and hasn't long finished, else yesterday's (after-midnight runs).
  const today = localDate(now);
  const serviceDate =
    [today, addDays(today, -1)].find(
      (d) => activeServices(d)[g.meta.trips.service[ti]] && serviceDayStart(d) + g.st.stTime[end - 1] * 1000 > now - 3600_000,
    ) ?? today;
  const origin = serviceDayStart(serviceDate);
  const stops = [];
  for (let k = from; k < end; k++) {
    const s = g.stops[g.st.stStop[k]];
    stops.push({
      id: s.id,
      name: s.name,
      ...(s.dir && { directionLabel: s.dir }),
      lat: s.lat,
      lon: s.lon,
      scheduledTime: new Date(origin + g.st.stTime[k] * 1000).toISOString(),
      stopsAway: k - from,
    });
  }
  return {
    tripId,
    serviceDate,
    route: { id: info.route.id, name: info.route.displayName, color: info.route.color, textColor: info.route.textColor },
    headsign: info.headsign,
    directionLabel: info.directionLabel,
    stops,
  };
}
