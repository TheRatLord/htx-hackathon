import { findStop, gtfs, tripInfo } from "../gtfs/store.ts";
import { getAlerts } from "./alerts.ts";
import { getArrivals } from "./arrivals.ts";
import { ApiError } from "./errors.ts";
import { stopSummary } from "./present.ts";
import { bayFor, transitCenterForStop, transitCenters } from "./transitCenters.ts";

/** Route/direction/headsign combinations that board at a stop, busiest first. */
function servingPatterns(stopId: string) {
  const g = gtfs();
  const si = g.stopIndex.get(stopId)!;
  const counts = new Map<string, { tripIdx: number; trips: number }>();
  for (let k = g.st.depOff[si]; k < g.st.depOff[si + 1]; k++) {
    const ti = g.stTrip[g.st.depRef[k]];
    const t = g.meta.trips;
    const key = `${t.route[ti]}|${t.direction[ti]}|${t.headsign[ti]}`;
    const c = counts.get(key);
    if (c) c.trips++;
    else counts.set(key, { tripIdx: ti, trips: 1 });
  }
  return [...counts.values()]
    .sort((a, b) => b.trips - a.trips)
    .map(({ tripIdx }) => {
      const t = tripInfo(tripIdx);
      const bay = bayFor(stopId, t.route.id, t.directionId, t.headsign);
      return {
        routeId: t.route.id,
        name: t.route.displayName,
        longName: t.route.longName,
        color: t.route.color,
        textColor: t.route.textColor,
        directionId: t.directionId,
        directionLabel: t.directionLabel,
        headsign: t.headsign,
        ...(bay && { bay }),
      };
    });
}

export async function getStopDetail(id: string) {
  const stop = findStop(id);
  if (!stop) throw new ApiError(404, "STOP_NOT_FOUND", `We couldn't find stop #${id}. Check the number on the stop sign.`);
  const [arrivals, alerts] = await Promise.all([getArrivals(id, { limit: 12 }), getAlerts({ stopId: id })]);
  const tc = transitCenterForStop(id);
  return {
    stop: stopSummary(stop),
    description: stop.desc,
    serving: servingPatterns(id),
    ...(tc && { transitCenter: { id: tc.id, name: tc.name, source: tc.source } }),
    arrivals,
    alerts: alerts.alerts,
    alertsSource: alerts.source,
  };
}

export async function getTransitCenterDetail(id: string) {
  const tc = transitCenters().find((t) => t.id === id || t.stopIds.includes(id));
  if (!tc) throw new ApiError(404, "TRANSIT_CENTER_NOT_FOUND", `No transit center called "${id}".`);
  const results = await Promise.all(tc.stopIds.map((s) => getArrivals(s, { limit: 40, horizonMin: 90 })));
  const departures = results.flatMap((r) => r.arrivals.map((a) => ({ ...a, stopId: r.stopId })));
  return {
    ...tc,
    bays: tc.bays.map((b) => ({
      ...b,
      departures: departures.filter((d) => d.stopId === b.stopId && d.bay === b.bay).slice(0, 4),
    })),
    unassignedDepartures: departures.filter((d) => !d.bay).slice(0, 10),
    source: tc.source,
    realtimeSources: results[0]?.realtimeSources ?? [],
  };
}
