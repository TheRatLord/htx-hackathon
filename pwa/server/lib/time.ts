import { config } from "../config.ts";

const fmt = new Intl.DateTimeFormat("en-US", {
  timeZone: config.timezone,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

interface LocalParts {
  y: number;
  m: number;
  d: number;
  hh: number;
  mm: number;
  ss: number;
}

function localParts(epochMs: number): LocalParts {
  const p = Object.fromEntries(fmt.formatToParts(new Date(epochMs)).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, hh: +p.hour, mm: +p.minute, ss: +p.second };
}

/** Houston's UTC offset in ms at a given instant (negative, e.g. -5h in CDT). */
function offsetMs(epochMs: number): number {
  const p = localParts(epochMs);
  return Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm, p.ss) - Math.floor(epochMs / 1000) * 1000;
}

/** Local calendar date "YYYYMMDD" in Houston. */
export function localDate(epochMs: number): string {
  const p = localParts(epochMs);
  return `${p.y}${String(p.m).padStart(2, "0")}${String(p.d).padStart(2, "0")}`;
}

export function addDays(yyyymmdd: string, n: number): string {
  const d = new Date(Date.UTC(+yyyymmdd.slice(0, 4), +yyyymmdd.slice(4, 6) - 1, +yyyymmdd.slice(6, 8) + n));
  return d.toISOString().slice(0, 10).replaceAll("-", "");
}

/** Day of week, 0 = Monday (GTFS calendar column order). */
export function weekdayIndex(yyyymmdd: string): number {
  const d = new Date(Date.UTC(+yyyymmdd.slice(0, 4), +yyyymmdd.slice(4, 6) - 1, +yyyymmdd.slice(6, 8)));
  return (d.getUTCDay() + 6) % 7;
}

/** GTFS service-day origin: local noon minus 12h (correct across DST changes). */
export function serviceDayStart(yyyymmdd: string): number {
  const noonUtc = Date.UTC(+yyyymmdd.slice(0, 4), +yyyymmdd.slice(4, 6) - 1, +yyyymmdd.slice(6, 8), 12);
  return noonUtc - offsetMs(noonUtc) - 12 * 3600 * 1000;
}

/** "5:42 PM" in Houston time. */
export function formatClock(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString("en-US", { timeZone: config.timezone, hour: "numeric", minute: "2-digit" });
}
