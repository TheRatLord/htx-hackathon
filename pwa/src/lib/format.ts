// Display formatting for times, distances and stop lines (spec C.2, C.5a).

import { formatDistance as formatDistanceEn } from "../../server/lib/geo.ts";
import type { Dep, RouteRef, Status } from "../api/types.ts";
import { hasKey, t, type Lang } from "../i18n/index.ts";
import { localiseSide } from "./i18nServer.ts";
import { canMakeIt } from "./walk.ts";

/** Every clock and date is shown in Houston time. */
export const TIME_ZONE = "America/Chicago";
const locale = (lang: Lang) => (lang === "es" ? "es-US" : "en-US");
/** Departures more than this far in the past are dropped from every list. */
const PAST_GRACE_MS = 60_000;

/** One formatter per language, built on first use. */
function formats(options: Intl.DateTimeFormatOptions): (lang: Lang) => Intl.DateTimeFormat {
  const built: Partial<Record<Lang, Intl.DateTimeFormat>> = {};
  return (lang) => (built[lang] ??= new Intl.DateTimeFormat(locale(lang), { timeZone: TIME_ZONE, ...options }));
}

const clockFormat = formats({ hour: "numeric", minute: "2-digit" });
const weekdayFormat = formats({ weekday: "short" });
const hourFormat = formats({ hour: "numeric" });
const serviceDateFormat = formats({ weekday: "short", month: "short", day: "numeric" });
const dateFormat = formats({ month: "short", day: "numeric" });

/** "3 hr 17 min", "45 min", "2 hr". */
export function formatDuration(mins: number, tr: (key: string, vars?: Record<string, string | number>) => string = (k, v) => t(k, v)): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!h) return tr("time.min", { n: m });
  return m ? tr("time.hrMin", { h, m }) : tr("time.hr", { h });
}

/** A bus last seen longer ago than this is drawn grey and labelled "Last seen N min ago" (map and route timeline). */
export const STALE_VEHICLE_S = 120;

/** Whole minutes since `ms` (never negative): the one rounding for "last seen 2 min ago" everywhere. */
export function ageMinutes(ms: number, now: number): number {
  return Math.max(0, Math.floor((now - ms) / 60_000));
}

/** "7:05 PM" in Houston time, no leading zero. */
export function formatClock(iso: string, lang: Lang): string {
  return clockFormat(lang).format(new Date(iso));
}

/** "Sat 5:12 AM": the next day with service (D6's empty strip, D7's empty state). */
export function formatDayTime(iso: string, lang: Lang): string {
  return `${weekdayFormat(lang).format(new Date(iso))} ${formatClock(iso, lang)}`;
}

const hour24Format = formats({ hour: "numeric", hourCycle: "h23" });

/**
 * The first bus of the morning: over an hour away and before 7 AM Houston time (late night,
 * "First bus 4:20 AM"). A long daytime gap is not called "first".
 */
export function isFirstBus(iso: string, now: number): boolean {
  if (Date.parse(iso) - now < 60 * 60_000) return false;
  return Number(hour24Format("en").format(new Date(iso))) < 7;
}

/** "7 PM": an hour label (D7's grid). */
export function formatHour(ms: number, lang: Lang): string {
  return hourFormat(lang).format(new Date(ms));
}

/** A GTFS service date ("20260925") as "Fri, Sep 25". */
export function formatServiceDate(serviceDate: string, lang: Lang): string {
  const [y, m, d] = [serviceDate.slice(0, 4), serviceDate.slice(4, 6), serviceDate.slice(6, 8)].map(Number);
  // Noon UTC is the same calendar day in Houston.
  return serviceDateFormat(lang).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

export function statusOf(dep: Pick<Dep, "canceled" | "isRealtime" | "source">): Status {
  if (dep.canceled) return "canceled";
  if (dep.isRealtime && dep.source === "simulated") return "simulated";
  return dep.isRealtime ? "live" : "scheduled";
}

type Shown = { kind: "now" } | { kind: "min"; m: number } | { kind: "clock" };

/**
 * The one rule for showing a departure: "Now" (live only), "16 min" under an hour,
 * otherwise the clock time. Offline, always the clock time (the cache may be old).
 * A scheduled time never says "Now": the bus may already have gone.
 */
function shown(departureTime: string, now: number, opts: { offline?: boolean; clock?: boolean; status: Status }): Shown {
  const diff = Date.parse(departureTime) - now;
  const realtime = opts.status === "live" || opts.status === "simulated";
  // A scheduled bus still ahead but under a minute away is "1 min", never its clock time
  // ("12:01 PM" at 12:00:30 beside "8 min" read as two formats for one thing).
  const m = !realtime && diff > 0 ? Math.max(1, Math.floor(diff / 60_000)) : Math.floor(diff / 60_000);
  if (opts.offline || m >= 60 || (m <= 0 && !realtime) || (opts.clock && m > 0)) return { kind: "clock" };
  return m <= 0 ? { kind: "now" } : { kind: "min", m };
}

/** True when the departure displays as a clock time ("8:05 PM") rather than "Now" or minutes. */
export function showsClock(dep: Dep, now: number, offline?: boolean): boolean {
  return shown(dep.departureTime, now, { offline, status: statusOf(dep) }).kind === "clock";
}

export function formatDeparture(departureTime: string, now: number, opts: { offline?: boolean; clock?: boolean; status: Status; lang: Lang }): string {
  const s = shown(departureTime, now, opts);
  if (s.kind === "clock") return formatClock(departureTime, opts.lang);
  return s.kind === "now" ? t("time.now", undefined, opts.lang) : t("time.min", { n: s.m }, opts.lang);
}

/**
 * THE time rule, the same on every card, strip, sheet and step (no legend needed: the unit says
 * which is which): a bus under an hour away is "N min", one an hour or more away is its clock
 * time with a small "PM" ("1:02 PM"). Each time follows the rule on its own, so a row can read
 * "2 min · 1:02 PM": the second bus is an hour off, and the small PM says it is a time of day.
 * Offline every time is a clock time (the cache may be old). A row never switches a time under an
 * hour to its clock time because a later bus is far off ("12:37 PM" for a bus 37 min away beside
 * "52 min" on the strip was two rules for one thing).
 *
 * Kept as a function so every row goes through one place; `clock` is always false now.
 */
export function clockRow<T extends Dep>(shown: T[], _now: number, _offline: boolean): { deps: T[]; clock: boolean } {
  return { deps: shown, clock: false };
}

export interface DepartureView {
  /** Offline, every time is shown as scheduled. */
  status: Status;
  text: string;
  /** The rider can't walk there in time ("Leaves before you get there"); canceled wins. */
  tooSoon: boolean;
}

/** How one departure displays, for TimeValue and every accessible label (C.2). */
export function departureView(dep: Dep, now: number, opts: { walkMin?: number; offline?: boolean; clock?: boolean; lang: Lang }): DepartureView {
  const status = opts.offline ? "scheduled" : statusOf(dep);
  const tooSoon = opts.walkMin !== undefined && status !== "canceled" && canMakeIt(opts.walkMin, dep, now) === "no";
  return { status, text: formatDeparture(dep.departureTime, now, { offline: opts.offline, clock: opts.clock, status, lang: opts.lang }), tooSoon };
}

/**
 * The spoken form of a departure: "16 minutes, Live", "7:02 PM, Leaves before you get there".
 * Scheduled is the unmarked default; `markScheduled` says it anyway (the LiveStrip's "16 minutes, scheduled").
 */
export function departureA11y(dep: Dep, now: number, opts: { walkMin?: number; offline?: boolean; clock?: boolean; markScheduled?: boolean; lang: Lang }): string {
  const { lang } = opts;
  const view = departureView(dep, now, opts);
  const s = shown(dep.departureTime, now, { offline: opts.offline, clock: opts.clock, status: view.status });
  const value = s.kind === "min" ? t("time.minutesA11y", { count: s.m }, lang) : view.text;
  const word = view.tooSoon
    ? t("status.tooSoon", undefined, lang)
    : view.status !== "scheduled" || opts.markScheduled
      ? t(`status.${view.status}`, undefined, lang)
      : "";
  return word ? `${value}, ${word}` : value;
}

/**
 * Drops departures more than 60s past, keeping the input order. A scheduled time (isRealtime
 * false) is dropped as soon as it passes: only a live bus can still be "Now", and a passed
 * scheduled time would show as a clock time beside minutes ("12:00 PM" at 12:00:05).
 */
export function upcoming<T extends { departureTime: string; isRealtime?: boolean }>(deps: T[], now: number): T[] {
  return deps.filter((d) => {
    const at = Date.parse(d.departureTime);
    return d.isRealtime === false ? at > now : at >= now - PAST_GRACE_MS;
  });
}

/** "250 ft" / "0.1 mi" (es: "250 pies"). Always use this rather than the server's distanceText. */
export function formatDistance(m: number, lang: Lang): string {
  const [n, unit] = formatDistanceEn(m).split(" ");
  return t(`units.${unit}`, { n }, lang);
}

/**
 * An alert's active period: "Until Oct 3", "From Sep 25 until Oct 3" or "Ongoing". `withTime`
 * adds the start's clock time ("From Sep 25, 5:00 AM until Oct 3", D15).
 */
export function formatDateRange(from: string | null | undefined, until: string | null | undefined, lang: Lang, opts: { withTime?: boolean } = {}): string {
  const d = (iso: string) => dateFormat(lang).format(new Date(iso));
  const start = (iso: string) => (opts.withTime ? `${d(iso)}, ${formatClock(iso, lang)}` : d(iso));
  if (from && until) return t("alert.fromUntil", { from: start(from), until: d(until) }, lang);
  if (until) return t("alert.until", { until: d(until) }, lang);
  if (from) return t("alert.from", { from: start(from) }, lang);
  return t("alert.ongoing", undefined, lang);
}

export interface SideLineStop {
  directionLabel?: string;
  side?: string;
  kind: string;
}

/**
 * The line under a stop name: "North side of Lamar St" on every card and sheet ("On the" added a
 * word and, at 360dp or Extra large, a line). The stop's own compass word ("Westbound stop") is not
 * shown: it is the direction of the street, and contradicted the route's ("NORTHBOUND to N SHEPHERD")
 * at corners where buses turn. `withCompass` is kept for callers; both read the same now.
 */
export function sideLine(stop: SideLineStop, opts: { withCompass: boolean; lang: Lang }): string {
  const { lang } = opts;
  if (stop.kind === "rail") return t("stopLine.railStation", undefined, lang);
  return stop.side ? localiseSide(stop.side, lang) : "";
}

/**
 * A stop card's title, "Westheimer Rd @ Montrose Blvd (2958)", with the stop number kept on the
 * last word's line: "(2958)" alone on a line read as a different stop.
 */
/** A cross street this short wraps as one piece: "Fannin St @ / McKinney St (246)", never "McKinney / St (246)". */
const KEEP_CROSS_STREET = 20;

export function stopTitle(name: string, id: string, lang: Lang): string {
  const title = t("stopLine.title", { name, id }, lang).replace(/ \(([^()]+)\)$/, "\u00a0($1)");
  const at = title.lastIndexOf(" @ ");
  if (at < 0) return title;
  const tail = title.slice(at + 3);
  return tail.length <= KEEP_CROSS_STREET ? `${title.slice(0, at + 3)}${tail.replace(/ /g, "\u00a0")}` : title;
}

/** "Eastbound" (es "Hacia el este") for a direction label; unknown labels stay as METRO wrote them. */
export function directionWord(label: string, lang: Lang): string {
  const key = `dir.${label}`;
  return hasKey(key, lang) ? t(key, undefined, lang) : label;
}

/** "FANNIN SOUTH" for "METRORail - FANNIN SOUTH": rail headsigns repeat the system name. */
export function displayHeadsign(headsign: string): string {
  return headsign.replace(/^METRORail\s*-\s*/i, "");
}

/**
 * "NORTHBOUND to N SHEPHERD P&R" (bus) or "to FANNIN SOUTH" (rail, whose direction labels are
 * unreliable). `short` (Extra large text on a card) drops the "to" after a direction, as on the
 * bus's own sign: "NORTHBOUND N SHEPHERD P&R", one line fewer per route at 360dp.
 */
export function headsignLine(route: Pick<RouteRef, "mode">, directionLabel: string, headsign: string, lang: Lang, opts: { short?: boolean } = {}): string {
  const dest = displayHeadsign(headsign).toUpperCase();
  const to = `${t("headsign.to", undefined, lang)} ${dest}`;
  if (route.mode === "rail" || !directionLabel) return to;
  return `${directionWord(directionLabel, lang).toUpperCase()} ${opts.short ? dest : to}`;
}

/** A transit-center platform's short name: "Northwest Transit Center - Platform 2" → "Platform 2", else "Stop #79" (C.14). */
export function platformLabel(stop: { id: string; name: string }, lang: Lang): string {
  return stop.name.split(" - ")[1] ?? t("card.stopNumber", { id: stop.id }, lang);
}
