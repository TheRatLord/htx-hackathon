// D7's Weekday / Saturday / Sunday choice: which GTFS service date each tab asks /stops/:id/schedule
// for (its `date` parameter). Today's date when today is that kind of day, else the next one.

import { TIME_ZONE } from "./format.ts";

export type DayKind = "weekday" | "saturday" | "sunday";

const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const DAY_MS = 86_400_000;

/** "20260925" for the Houston calendar day of `ms`. */
export function serviceDateOf(ms: number): string {
  return ymd.format(new Date(ms)).replaceAll("-", "");
}

export function dayKindOf(serviceDate: string): DayKind {
  const d = new Date(Date.UTC(+serviceDate.slice(0, 4), +serviceDate.slice(4, 6) - 1, +serviceDate.slice(6, 8), 12)).getUTCDay();
  return d === 6 ? "saturday" : d === 0 ? "sunday" : "weekday";
}

/** The service date for each tab, nearest first from `today` (a service date, e.g. the schedule's own). */
export function serviceDayTabs(today: string): Record<DayKind, string> {
  const base = Date.UTC(+today.slice(0, 4), +today.slice(4, 6) - 1, +today.slice(6, 8), 12);
  const out: Partial<Record<DayKind, string>> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(base + i * DAY_MS);
    const date = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
    out[dayKindOf(date)] ??= date;
  }
  return out as Record<DayKind, string>;
}
