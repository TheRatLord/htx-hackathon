// Trip planning via Transitous (MOTIS), normalized into rider-friendly itineraries
// that name the stop (with number and direction) and the sign on the bus.

import type { LatLon } from "../../shared/types.ts";
import { config } from "../config.ts";
import { findRoute, findStop } from "../gtfs/store.ts";
import { TtlCache } from "../lib/cache.ts";
import { formatDistance } from "../lib/geo.ts";
import { formatClock } from "../lib/time.ts";
import { fetchUpstream, UpstreamError } from "../lib/upstream.ts";
import { ApiError } from "./errors.ts";
import { bayFor } from "./transitCenters.ts";

const TRANSITOUS = "https://api.transitous.org/api/v5/plan";
const METRO_PREFIX = "us-tx-houston-metro_";
const TIGHT_TRANSFER_MIN = 5;

// --- Transitous response subset ---------------------------------------------

interface TPlace {
  name: string;
  stopId?: string;
  lat: number;
  lon: number;
  departure?: string;
  arrival?: string;
}

interface TLeg {
  mode: string;
  from: TPlace;
  to: TPlace;
  duration: number;
  startTime: string;
  endTime: string;
  scheduledStartTime?: string;
  realTime: boolean;
  distance?: number;
  headsign?: string;
  directionId?: string;
  routeId?: string;
  routeShortName?: string;
  routeLongName?: string;
  routeColor?: string;
  routeTextColor?: string;
  tripId?: string;
  intermediateStops?: TPlace[];
  legGeometry: { points: string; precision: number };
  cancelled?: boolean;
}

export interface TransitousPlan {
  itineraries: { duration: number; startTime: string; endTime: string; transfers: number; legs: TLeg[] }[];
  direct?: { duration: number; legs: TLeg[] }[];
}

// --- Our itinerary format ---------------------------------------------------

export interface PlanStop {
  id?: string;
  name: string;
  lat: number;
  lon: number;
  directionLabel?: string;
  side?: string;
  /** Bay letter when boarding at a transit center. */
  bay?: string;
}

export interface WalkLeg {
  type: "walk";
  from: PlanStop;
  to: PlanStop;
  startTime: string;
  endTime: string;
  durationMin: number;
  distanceM: number;
  distanceText: string;
  instruction: string;
  /** Turn-by-turn directions and street geometry: GET this URL. */
  walkDirectionsUrl: string;
  geometry: { polyline: string; precision: number };
}

export interface TransitLeg {
  type: "transit";
  mode: "bus" | "rail";
  route: { id: string; name: string; longName: string; color: string; textColor: string };
  /** The destination sign on the front of the vehicle. */
  headsign: string;
  tripId?: string;
  board: PlanStop;
  alight: PlanStop;
  departureTime: string;
  arrivalTime: string;
  durationMin: number;
  numStops: number;
  intermediateStops: { id?: string; name: string }[];
  isRealtime: boolean;
  instruction: string;
  /** Present when this leg follows another ride. */
  transfer?: { waitMin: number; tight: boolean; sameStop: boolean };
  geometry: { polyline: string; precision: number };
}

export type Leg = WalkLeg | TransitLeg;

export interface Itinerary {
  id: string;
  startTime: string;
  endTime: string;
  durationMin: number;
  transfers: number;
  walkDistanceM: number;
  walkDistanceText: string;
  hasTightTransfer: boolean;
  summary: string;
  legs: Leg[];
}

export interface PlanResponse {
  from: PlanStop;
  to: PlanStop;
  itineraries: Itinerary[];
  /** Friendly explanation when there are no itineraries or data is degraded. */
  message?: string;
  source: "transitous" | "offline-fixture";
  recordedAt?: string;
}

export interface PlanRequest {
  from: PlanStop;
  to: PlanStop;
  time?: string;
  arriveBy?: boolean;
}

const cache = new TtlCache<PlanResponse>(60_000, 300);

export function plan(req: PlanRequest): Promise<PlanResponse> {
  const fromPlace = `${req.from.lat.toFixed(5)},${req.from.lon.toFixed(5)}`;
  const toPlace = `${req.to.lat.toFixed(5)},${req.to.lon.toFixed(5)}`;
  const params = new URLSearchParams({ fromPlace, toPlace });
  if (req.time) params.set("time", new Date(req.time).toISOString());
  if (req.arriveBy) params.set("arriveBy", "true");
  // Fixture key ignores time so offline demos can replay any recorded origin/destination.
  const fixtureKey = `plan/${fromPlace}/${toPlace}/${req.arriveBy ? "arrive" : "depart"}`;
  return cache.get(params.toString(), async () => {
    let result;
    try {
      result = await fetchUpstream<TransitousPlan>({ service: "transitous", url: `${TRANSITOUS}?${params}`, fixtureKey, timeoutMs: 15_000 });
    } catch (err) {
      const e = err as UpstreamError;
      if (config.offline)
        throw new ApiError(
          503,
          "OFFLINE_TRIP_NOT_RECORDED",
          "Offline demo mode: this trip wasn't recorded. Try a recorded demo trip such as UH to Hobby Airport, or check arrivals at a stop.",
        );
      throw new ApiError(
        e.status && e.status < 500 ? 400 : 502,
        "PLANNER_UNAVAILABLE",
        `The trip planner couldn't be reached (${e.message}). You can still check arrivals at nearby stops, or try again in a minute.`,
      );
    }
    const normalized = normalizePlan(result.body, req);
    return result.recordedAt ? { ...normalized, source: "offline-fixture", recordedAt: result.recordedAt } : normalized;
  });
}

export function normalizePlan(body: TransitousPlan, req: PlanRequest): PlanResponse {
  const itineraries = body.itineraries.map((it, i) => normalizeItinerary(it, i, req));
  const base: PlanResponse = { from: req.from, to: req.to, itineraries, source: "transitous" };
  if (itineraries.length) return base;
  const walkable = body.direct?.find((d) => d.legs.every((l) => l.mode === "WALK"));
  return {
    ...base,
    message: walkable
      ? `No bus or train beats walking here: it's about a ${Math.round(walkable.duration / 60)}-minute walk.`
      : "No METRO trips found for that time. Service may not run this late, or the places may be outside METRO's area. " +
        "Try a different time, or pick a nearby stop as your starting point.",
  };
}

function normalizeItinerary(it: TransitousPlan["itineraries"][number], index: number, req: PlanRequest): Itinerary {
  const legs: Leg[] = [];
  let lastTransit: TransitLeg | undefined;
  it.legs.forEach((l, i) => {
    if (l.mode === "WALK") {
      // Drop zero-length walks Transitous inserts between legs at the same stop.
      if ((l.distance ?? 0) < 5 && i > 0 && i < it.legs.length - 1) return;
      legs.push(walkLeg(l, i === 0 ? req.from : undefined, i === it.legs.length - 1 ? req.to : undefined));
      return;
    }
    const t = transitLeg(l);
    if (lastTransit) {
      const waitMin = Math.round((Date.parse(t.departureTime) - Date.parse(lastTransit.arrivalTime)) / 60_000);
      t.transfer = { waitMin, tight: waitMin < TIGHT_TRANSFER_MIN, sameStop: lastTransit.alight.id === t.board.id };
    }
    legs.push(t);
    lastTransit = t;
  });
  const walks = legs.filter((l): l is WalkLeg => l.type === "walk");
  const rides = legs.filter((l): l is TransitLeg => l.type === "transit");
  const walkDistanceM = walks.reduce((s, w) => s + w.distanceM, 0);
  return {
    id: `itin-${index}`,
    startTime: it.startTime,
    endTime: it.endTime,
    durationMin: Math.round(it.duration / 60),
    transfers: it.transfers,
    walkDistanceM,
    walkDistanceText: formatDistance(walkDistanceM),
    hasTightTransfer: rides.some((r) => r.transfer?.tight),
    summary: summarize(it, rides, walkDistanceM),
    legs,
  };
}

function summarize(it: TransitousPlan["itineraries"][number], rides: TransitLeg[], walkM: number): string {
  const via = rides.map((r) => (r.mode === "rail" ? `${r.route.name} Line` : `Route ${r.route.name}`)).join(" → ");
  const walk = walkM > 0 ? `, ${formatDistance(walkM)} walking` : "";
  return `Leave ${formatClock(Date.parse(it.startTime))}, arrive ${formatClock(Date.parse(it.endTime))} · ${via || "Walk"}${walk}`;
}

function planStop(p: TPlace, fallback?: PlanStop): PlanStop {
  const id = p.stopId?.startsWith(METRO_PREFIX) ? p.stopId.slice(METRO_PREFIX.length) : undefined;
  const stop = id ? findStop(id) : undefined;
  if (stop) {
    return {
      id: stop.id,
      name: stop.name,
      lat: stop.lat,
      lon: stop.lon,
      ...(stop.dir && { directionLabel: stop.dir }),
      ...(stop.side && { side: stop.side }),
    };
  }
  if (fallback) return fallback;
  return { name: p.name === "START" || p.name === "END" ? "Your location" : p.name, lat: p.lat, lon: p.lon };
}

function stopLabel(s: PlanStop): string {
  return s.id ? `${s.name} (stop #${s.id}${s.directionLabel ? `, ${s.directionLabel.toLowerCase()}` : ""})` : s.name;
}

function walkLeg(l: TLeg, from?: PlanStop, to?: PlanStop): WalkLeg {
  const f = planStop(l.from, from);
  const t = planStop(l.to, to);
  const distanceM = Math.round(l.distance ?? 0);
  const q = (p: LatLon) => `${p.lat.toFixed(5)},${p.lon.toFixed(5)}`;
  return {
    type: "walk",
    from: f,
    to: t,
    startTime: l.startTime,
    endTime: l.endTime,
    durationMin: Math.max(1, Math.round(l.duration / 60)),
    distanceM,
    distanceText: formatDistance(distanceM),
    instruction: `Walk ${formatDistance(distanceM)} (about ${Math.max(1, Math.round(l.duration / 60))} min) to ${stopLabel(t)}${t.side ? ` on the ${t.side.charAt(0).toLowerCase()}${t.side.slice(1)}` : ""}`,
    walkDirectionsUrl: `/api/walk?from=${q(f)}&to=${q(t)}${t.id ? `&toStop=${t.id}` : ""}`,
    geometry: { polyline: l.legGeometry.points, precision: l.legGeometry.precision },
  };
}

function transitLeg(l: TLeg): TransitLeg {
  const routeId = l.routeId?.replace(METRO_PREFIX, "");
  const r = routeId ? findRoute(routeId) : undefined;
  const headsign = l.headsign ?? "";
  const board = planStop(l.from);
  const bay = r && board.id ? bayFor(board.id, r.id, Number(l.directionId), headsign) : undefined;
  if (bay) board.bay = bay;
  const alight = planStop(l.to);
  const mode = l.mode === "BUS" ? "bus" : "rail";
  const name = r?.displayName ?? l.routeShortName ?? "";
  const vehicle = mode === "rail" ? `${name} Line train` : `Route ${name} bus`;
  const numStops = (l.intermediateStops?.length ?? 0) + 1;
  return {
    type: "transit",
    mode,
    route: {
      id: r?.id ?? routeId ?? "",
      name,
      longName: r?.longName ?? l.routeLongName ?? "",
      color: r?.color ?? `#${l.routeColor ?? "004080"}`,
      textColor: r?.textColor ?? `#${l.routeTextColor ?? "FFFFFF"}`,
    },
    headsign,
    tripId: l.tripId?.split(METRO_PREFIX)[1],
    board,
    alight,
    departureTime: l.startTime,
    arrivalTime: l.endTime,
    durationMin: Math.round(l.duration / 60),
    numStops,
    intermediateStops: (l.intermediateStops ?? []).map((s) => {
      const p = planStop(s);
      return p.id ? { id: p.id, name: p.name } : { name: p.name };
    }),
    isRealtime: l.realTime,
    instruction:
      `At ${stopLabel(board)}, ${bay ? `go to Bay ${bay} and ` : ""}take the ${vehicle} marked "${headsign}" at ${formatClock(Date.parse(l.startTime))}. ` +
      `Ride ${numStops} ${numStops === 1 ? "stop" : "stops"} and get off at ${stopLabel(alight)}.`,
    geometry: { polyline: l.legGeometry.points, precision: l.legGeometry.precision },
  };
}
