import { describe, expect, it } from 'vitest';
import { PLACES, SAVED_PLACES, STOPS, getPlace, getStop, searchPlaces } from './sampleData';

describe('sample data', () => {
  it('has unique ids', () => {
    expect(new Set(PLACES.map((p) => p.id)).size).toBe(PLACES.length);
    expect(new Set(STOPS.map((s) => s.id)).size).toBe(STOPS.length);
  });

  it('points saved places at real place entries', () => {
    for (const s of SAVED_PLACES) expect(getPlace(s.placeId)).toBeDefined();
  });

  it('keeps timetables sorted and minutes in range', () => {
    for (const stop of STOPS)
      for (const r of stop.routes) {
        const hours = r.timetable.map((t) => t.hour);
        expect(hours).toEqual([...hours].sort((a, b) => a - b));
        for (const row of r.timetable) for (const m of row.minutes) expect(m).toBeGreaterThanOrEqual(0), expect(m).toBeLessThan(60);
        const up = r.upcoming.map((u) => u.inMinutes);
        expect(up).toEqual([...up].sort((a, b) => a - b));
      }
  });

  it('includes the real-screenshot stop and a tracking-lost route', () => {
    expect(getStop('wheeler-bay-f')?.name).toBe('Wheeler Transit Center · Bay F');
    expect(STOPS.some((s) => s.routes.some((r) => r.tracking.status === 'lost'))).toBe(true);
  });
});

describe('searchPlaces', () => {
  it('finds the zoo from "zoo" in any case', () => {
    expect(searchPlaces('zoo').map((p) => p.id)).toContain('houston-zoo');
    expect(searchPlaces('ZOO')[0].id).toBe('houston-zoo');
  });

  it('matches area and keywords', () => {
    expect(searchPlaces('museum').map((p) => p.id)).toContain('mfah');
    expect(searchPlaces('grocery').map((p) => p.id)).toEqual(['heb-midtown']);
  });

  it('returns nothing for blank or unknown queries', () => {
    expect(searchPlaces('   ')).toEqual([]);
    expect(searchPlaces('qqqq')).toEqual([]);
  });
});
