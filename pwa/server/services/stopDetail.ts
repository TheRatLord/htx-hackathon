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

/** The TC board's window ("No buses in the next 90 minutes") and how far past it a route's next buses are looked up. */
const TC_WINDOW_MIN = 90;
const TC_LOOKAHEAD_MIN = 180;

export async function getTransitCenterDetail(id: string, now = Date.now()) {
  const tc = transitCenters().find((t) => t.id === id || t.stopIds.includes(id));
  if (!tc) throw new ApiError(404, "TRANSIT_CENTER_NOT_FOUND", `No transit center called "${id}".`);
  // A high limit so busy platforms are never cut off inside the window; `windowEnd` says what the window covered.
  const results = await Promise.all(tc.stopIds.map((s) => getArrivals(s, { limit: 300, horizonMin: TC_LOOKAHEAD_MIN, now })));
  const all = results.flatMap((r) => r.arrivals.map((a) => ({ ...a, stopId: r.stopId })));
  const windowEndMs = now + TC_WINDOW_MIN * 60_000;
  const departures = all.filter((d) => Date.parse(d.departureTime) <= windowEndMs);
  const lastMs = Math.max(...departures.map((d) => Date.parse(d.departureTime)));
  return {
    ...tc,
    bays: tc.bays.map((b) => {
      const atBay = (d: (typeof all)[number]) => d.stopId === b.stopId && d.bay === b.bay;
      const shown = departures.filter(atBay).slice(0, 4);
      // Each route listed gets up to 3 departures, past the window if need be: an hourly route
      // shows "59 min · 1:59 PM" like every other row, and still two times when the first can't be
      // reached in time.
      const count = new Map<string, number>();
      for (const d of shown) count.set(`${d.routeId}|${d.directionLabel}`, (count.get(`${d.routeId}|${d.directionLabel}`) ?? 0) + 1);
      const later = all.filter((d) => {
        const key = `${d.routeId}|${d.directionLabel}`;
        const n = count.get(key);
        if (!atBay(d) || shown.includes(d) || n === undefined || n >= 3) return false;
        count.set(key, n + 1);
        return true;
      });
      return { ...b, departures: [...shown, ...later] };
    }),
    unassignedDepartures: departures.filter((d) => !d.bay).slice(0, 10),
    // Platform names for the bay diagram ("Northwest Transit Center - Platform 2"), so a cold
    // visit needs no stops.json.
    platforms: tc.stopIds.map((stopId) => ({ stopId, name: findStop(stopId)?.name ?? null })),
    windowEnd: departures.length ? new Date(lastMs).toISOString() : null,
    source: tc.source,
    realtimeSources: results[0]?.realtimeSources ?? [],
  };
}
