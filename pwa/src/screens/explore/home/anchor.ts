// Where the home list is measured from (D2 the rider, D4 a place) and the location state that
// decides what to show when there is no anchor yet.

import { useSearchParams } from "react-router";
import type { LatLon } from "../../../api/types.ts";
import { parseLatLon } from "../../../lib/geo.ts";
import { isOff, useLocation } from "../../../state/location.tsx";

export type HomeAnchor =
  /** `category`: a landmark's kind ("museum"), for "4 min walk from the museum". */
  | { kind: "place"; point: LatLon; label: string; param: string; category?: string }
  | { kind: "user"; point: LatLon }
  | { kind: "finding" }
  /** `blocked`: the browser won't ask again, so the card shows the settings steps instead of a button. */
  | { kind: "off"; reason: "denied" | "unavailable"; blocked: boolean; onTurnOn: () => void };

export function useHomeAnchor(): HomeAnchor {
  const [params] = useSearchParams();
  const rider = useLocation();
  const at = parseLatLon(params.get("at"));
  if (at) return { kind: "place", point: at, label: params.get("label") ?? "", param: params.get("at")!, category: params.get("kind") ?? undefined };
  // The last known fix stays useful while a new one is found.
  if (rider.fix) return { kind: "user", point: rider.fix };
  // `prompt` before anyone asked (Not now, or a deep link) is "off" with Turn on location, not a spinner.
  if (isOff(rider.status) || (rider.status === "prompt" && !rider.requested))
    return {
      kind: "off",
      reason: rider.status === "unavailable" ? "unavailable" : "denied",
      blocked: rider.status === "denied",
      onTurnOn: rider.request,
    };
  return { kind: "finding" };
}

/** D4's place as the cards and Walk links need it: the `at` param, full name and "from the museum". */
export type Place = { param: string; name: string; short: string };

/** The query string that keeps D4's place when moving between the home views. */
export function placeQuery(anchor: HomeAnchor): string {
  if (anchor.kind !== "place") return "";
  const kind = anchor.category ? `&kind=${encodeURIComponent(anchor.category)}` : "";
  return `at=${encodeURIComponent(anchor.param)}&label=${encodeURIComponent(anchor.label)}${kind}`;
}
