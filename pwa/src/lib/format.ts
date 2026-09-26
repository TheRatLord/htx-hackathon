// Display formatting for times, distances and stop lines (spec C.2, C.5a).

import { formatDistance as formatDistanceEn } from "../../server/lib/geo.ts";
import type { Dep, RouteRef, Status } from "../api/types.ts";
import { hasKey, t, type Lang } from "../i18n/index.ts";
import { localiseSide, sideDirection } from "./i18nServer.ts";

const TIME_ZONE = "America/Chicago";
/** Departures more than this far in the past are dropped from every list. */
const PAST_GRACE_MS = 60_000;

const clockFormats: Record<Lang, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit" }),
  es: new Intl.DateTimeFormat("es-US", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit" }),
};

/** "7:05 PM" in Houston time, no leading zero. */
export function formatClock(iso: string, lang: Lang): string {
  return clockFormats[lang].format(new Date(iso));
}

export function statusOf(dep: Pick<Dep, "canceled" | "isRealtime" | "source">): Status {
  if (dep.canceled) return "canceled";
  if (dep.isRealtime && dep.source === "simulated") return "simulated";
  return dep.isRealtime ? "live" : "scheduled";
}

/**
 * The one rule for showing a departure: "Now" (live only), "16 min" under an hour,
 * otherwise the clock time. Offline, always the clock time (the cache may be old).
 * A scheduled time never says "Now": the bus may already have gone.
 */
export function formatDeparture(departureTime: string, now: number, opts: { offline?: boolean; status: Status; lang: Lang }): string {
  const m = Math.floor((Date.parse(departureTime) - now) / 60_000);
  const realtime = opts.status === "live" || opts.status === "simulated";
  if (opts.offline || m >= 60 || (m <= 0 && !realtime)) return formatClock(departureTime, opts.lang);
  if (m <= 0) return t("time.now", undefined, opts.lang);
  return t("time.min", { n: m }, opts.lang);
}

/** Drops departures more than 60s past, keeping the input order. */
export function upcoming<T extends { departureTime: string }>(deps: T[], now: number): T[] {
  return deps.filter((d) => Date.parse(d.departureTime) >= now - PAST_GRACE_MS);
}

/** "250 ft" / "0.1 mi" (es: "250 pies"). Always use this rather than the server's distanceText. */
export function formatDistance(m: number, lang: Lang): string {
  const [n, unit] = formatDistanceEn(m).split(" ");
  return t(`units.${unit}`, { n }, lang);
}

const dateFormats: Record<Lang, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, month: "short", day: "numeric" }),
  es: new Intl.DateTimeFormat("es-US", { timeZone: TIME_ZONE, month: "short", day: "numeric" }),
};

/** An alert's active period: "Until Oct 3", "From Sep 25 until Oct 3" or "Ongoing". */
export function formatDateRange(from: string | null | undefined, until: string | null | undefined, lang: Lang): string {
  const d = (iso: string) => dateFormats[lang].format(new Date(iso));
  if (from && until) return t("alert.fromUntil", { from: d(from), until: d(until) }, lang);
  if (until) return t("alert.until", { until: d(until) }, lang);
  if (from) return t("alert.from", { from: d(from) }, lang);
  return t("alert.ongoing", undefined, lang);
}

export interface SideLineStop {
  directionLabel?: string;
  side?: string;
  kind: string;
}

/**
 * The line under a stop name. Without the compass word ("On the north side of Lamar St") where
 * a route line on the same card already gives the direction; with it ("Westbound stop · North
 * side of Lamar St") where no route line is shown.
 */
export function sideLine(stop: SideLineStop, opts: { withCompass: boolean; lang: Lang }): string {
  const { lang } = opts;
  if (stop.kind === "rail") return t("stopLine.railStation", undefined, lang);
  if (!opts.withCompass) {
    const parsed = stop.side ? sideDirection(stop.side) : undefined;
    if (parsed) return t(`sideOn.${parsed.dir}`, { street: parsed.street }, lang);
    return stop.side ? localiseSide(stop.side, lang) : "";
  }
  const compassKey = `compassStop.${stop.directionLabel}`;
  const compass = hasKey(compassKey, lang) ? t(compassKey, undefined, lang) : "";
  const side = stop.side ? localiseSide(stop.side, lang) : "";
  return [compass, side].filter(Boolean).join(" · ");
}

/** "NORTHBOUND to N SHEPHERD P&R" (bus) or "to METRORAIL - FANNIN SOUTH" (rail, whose direction labels are unreliable). */
export function headsignLine(route: Pick<RouteRef, "mode">, directionLabel: string, headsign: string, lang: Lang): string {
  const to = `${t("headsign.to", undefined, lang)} ${headsign.toUpperCase()}`;
  if (route.mode === "rail" || !directionLabel) return to;
  const dirKey = `dir.${directionLabel}`;
  const dir = hasKey(dirKey, lang) ? t(dirKey, undefined, lang) : directionLabel;
  return `${dir.toUpperCase()} ${to}`;
}
