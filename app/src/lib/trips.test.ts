import { describe, expect, it } from 'vitest';
import { SAMPLE_NOW, STOPS } from '../data/sampleData';
import { formatClock } from './format';
import {
  fastestMinutes,
  nearbyStops,
  nextDeparture,
  optionStatus,
  optionSummary,
  optionTags,
  planRoutes,
  sortRoutes,
  totalMinutes,
  walkingMinutes,
} from './trips';
import type { RouteOption } from '../data/types';

describe('nearbyStops', () => {
  it('numbers stops 1, 2, 3 by distance with the storyboard walk times', () => {
    const near = nearbyStops();
    expect(near.map((s) => s.rank)).toEqual([1, 2, 3]);
    expect(near.map((s) => s.stop.id)).toEqual(['wheeler-bay-f', 'fannin-alabama', 'almeda-tuam']);
    expect(near.map((s) => s.walkMinutes)).toEqual([3, 4, 6]);
    for (let i = 1; i < near.length; i++) expect(near[i].distanceMeters).toBeGreaterThan(near[i - 1].distanceMeters);
  });

  it('ranks by distance, not by list order', () => {
    const reversed = [...STOPS].reverse();
    expect(nearbyStops(undefined, reversed)[0].stop.id).toBe('wheeler-bay-f');
  });
});

describe('nextDeparture', () => {
  it('picks the soonest departure across routes', () => {
    expect(nextDeparture(STOPS[0])).toEqual({ lineId: '5', inMinutes: 6, status: 'live' });
  });

  it('marks departures on a route with lost tracking as lost', () => {
    const fannin = STOPS.find((s) => s.id === 'fannin-alabama')!;
    const onlyLost = { ...fannin, routes: fannin.routes.filter((r) => r.lineId === '65') };
    expect(nextDeparture(onlyLost)?.status).toBe('lost');
  });
});

describe('zoo options (storyboard)', () => {
  const opts = planRoutes('houston-zoo');

  it('has three options A, B, C with the storyboard times', () => {
    expect(opts.map((o) => o.id)).toEqual(['A', 'B', 'C']);
    expect(opts.map((o) => formatClock(o.arriveAt))).toEqual(['4:46 PM', '4:52 PM', '4:56 PM']);
    expect(opts.map((o) => formatClock(o.leaveBy))).toEqual(['4:22 PM', '4:27 PM', '4:22 PM']);
    expect(opts.map(totalMinutes)).toEqual([24, 25, 34]);
  });

  it('has legs whose times add up to the arrival time', () => {
    for (const o of opts) {
      let t = o.leaveBy;
      for (const l of o.legs) {
        if (l.kind === 'ride') {
          expect(l.departAt).toBeGreaterThanOrEqual(t);
          t = l.departAt + l.rideMinutes;
        } else t += l.minutes;
      }
      expect(t).toBe(o.arriveAt);
    }
  });

  it('summarises lines and status honestly', () => {
    expect(optionSummary(opts[2])).toBe('Route 700 + 65 · 34 min');
    expect(opts.map(optionStatus)).toEqual(['live', 'scheduled', 'lost']);
    expect(opts.map(walkingMinutes)).toEqual([9, 6, 10]);
  });
});

describe('sortRoutes', () => {
  const opts = planRoutes('houston-zoo');

  it('sorts Fastest by arrival time', () => {
    expect(sortRoutes(opts, 'fastest').map((o) => o.id)).toEqual(['A', 'B', 'C']);
  });

  it('sorts Least walking by walking minutes', () => {
    expect(sortRoutes(opts, 'least-walking').map((o) => o.id)).toEqual(['B', 'A', 'C']);
  });

  it('breaks ties with the other measure, then id', () => {
    const base = opts[0];
    const mk = (id: 'A' | 'B' | 'C', arriveAt: number, walk: number): RouteOption => ({
      ...base,
      id,
      arriveAt,
      legs: [{ kind: 'walk', minutes: walk, to: 'x', path: [] }],
    });
    const tied = [mk('C', 100, 5), mk('B', 100, 3), mk('A', 90, 5)];
    expect(sortRoutes(tied, 'fastest').map((o) => o.id)).toEqual(['A', 'B', 'C']);
    expect(sortRoutes(tied, 'least-walking').map((o) => o.id)).toEqual(['B', 'A', 'C']);
  });

  it('does not mutate its input', () => {
    const copy = [...opts];
    sortRoutes(opts, 'least-walking');
    expect(opts).toEqual(copy);
  });

  it('tags the fastest and least-walking options', () => {
    expect(optionTags(opts)).toEqual({ A: ['fastest'], B: ['least-walking'], C: [] });
  });
});

describe('planRoutes for other places', () => {
  it.each(['mfah', 'heb-midtown', 'place-home', 'place-work', 'hermann-park'])('builds 3 consistent options for %s', (id) => {
    const opts = planRoutes(id);
    expect(opts).toHaveLength(3);
    for (const o of opts) {
      expect(o.leaveBy).toBeGreaterThanOrEqual(SAMPLE_NOW);
      expect(o.arriveAt).toBeGreaterThan(o.leaveBy);
      let t = o.leaveBy;
      for (const l of o.legs) {
        if (l.kind === 'ride') {
          expect(l.departAt).toBeGreaterThanOrEqual(t);
          t = l.departAt + l.rideMinutes;
        } else t += l.minutes;
      }
      expect(t).toBe(o.arriveAt);
    }
  });

  it('returns nothing for an unknown place', () => {
    expect(planRoutes('nowhere')).toEqual([]);
    expect(fastestMinutes('nowhere')).toBeUndefined();
  });
});
