// The rider's own location as a trip's start (spec D11). It is kept as `from=<lat,lon>` without a
// `fromName`, so it is always shown in the current language. Older links and recents carry the name
// itself, in the language of the moment, so those names count too.

import { t, type Lang } from "../../i18n/index.ts";
import { parseLatLon } from "../../lib/geo.ts";
import type { PlanQuery } from "../../lib/planQuery.ts";

const LANGS: Lang[] = ["en", "es"];

export function fromIsRider(q: PlanQuery): boolean {
  if (!q.fromName) return Boolean(parseLatLon(q.from));
  return LANGS.some((lang) => q.fromName === t("common.myLocation", undefined, lang));
}

/** The From place as the rider reads it: "My current location" (localised), a name, or the raw value. */
export function fromLabel(q: PlanQuery, lang: Lang): string {
  return fromIsRider(q) ? t("common.myLocation", undefined, lang) : (q.fromName ?? q.from ?? "");
}
