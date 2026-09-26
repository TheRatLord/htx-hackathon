// Walking directions via the public OSRM foot profile, rewritten as short,
// plain-English steps with US units.

import type { LatLon } from "../../shared/types.ts";
import { WALK_DETOUR_FACTOR, WALK_SPEED_MPS } from "../../shared/walk.ts";
import { TtlCache } from "../lib/cache.ts";
import { compass8, formatDistance, haversineM, type Compass8 } from "../lib/geo.ts";
import { fetchUpstream } from "../lib/upstream.ts";

const OSRM = "https://routing.openstreetmap.de/routed-foot/route/v1/foot";
export type WalkModifier = "left" | "right" | "slight left" | "slight right" | "sharp left" | "sharp right" | "straight" | "uturn";

export interface WalkStep {
  /** OSRM maneuver type ("depart", "turn", "new name", "continue", "arrive", "roundabout", ...). */
  maneuver: "depart" | "turn" | "new name" | "continue" | "arrive" | "roundabout" | (string & {});
  modifier?: WalkModifier;
  street?: string;
  /** "depart" only: the first heading, e.g. "southeast" for "Head southeast on Calhoun Rd". */
  compass?: Compass8;
  /** English fallback; clients compose localised text from the structured fields. */
  instruction: string;
  distanceM: number;
  distanceText: string;
  lat: number;
  lon: number;
}

export interface WalkRoute {
  source: "osrm" | "straight-line-estimate";
  warning?: string;
  distanceM: number;
  distanceText: string;
  durationS: number;
  durationMin: number;
  /** Walking time at a gentler 2 mph pace. */
  relaxedDurationMin: number;
  geometry: { type: "LineString"; coordinates: [number, number][] };
  steps: WalkStep[];
}

interface OsrmStep {
  distance: number;
  name: string;
  maneuver: { type: string; modifier?: WalkModifier; bearing_after: number; location: [number, number] };
}

interface OsrmResponse {
  code: string;
  routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] }; legs: { steps: OsrmStep[] }[] }[];
}

const cache = new TtlCache<WalkRoute>(24 * 3600_000, 2000);

/** `label` phrases the English instructions ("stop #342 (...)"); `name` is the place name for structured steps. */
export interface WalkDestination {
  label: string;
  name: string;
}

export function walkRoute(from: LatLon, to: LatLon, destination?: WalkDestination): Promise<WalkRoute> {
  const r = (n: number) => n.toFixed(5);
  const coords = `${r(from.lon)},${r(from.lat)};${r(to.lon)},${r(to.lat)}`;
  return cache.get(`${coords}|${destination?.label ?? ""}`, async () => {
    try {
      const { body } = await fetchUpstream<OsrmResponse>({
        service: "osrm",
        url: `${OSRM}/${coords}?overview=full&geometries=geojson&steps=true`,
        fixtureKey: `foot/${coords}`,
      });
      const route = body.routes?.[0];
      if (body.code !== "Ok" || !route) throw new Error(`no walking route (${body.code})`);
      return {
        source: "osrm",
        ...durations(route.distance, route.duration),
        geometry: { type: "LineString", coordinates: route.geometry.coordinates },
        steps: describeSteps(route.legs.flatMap((l) => l.steps), destination),
      };
    } catch (err) {
      return straightLine(from, to, destination, (err as Error).message);
    }
  });
}

function durations(distanceM: number, durationS: number) {
  return {
    distanceM: Math.round(distanceM),
    distanceText: formatDistance(distanceM),
    durationS: Math.round(durationS),
    durationMin: Math.max(1, Math.round(durationS / 60)),
    relaxedDurationMin: Math.max(1, Math.round(distanceM / WALK_SPEED_MPS.slower / 60)),
  };
}

function straightLine(from: LatLon, to: LatLon, destination: WalkDestination | undefined, reason: string): WalkRoute {
  const d = haversineM(from.lat, from.lon, to.lat, to.lon) * WALK_DETOUR_FACTOR;
  return {
    source: "straight-line-estimate",
    warning: `Street-by-street directions are unavailable (${reason}). Distance is an estimate.`,
    ...durations(d, d / 1.3),
    geometry: { type: "LineString", coordinates: [[from.lon, from.lat], [to.lon, to.lat]] },
    steps: [
      {
        maneuver: "arrive",
        ...(destination && { street: destination.name }),
        instruction: `Walk about ${formatDistance(d)} to ${destination?.label ?? "your destination"}`,
        distanceM: Math.round(d),
        distanceText: formatDistance(d),
        lat: from.lat,
        lon: from.lon,
      },
    ],
  };
}

const onto = (name: string) => (name ? ` onto ${name}` : "");

function phrase(s: OsrmStep, destinationLabel?: string): string {
  const { type, modifier = "straight", bearing_after } = s.maneuver;
  const name = s.name.trim();
  if (type === "depart") return `Head ${compass8(bearing_after)}${name ? ` on ${name}` : ""}`;
  if (type === "arrive") {
    const side = modifier.includes("left") ? " on your left" : modifier.includes("right") ? " on your right" : "";
    return `Arrive at ${destinationLabel ?? "your destination"}${side}`;
  }
  if (modifier === "uturn") return `Turn around${onto(name)}`;
  if (modifier === "straight") return name ? `Continue on ${name}` : "Continue straight";
  const turn = modifier.startsWith("slight") ? `Bear ${modifier.replace("slight ", "")}` : modifier.startsWith("sharp") ? `Make a sharp ${modifier.replace("sharp ", "")}` : `Turn ${modifier}`;
  return type === "end of road" ? `At the end of the road, ${turn.toLowerCase()}${onto(name)}` : `${turn}${onto(name)}`;
}

/** Merge tiny and same-street steps so riders get a handful of meaningful instructions. */
export function describeSteps(steps: OsrmStep[], destination?: WalkDestination): WalkStep[] {
  const merged: OsrmStep[] = [];
  for (const s of steps) {
    const prev = merged.at(-1);
    const isTurn = !["straight", undefined].includes(s.maneuver.modifier) && s.maneuver.type !== "new name";
    const sameStreet = prev && s.name === prev.name && !isTurn;
    const tiny = prev && s.distance < 8 && s.maneuver.type !== "arrive" && prev.maneuver.type !== "depart";
    if (prev && (sameStreet || tiny) && s.maneuver.type !== "arrive") {
      prev.distance += s.distance;
      if (!prev.name) prev.name = s.name;
    } else merged.push({ ...s, maneuver: { ...s.maneuver } });
  }
  return merged.map((s) => {
    const base = phrase(s, destination?.label);
    const walk = s.maneuver.type === "arrive" ? "" : `, walk ${formatDistance(s.distance)}`;
    const { type, modifier, bearing_after } = s.maneuver;
    // OSRM's arrive step has no street name; the structured step names the destination instead.
    const street = type === "arrive" ? destination?.name : s.name.trim();
    return {
      maneuver: type,
      ...(modifier && { modifier }),
      ...(street && { street }),
      ...(type === "depart" && { compass: compass8(bearing_after) }),
      instruction: base + walk,
      distanceM: Math.round(s.distance),
      distanceText: formatDistance(s.distance),
      lat: s.maneuver.location[1],
      lon: s.maneuver.location[0],
    };
  });
}
