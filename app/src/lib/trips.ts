import { USER_POSITION } from '../data/geography';
import { OPTION_COLORS, SAMPLE_NOW, STOPS, getPlace, getStop } from '../data/sampleData';
import type { LineId, LngLat, Leg, RouteOption, RouteOptionId, Stop, TimeStatus } from '../data/types';
import { distanceMeters, walkMinutes } from './geo';

/* ------------------------------------------------------------------ */
/* Nearby stops                                                        */
/* ------------------------------------------------------------------ */

export interface NearbyStop {
  stop: Stop;
  /** 1, 2, 3 by distance. Not a real stop number. */
  rank: number;
  walkMinutes: number;
  distanceMeters: number;
}

/** Stops sorted nearest first and numbered from 1. */
export function nearbyStops(from: LngLat = USER_POSITION, stops: Stop[] = STOPS): NearbyStop[] {
  return stops
    .map((stop) => ({
      stop,
      walkMinutes: walkMinutes(from, stop.position),
      distanceMeters: distanceMeters(from, stop.position),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

/** The next departure across every route at a stop (for the "Near you" peek). */
export function nextDeparture(stop: Stop) {
  let best: { lineId: LineId; inMinutes: number; status: TimeStatus } | undefined;
  for (const r of stop.routes) {
    const first = r.upcoming[0];
    if (!first) continue;
    const status: TimeStatus = r.tracking.status === 'lost' ? 'lost' : first.status;
    if (!best || first.inMinutes < best.inMinutes) best = { lineId: r.lineId, inMinutes: first.inMinutes, status };
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Route option summaries                                              */
/* ------------------------------------------------------------------ */

export function totalMinutes(o: RouteOption): number {
  return o.arriveAt - o.leaveBy;
}

export function walkingMinutes(o: RouteOption): number {
  return o.legs.reduce((sum, l) => (l.kind === 'walk' ? sum + l.minutes : sum), 0);
}

const STATUS_RANK: Record<TimeStatus, number> = { live: 0, scheduled: 1, lost: 2 };

/** The least trustworthy status among the option's rides, so a card never over-promises. */
export function optionStatus(o: RouteOption): TimeStatus {
  let worst: TimeStatus = 'live';
  for (const l of o.legs) if (l.kind === 'ride' && STATUS_RANK[l.status] > STATUS_RANK[worst]) worst = l.status;
  return worst;
}

export function optionLines(o: RouteOption): LineId[] {
  return o.legs.flatMap((l) => (l.kind === 'ride' ? [l.lineId] : []));
}

/** e.g. "Route 700 + 65 · 34 min" */
export function optionSummary(o: RouteOption): string {
  const lines = optionLines(o);
  return `Route ${lines.join(' + ')} · ${totalMinutes(o)} min`;
}

export type SortMode = 'fastest' | 'least-walking';

/** Fastest = earliest arrival. Least walking = fewest walking minutes. Ties fall back to the other measure, then id. */
export function sortRoutes(options: RouteOption[], mode: SortMode): RouteOption[] {
  const byArrive = (a: RouteOption, b: RouteOption) => a.arriveAt - b.arriveAt;
  const byWalk = (a: RouteOption, b: RouteOption) => walkingMinutes(a) - walkingMinutes(b);
  const byId = (a: RouteOption, b: RouteOption) => a.id.localeCompare(b.id);
  const [first, second] = mode === 'fastest' ? [byArrive, byWalk] : [byWalk, byArrive];
  return [...options].sort((a, b) => first(a, b) || second(a, b) || byId(a, b));
}

/** Which option gets the FASTEST and LEAST WALKING tags. */
export function optionTags(options: RouteOption[]): Record<RouteOptionId, ('fastest' | 'least-walking')[]> {
  const tags = { A: [], B: [], C: [] } as Record<RouteOptionId, ('fastest' | 'least-walking')[]>;
  if (options.length === 0) return tags;
  tags[sortRoutes(options, 'fastest')[0].id].push('fastest');
  tags[sortRoutes(options, 'least-walking')[0].id].push('least-walking');
  return tags;
}

/** Full path of an option, for fitting the map. */
export function optionPath(o: RouteOption): LngLat[] {
  return o.legs.flatMap((l) => (l.kind === 'wait' ? [] : l.path));
}

/* ------------------------------------------------------------------ */
/* Trip planning (sample)                                              */
/* ------------------------------------------------------------------ */

const ZOO_ID = 'houston-zoo';

/** Hand-made options for the demo destination; they match the storyboard. */
function zooOptions(): RouteOption[] {
  const now = SAMPLE_NOW;
  const u = USER_POSITION;
  return [
    {
      id: 'A',
      color: OPTION_COLORS.A,
      leaveBy: now + 3,
      arriveAt: now + 27,
      legs: [
        { kind: 'walk', minutes: 3, to: 'Wheeler Transit Center · Bay F', path: [u, [-95.3829, 29.7412]] },
        {
          kind: 'ride',
          lineId: '5',
          direction: 'Eastbound',
          headsign: 'Richey St',
          board: 'Wheeler Transit Center · Bay F',
          alight: 'Main St @ Hermann Park',
          departAt: now + 6,
          rideMinutes: 15,
          status: 'live',
          path: [
            [-95.3829, 29.7412],
            [-95.3829, 29.7165],
            [-95.3852, 29.7158],
          ],
        },
        {
          kind: 'walk',
          minutes: 6,
          to: 'Houston Zoo',
          path: [
            [-95.3852, 29.7158],
            [-95.3895, 29.7148],
          ],
        },
      ],
    },
    {
      id: 'B',
      color: OPTION_COLORS.B,
      leaveBy: now + 8,
      arriveAt: now + 33,
      legs: [
        {
          kind: 'walk',
          minutes: 4,
          to: 'Fannin St @ Alabama St',
          path: [u, [-95.38, 29.7412], [-95.38, 29.7395]],
        },
        {
          kind: 'ride',
          lineId: '25',
          direction: 'Westbound',
          headsign: 'Richmond Ave',
          board: 'Fannin St @ Alabama St',
          alight: 'Hermann Park Dr @ Zoo Entrance',
          departAt: now + 12,
          rideMinutes: 19,
          status: 'scheduled',
          path: [
            [-95.38, 29.7395],
            [-95.38, 29.7185],
            [-95.3872, 29.7185],
            [-95.3884, 29.7166],
          ],
        },
        {
          kind: 'walk',
          minutes: 2,
          to: 'Houston Zoo',
          path: [
            [-95.3884, 29.7166],
            [-95.3895, 29.7148],
          ],
        },
      ],
    },
    {
      id: 'C',
      color: OPTION_COLORS.C,
      leaveBy: now + 3,
      arriveAt: now + 37,
      legs: [
        { kind: 'walk', minutes: 6, to: 'Almeda Rd @ Tuam St', path: [u, [-95.3771, 29.7412]] },
        {
          kind: 'ride',
          lineId: '700',
          direction: 'Outbound',
          headsign: 'TMC Transit Center',
          board: 'Almeda Rd @ Tuam St',
          alight: 'Almeda Rd @ Binz St',
          departAt: now + 9,
          rideMinutes: 8,
          status: 'live',
          path: [
            [-95.3771, 29.7412],
            [-95.3771, 29.7291],
          ],
        },
        { kind: 'wait', minutes: 4, at: 'Almeda Rd @ Binz St' },
        {
          kind: 'ride',
          lineId: '65',
          direction: 'Westbound',
          headsign: 'Synott Rd',
          board: 'Almeda Rd @ Binz St',
          alight: 'Montrose Blvd @ Hermann Park',
          departAt: now + 21,
          rideMinutes: 12,
          status: 'lost',
          path: [
            [-95.3771, 29.7291],
            [-95.3945, 29.7291],
            [-95.3945, 29.7178],
          ],
        },
        {
          kind: 'walk',
          minutes: 4,
          to: 'Houston Zoo',
          path: [
            [-95.3945, 29.7178],
            [-95.3895, 29.7148],
          ],
        },
      ],
    },
  ];
}

/** Bus speed including stops, in metres per minute (about 12 km/h). */
const BUS_METERS_PER_MINUTE = 200;

function pathLength(path: LngLat[]): number {
  return path.slice(1).reduce((sum, p, i) => sum + distanceMeters(path[i], p), 0);
}

function firstDepartureAfter(stopId: string, lineId: LineId, earliest: number): { at: number; status: TimeStatus } {
  const route = getStop(stopId)?.routes.find((r) => r.lineId === lineId);
  const lost = route?.tracking.status === 'lost';
  for (const a of route?.upcoming ?? []) {
    const at = SAMPLE_NOW + a.inMinutes;
    if (at >= earliest) return { at, status: lost ? 'lost' : a.status };
  }
  return { at: earliest + 10, status: 'scheduled' };
}

/**
 * Builds three plausible sample options for any destination: one from each
 * nearby stop, with L-shaped paths along the grid. The zoo uses fixed data.
 */
export function planRoutes(placeId: string): RouteOption[] {
  if (placeId === ZOO_ID) return zooOptions();
  const place = getPlace(placeId);
  if (!place) return [];
  const dest = place.position;
  const u = USER_POSITION;
  const now = SAMPLE_NOW;

  const build = (
    id: RouteOptionId,
    stopId: string,
    lineId: LineId,
    direction: Extract<Leg, { kind: 'ride' }>['direction'],
    headsign: string,
    finalWalkOffset: number,
  ): RouteOption => {
    const stop = getStop(stopId)!;
    const walkIn = walkMinutes(u, stop.position);
    const leaveBy = now + 1;
    const dep = firstDepartureAfter(stopId, lineId, leaveBy + walkIn);
    // Ride along the stop's street to the destination's latitude, then across.
    const alightLng = dest[0] + (dest[0] > stop.position[0] ? -finalWalkOffset : finalWalkOffset);
    const ridePath: LngLat[] = [stop.position, [stop.position[0], dest[1]], [alightLng, dest[1]]];
    const rideMinutes = Math.max(4, Math.round(pathLength(ridePath) / BUS_METERS_PER_MINUTE));
    const walkOut = walkMinutes([alightLng, dest[1]], dest);
    const arriveAt = dep.at + rideMinutes + walkOut;
    return {
      id,
      color: OPTION_COLORS[id],
      leaveBy: dep.at - walkIn,
      arriveAt,
      legs: [
        { kind: 'walk', minutes: walkIn, to: stop.name, path: [u, stop.position] },
        {
          kind: 'ride',
          lineId,
          direction,
          headsign,
          board: stop.name,
          alight: `Stop near ${place.name}`,
          departAt: dep.at,
          rideMinutes,
          status: dep.status,
          path: ridePath,
        },
        { kind: 'walk', minutes: walkOut, to: place.name, path: [[alightLng, dest[1]], dest] },
      ],
    };
  };

  return [
    build('A', 'wheeler-bay-f', '5', 'Eastbound', 'Richey St', 0.0035),
    build('B', 'fannin-alabama', '25', 'Westbound', 'Richmond Ave', 0.0008),
    build('C', 'almeda-tuam', '700', 'Outbound', 'TMC Transit Center', 0.002),
  ];
}

export function getOption(placeId: string, optionId: string): RouteOption | undefined {
  return planRoutes(placeId).find((o) => o.id === optionId);
}

/** Fastest total minutes to a place, used on the Home and Work chips. */
export function fastestMinutes(placeId: string): number | undefined {
  const opts = planRoutes(placeId);
  if (opts.length === 0) return undefined;
  return totalMinutes(sortRoutes(opts, 'fastest')[0]);
}
