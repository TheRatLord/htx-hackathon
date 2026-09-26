// A route's whole scheduled service day at one stop (for the hourly grid), plus
// the next trip after now (for "First bus 5:47 AM" or "Next bus Sat 5:12 AM").

import { scheduledDepartures } from "../gtfs/schedule.ts";
import { findRoute, findStop, gtfs } from "../gtfs/store.ts";
import { addDays, localDate, serviceDayStart } from "../lib/time.ts";
import { ApiError } from "./errors.ts";

const MAX_DEPARTURES = 300;
const LOOKAHEAD_DAYS = 7;
/** GTFS service days run past midnight (times like 26:30), so scan well beyond 24h. */
const SERVICE_DAY_SPAN_MS = 36 * 3600_000;

export interface StopSchedule {
  stopId: string;
  routeId: string;
  serviceDate: string;
  departures: { departureTime: string }[];
  /**
   * The next scheduled trip after `now`: later today when the current service day still has one
   * (after midnight, before the first morning bus), otherwise the first trip of the next day
   * with service. `serviceDate` equal to the response's `serviceDate` means "today".
   */
  nextServiceFirst: { serviceDate: string; departureTime: string } | null;
}

function departuresOn(stopIdx: number, routeIdx: number, serviceDate: string): number[] {
  const from = serviceDayStart(serviceDate);
  return scheduledDepartures(stopIdx, from, from + SERVICE_DAY_SPAN_MS, { routeIdx: new Set([routeIdx]) })
    .filter((d) => d.serviceDate === serviceDate)
    .map((d) => d.epochMs);
}

/**
 * `date` (a GTFS service date, "20260926") asks for that day's schedule instead of today's (D7's
 * Weekday / Saturday / Sunday tabs). `nextServiceFirst` is always relative to now, and is left
 * out (null) for a date other than the current service day.
 */
const DATE_BACK_DAYS = 7;
const DATE_AHEAD_DAYS = 60;

/** "20260926" and a real day (not "20261399"). */
function isCalendarDate(date: string): boolean {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(date);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

export function getStopSchedule(stopId: string, routeId: string, now = Date.now(), date?: string): StopSchedule {
  const g = gtfs();
  const stop = findStop(stopId);
  if (!stop) throw new ApiError(404, "STOP_NOT_FOUND", `We couldn't find stop #${stopId}. Check the number on the stop sign.`);
  const route = findRoute(routeId);
  if (!route) throw new ApiError(404, "ROUTE_NOT_FOUND", `Route ${routeId} doesn't exist.`);
  if (!stop.routeIds.includes(route.id))
    throw new ApiError(404, "STOP_NOT_ON_ROUTE", `Route ${route.displayName} doesn't stop at stop #${stop.id}.`);
  const stopIdx = g.stopIndex.get(stop.id)!;
  const routeIdx = g.routeIndex.get(route.id)!;

  // After midnight, yesterday's service day is still current while its late trips remain.
  const today = localDate(now);
  const yesterday = addDays(today, -1);
  const late = departuresOn(stopIdx, routeIdx, yesterday);
  const current = late.some((t) => t >= now) ? yesterday : today;
  if (date && date !== current) {
    if (!isCalendarDate(date)) throw new ApiError(400, "BAD_DATE", '"date" must be a service date like 20260926');
    // Only dates a rider would ask for (the D7 day tabs): a client can't fill the per-date service cache.
    if (date < addDays(today, -DATE_BACK_DAYS) || date > addDays(today, DATE_AHEAD_DAYS))
      throw new ApiError(400, "BAD_DATE", `"date" must be within ${DATE_AHEAD_DAYS} days of today`);
    const times = departuresOn(stopIdx, routeIdx, date);
    return {
      stopId: stop.id,
      routeId: route.id,
      serviceDate: date,
      departures: times.slice(0, MAX_DEPARTURES).map((t) => ({ departureTime: new Date(t).toISOString() })),
      nextServiceFirst: null,
    };
  }
  const serviceDate = current;
  const times = serviceDate === yesterday ? late : departuresOn(stopIdx, routeIdx, today);

  const laterToday = times.find((t) => t >= now);
  let nextServiceFirst: StopSchedule["nextServiceFirst"] =
    laterToday !== undefined ? { serviceDate, departureTime: new Date(laterToday).toISOString() } : null;
  for (let i = 1; i <= LOOKAHEAD_DAYS && !nextServiceFirst; i++) {
    const date = addDays(serviceDate, i);
    const first = departuresOn(stopIdx, routeIdx, date)[0];
    if (first !== undefined) nextServiceFirst = { serviceDate: date, departureTime: new Date(first).toISOString() };
  }

  return {
    stopId: stop.id,
    routeId: route.id,
    serviceDate,
    departures: times.slice(0, MAX_DEPARTURES).map((t) => ({ departureTime: new Date(t).toISOString() })),
    nextServiceFirst,
  };
}
