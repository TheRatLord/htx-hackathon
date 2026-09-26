import type { WalkStep } from "../../../api/types.ts";
import type { IconName } from "../../../ui/Icon.tsx";

const BY_MODIFIER: Partial<Record<NonNullable<WalkStep["modifier"]>, IconName>> = {
  left: "turn_left",
  "sharp left": "turn_left",
  "slight left": "turn_slight_left",
  right: "turn_right",
  "sharp right": "turn_right",
  "slight right": "turn_slight_right",
  uturn: "arrow_downward",
};

/** The 24dp maneuver icon of a walk step (D8). */
export function stepIcon(step: WalkStep): IconName {
  if (step.maneuver === "depart") return "arrow_upward";
  if (step.maneuver === "arrive") return "bus_stop";
  if (step.maneuver === "continue" || step.maneuver === "new name") return "straight";
  return (step.modifier && BY_MODIFIER[step.modifier]) ?? "straight";
}

/** Google Maps walking directions: the fallback when street-by-street directions are unavailable. */
export function googleMapsUrl(to: { lat: number; lon: number }, from?: { lat: number; lon: number }): string {
  const q = new URLSearchParams({ api: "1", destination: `${to.lat},${to.lon}`, travelmode: "walking" });
  if (from) q.set("origin", `${from.lat},${from.lon}`);
  return `https://www.google.com/maps/dir/?${q}`;
}
