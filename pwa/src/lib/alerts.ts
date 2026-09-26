// Alert matching and wording (spec C.11). Screens show alerts only through
// useAlerts() and AlertStatusLine; these are the pure parts.

import type { Alert, Itinerary } from "../api/types.ts";
import { hasKey, t, type Lang } from "../i18n/index.ts";

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

const sameRoute = (a: string, b: string) => a === b || a.padStart(3, "0") === b.padStart(3, "0");

export function alertsForRoute(alerts: Alert[], routeId: string): Alert[] {
  return alerts.filter((a) => a.routes.some((r) => sameRoute(r.routeId, routeId)));
}

/** The stop's own alerts plus alerts on any route serving it. */
export function alertsForStop(alerts: Alert[], stopId: string, routeIds: string[]): Alert[] {
  return alerts.filter((a) => a.stopIds.includes(stopId) || a.routes.some((r) => routeIds.some((id) => sameRoute(r.routeId, id))));
}

/** Alerts on any ridden route, or at any boarding or alighting stop. */
export function alertsForItinerary(alerts: Alert[], it: Itinerary): Alert[] {
  const rides = it.legs.filter((l) => l.type === "transit");
  const routeIds = rides.map((l) => l.route.id);
  const stopIds = rides.flatMap((l) => [l.board.id, l.alight.id]).filter((id): id is string => Boolean(id));
  return alerts.filter((a) => a.stopIds.some((s) => stopIds.includes(s)) || a.routes.some((r) => routeIds.some((id) => sameRoute(r.routeId, id))));
}
