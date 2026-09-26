import { addDays, localDate, serviceDayStart, weekdayIndex } from "../lib/time.ts";
import { gtfs } from "./store.ts";

const activeCache = new Map<string, Uint8Array>();

/** Which service ids (by index) run on a Houston calendar date. */
export function activeServices(date: string): Uint8Array {
  const cached = activeCache.get(date);
  if (cached) return cached;
  const { meta } = gtfs();
  const idx = new Map(meta.services.map((s, i) => [s, i]));
  const active = new Uint8Array(meta.services.length);
  const wd = weekdayIndex(date);
  for (const c of meta.calendar) {
    const i = idx.get(c.serviceId);
    if (i !== undefined && c.days[wd] && date >= c.start && date <= c.end) active[i] = 1;
  }
  for (const cd of meta.calendarDates) {
    const i = idx.get(cd.serviceId);
    if (i !== undefined && cd.date === date) active[i] = cd.type === 1 ? 1 : 0;
  }
  activeCache.set(date, active);
  return active;
}

export interface ScheduledDeparture {
  tripIdx: number;
  /** Index into the flat stop_times arrays. */
  stIdx: number;
  serviceDate: string;
  epochMs: number;
}

/** Departures from a stop in [fromMs, toMs), across service days (handles 25:xx times). */
export function scheduledDepartures(
  stopIdx: number,
  fromMs: number,
  toMs: number,
  opts: { routeIdx?: Set<number>; limit?: number } = {},
): ScheduledDeparture[] {
  const { st, stTrip, meta } = gtfs();
  const lo = st.depOff[stopIdx];
  const hi = st.depOff[stopIdx + 1];
  const today = localDate(fromMs);
  const out: ScheduledDeparture[] = [];
  for (const date of [addDays(today, -1), today, addDays(today, 1)]) {
    const origin = serviceDayStart(date);
    const active = activeServices(date);
    const fromSec = Math.floor((fromMs - origin) / 1000);
    const toSec = (toMs - origin) / 1000;
    let a = lo;
    let b = hi;
    while (a < b) {
      const mid = (a + b) >> 1;
      if (st.stTime[st.depRef[mid]] < fromSec) a = mid + 1;
      else b = mid;
    }
    for (let k = a; k < hi; k++) {
      const stIdx = st.depRef[k];
      const t = st.stTime[stIdx];
      if (t >= toSec) break;
      const tripIdx = stTrip[stIdx];
      if (!active[meta.trips.service[tripIdx]]) continue;
      if (opts.routeIdx && !opts.routeIdx.has(meta.trips.route[tripIdx])) continue;
      out.push({ tripIdx, stIdx, serviceDate: date, epochMs: origin + t * 1000 });
    }
  }
  out.sort((x, y) => x.epochMs - y.epochMs);
  return opts.limit ? out.slice(0, opts.limit) : out;
}

/** Position of a stop within a trip's stop_times, or -1. */
export function stopTimeOf(tripIdx: number, stopIdx: number): number {
  const { st } = gtfs();
  for (let k = st.tripOff[tripIdx]; k < st.tripOff[tripIdx + 1]; k++) if (st.stStop[k] === stopIdx) return k;
  return -1;
}
