// Day-level dates for the Stop sheet and Full Schedule ("Sat 5:12 AM", "Fri, Sep 25", "7 PM").
// The time zone and locales repeat lib/format.ts's private ones until it exports these
// formatters (requests.md); nothing else in module A declares them.

import type { Lang } from "../../../i18n/index.ts";
import { formatClock } from "../../../lib/format.ts";

export const TIME_ZONE = "America/Chicago";
const locale = (lang: Lang) => (lang === "es" ? "es-US" : "en-US");

/** "Sat 5:12 AM": the next day with service, for the empty strip and D7's empty state. */
export function formatDayTime(iso: string, lang: Lang): string {
  const day = new Intl.DateTimeFormat(locale(lang), { timeZone: TIME_ZONE, weekday: "short" }).format(new Date(iso));
  return `${day} ${formatClock(iso, lang)}`;
}

/** A GTFS service date ("20260925") as "Fri, Sep 25". */
export function formatServiceDate(serviceDate: string, lang: Lang): string {
  const [y, m, d] = [serviceDate.slice(0, 4), serviceDate.slice(4, 6), serviceDate.slice(6, 8)].map(Number);
  // Noon UTC is the same calendar day in Houston.
  return new Intl.DateTimeFormat(locale(lang), { timeZone: TIME_ZONE, weekday: "short", month: "short", day: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, d, 12)),
  );
}

/** "7 PM", the hour label of D7's grid. */
export const hourFormat = (lang: Lang) => new Intl.DateTimeFormat(locale(lang), { timeZone: TIME_ZONE, hour: "numeric" });
