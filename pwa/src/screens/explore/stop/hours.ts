// D7's hourly grid: departures grouped by clock hour in Houston, in service-day order.

import type { Lang } from "../../../i18n/index.ts";
import { hourFormat, TIME_ZONE } from "./when.ts";

export interface HourRow {
  /** Calendar date and hour in Houston, so 12 AM after midnight stays apart from 12 AM before. */
  key: string;
  label: string;
  minutes: string[];
  startMs: number;
}

const partsFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function hourKey(ms: number): { key: string; minute: string } {
  const p = Object.fromEntries(partsFormat.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { key: `${p.year}-${p.month}-${p.day} ${p.hour}`, minute: p.minute };
}

/** "7 PM": 05 35. Service after midnight stays at the end, as on printed schedules. */
export function hourRows(departures: { departureTime: string }[], lang: Lang): HourRow[] {
  const label = hourFormat(lang);
  const rows: HourRow[] = [];
  for (const d of departures) {
    const ms = Date.parse(d.departureTime);
    const { key, minute } = hourKey(ms);
    let row = rows.at(-1);
    if (row?.key !== key) {
      row = { key, label: label.format(new Date(ms)), minutes: [], startMs: ms };
      rows.push(row);
    }
    row.minutes.push(minute);
  }
  return rows;
}
