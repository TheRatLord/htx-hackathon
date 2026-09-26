import { describe, expect, it } from 'vitest';
import { boundsOf, distanceMeters, pointAlong, walkMinutes } from './geo';

describe('geo', () => {
  it('measures about 111 km per degree of latitude', () => {
    expect(distanceMeters([0, 0], [0, 1])).toBeCloseTo(111_195, -2);
  });

  it('is zero for the same point and symmetric', () => {
    expect(distanceMeters([-95.38, 29.74], [-95.38, 29.74])).toBe(0);
    const a: [number, number] = [-95.38, 29.74];
    const b: [number, number] = [-95.37, 29.73];
    expect(distanceMeters(a, b)).toBeCloseTo(distanceMeters(b, a), 6);
  });

  it('rounds walking up and never returns 0', () => {
    expect(walkMinutes([-95.38, 29.74], [-95.38, 29.74])).toBe(1);
    // ~800 m straight * 1.2 = 960 m at 80 m/min = 12 min
    expect(walkMinutes([0, 0], [0, 800 / 111_195])).toBe(12);
  });

  it('finds bounds', () => {
    expect(boundsOf([[1, 2], [3, -1], [0, 5]])).toEqual([[0, -1], [3, 5]]);
    expect(() => boundsOf([])).toThrow();
  });

  it('finds points along a path', () => {
    const path: [number, number][] = [[0, 0], [0, 1], [1, 1]];
    expect(pointAlong(path, 0)).toEqual([0, 0]);
    expect(pointAlong(path, 1)).toEqual([1, 1]);
    const mid = pointAlong(path, 0.5);
    expect(mid[0]).toBeCloseTo(0, 2);
    expect(mid[1]).toBeCloseTo(1, 2);
  });
});
