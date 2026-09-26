import type { Itinerary } from "../api/types.ts";
import fares from "../data/fares.json";
import { getLang, t } from "../i18n/index.ts";

/**
 * "Local fare $1.25 · Reduced fares ›" for itineraries on local bus and METRORail only.
 * Null when any ride is Park & Ride (its fare depends on the zone) or there is no ride.
 */
export function fareLine(it: Itinerary): { text: string; reducedHref: "/fares#reduced" } | null {
  const rides = it.legs.filter((l) => l.type === "transit");
  if (!rides.length || rides.some((l) => fares.parkAndRideRoutes.includes(l.route.id))) return null;
  const local = fares.items.find((i) => i.key === "local");
  if (!local) return null;
  return { text: t("fareLine.local", { price: local.value[getLang()] }), reducedHref: "/fares#reduced" };
}
