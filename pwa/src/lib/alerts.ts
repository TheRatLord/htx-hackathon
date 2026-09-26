// Alert matching and wording (spec C.11). Screens show alerts only through
// useAlerts() and AlertStatusLine; these are the pure parts.

import type { Alert, Itinerary } from "../api/types.ts";
import { hasKey, t, type Lang } from "../i18n/index.ts";
import { canonicalRouteId } from "./routes.ts";

export function effectWord(effect: string, lang: Lang): string {
  const key = `alert.effect.${effect}`;
  return t(hasKey(key, lang) ? key : "alert.effect.other", undefined, lang);
}

/** The alert header in `lang`, or English flagged so the UI can say "Available in English only". */
export function alertText(alert: Alert, field: "header" | "description", lang: Lang): { text: string; englishOnly: boolean } {
  const texts = alert[field];
  if (texts[lang]) return { text: texts[lang], englishOnly: false };
  const text = texts.en ?? Object.values(texts)[0] ?? "";
  return { text, englishOnly: lang !== "en" && Boolean(text) };
}

const sameRoute = (a: string, b: string) => canonicalRouteId(a) === canonicalRouteId(b);

export function alertsForRoute(alerts: Alert[], routeId: string): Alert[] {
  return alerts.filter((a) => a.routes.some((r) => sameRoute(r.routeId, routeId)));
}

/**
 * Whether an alert touches these stops or routes. An alert that names stops is about those stops
 * (its routes are the ones serving them there, as in a GTFS-RT informed entity with both a route
 * and a stop), so it matches only at those stops; an alert without stops is route-wide.
 */
function touches(a: Alert, stopIds: string[], routeIds: string[]): boolean {
  if (a.stopIds.length) return a.stopIds.some((s) => stopIds.includes(s));
  return a.routes.some((r) => routeIds.some((id) => sameRoute(r.routeId, id)));
}

/** The stop's own alerts plus route-wide alerts on any route serving it (not another stop's alert). */
export function alertsForStop(alerts: Alert[], stopId: string, routeIds: string[]): Alert[] {
  return alerts.filter((a) => touches(a, [stopId], routeIds));
}

/** Route-wide alerts on any ridden route, and alerts at any boarding or alighting stop. */
export function alertsForItinerary(alerts: Alert[], it: Itinerary): Alert[] {
  const rides = it.legs.filter((l) => l.type === "transit");
  const routeIds = rides.map((l) => l.route.id);
  const stopIds = rides.flatMap((l) => [l.board.id, l.alight.id]).filter((id): id is string => Boolean(id));
  return alerts.filter((a) => touches(a, stopIds, routeIds));
}
