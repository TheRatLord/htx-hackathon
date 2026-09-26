// Where the rider is on the trip (spec D13). Stop order and count come from /api/trips; times come
// from the itinerary, because /trips re-bases stop times onto today's service day (always different
// in fixture mode). The position comes from the GPS fix when one is near the route, else the clock.

import type { LatLon, PlanStop, TransitLeg, TripDetail, WalkLeg } from "../../api/types.ts";
import { haversineM } from "../../lib/geo.ts";
import { legCoords } from "../../lib/polyline.ts";
import type { TripStep } from "./steps.ts";

/** A fix within this distance of a trip stop places the rider at that stop. */
const NEAR_STOP_M = 150;
/** Walking steps end within this distance of their target. */
const ARRIVED_M = 40;
/** Wait → Ride on the clock once the departure is this far past. */
const DEPARTED_GRACE_MS = 60_000;

export interface RideStop {
  id?: string;
  name: string;
  /** Missing for intermediate stops when /trips couldn't be loaded. */
  point?: LatLon;
  /** Aligned to the itinerary (epoch ms). */
  time: number;
}

/** A fix this close to a walk's start is still "at the start": the planned walk applies. */
const AT_START_M = 50;
/** A fix farther than this from a walk's path is not on that walk (e.g. a static demo GPS). */
const ON_WALK_M = 400;

const distance = (a: LatLon, b: LatLon) => haversineM(a.lat, a.lon, b.lat, b.lon);

/** Metres from `p` to the segment a–b, on a flat local projection (fine at walking scale). */
function toSegmentM(p: LatLon, a: LatLon, b: LatLon): number {
  const kx = 111_320 * Math.cos((p.lat * Math.PI) / 180);
  const ky = 110_540;
  const [ax, ay, bx, by] = [(a.lon - p.lon) * kx, (a.lat - p.lat) * ky, (b.lon - p.lon) * kx, (b.lat - p.lat) * ky];
  const [dx, dy] = [bx - ax, by - ay];
  const len2 = dx * dx + dy * dy;
  const k = len2 ? Math.min(1, Math.max(0, -(ax * dx + ay * dy) / len2)) : 0;
  return Math.hypot(ax + k * dx, ay + k * dy);
}

/**
 * Where a walk step is measured from: the fix while the rider is on that walk, or undefined when
 * the planned walk applies (no fix, still at the start, or somewhere else entirely).
 */
export function walkOrigin(leg: WalkLeg, fix: LatLon | undefined): LatLon | undefined {
  if (!fix || distance(fix, leg.from) <= AT_START_M) return undefined;
  if (distance(fix, leg.to) <= NEAR_STOP_M) return fix;
  const path = [leg.from, ...legCoords(leg.geometry).map(([lon, lat]) => ({ lat, lon })), leg.to];
  return path.some((a, i) => i > 0 && toSegmentM(fix, path[i - 1], a) <= ON_WALK_M) ? fix : undefined;
}

/**
 * The ride's stops from the board stop to the alight stop, with times aligned to the itinerary.
 * Without /trips, the leg's own stop list is used (only its ends have coordinates) with times
 * spread evenly between departure and arrival.
 */
export function rideStops(ride: TransitLeg, trip?: TripDetail): RideStop[] {
  const dep = Date.parse(ride.departureTime);
  const alightAt = trip ? trip.stops.findIndex((s, i) => i > 0 && s.id === ride.alight.id) : -1;
  if (trip && trip.stops[0]?.id === ride.board.id && alightAt > 0) {
    const offset = dep - Date.parse(trip.stops[0].scheduledTime);
    return trip.stops.slice(0, alightAt + 1).map((s) => ({
      id: s.id,
      name: s.name,
      point: { lat: s.lat, lon: s.lon },
      time: Date.parse(s.scheduledTime) + offset,
    }));
  }
  const arr = Date.parse(ride.arrivalTime);
  const ends = (s: PlanStop) => ({ id: s.id, name: s.name, point: { lat: s.lat, lon: s.lon } });
  const middle = ride.intermediateStops.map((s) => ({ id: s.id, name: s.name }));
  const all = [ends(ride.board), ...middle, ends(ride.alight)];
  return all.map((s, i) => ({ ...s, time: dep + ((arr - dep) * i) / (all.length - 1) }));
}

export type PositionSource = "location" | "schedule" | "none";

/** The index of the stop the rider is at or has passed; it only ever moves forward. */
export function ridePosition(
  stops: RideStop[],
  prev: number,
  opts: { fix?: LatLon; now: number; useClock: boolean },
): { index: number; source: PositionSource } {
  if (opts.fix) {
    let best = -1;
    let bestM = NEAR_STOP_M;
    stops.forEach((s, i) => {
      const m = s.point ? distance(opts.fix!, s.point) : Infinity;
      if (m <= bestM) [best, bestM] = [i, m];
    });
    if (best >= 0) return { index: Math.max(prev, best), source: "location" };
  }
  if (!opts.useClock) return { index: prev, source: "none" };
  const passed = stops.reduce((last, s, i) => (s.time <= opts.now ? i : last), 0);
  return { index: Math.max(prev, passed), source: "schedule" };
}

export interface StepContext {
  fix?: LatLon;
  now: number;
  /** Off for recorded (fixture) trips: only the GPS and the manual buttons move them. */
  useClock: boolean;
  /** Ride steps: the current stop index along rideStops(). */
  rideIndex?: number;
  rideStopCount?: number;
}

/** True when the current step is finished and the trip should move on by itself. */
export function stepDone(step: TripStep, ctx: StepContext): boolean {
  const { fix } = ctx;
  switch (step.kind) {
    case "walk":
      return Boolean(fix && distance(fix, step.ride.board) <= ARRIVED_M);
    case "wait": {
      const moved = fix && distance(fix, step.ride.board) > NEAR_STOP_M && (ctx.rideIndex ?? 0) > 0;
      const departed = ctx.useClock && ctx.now > Date.parse(step.ride.departureTime) + DEPARTED_GRACE_MS;
      return Boolean(moved || departed);
    }
    case "ride":
      return ctx.rideIndex !== undefined && ctx.rideStopCount !== undefined && ctx.rideIndex >= ctx.rideStopCount - 1;
    case "final":
      return Boolean(fix && distance(fix, step.leg.to) <= ARRIVED_M);
    case "arrived":
      return false;
  }
}
