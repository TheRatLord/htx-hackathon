import { describe, expect, it } from 'vitest';
import { initialState, reducer } from './store';

describe('store reducer', () => {
  it('toggles stars', () => {
    const a = reducer(initialState, { type: 'toggleStar', placeId: 'mfah' });
    expect(a.starredPlaceIds).toEqual(['mfah']);
    expect(reducer(a, { type: 'toggleStar', placeId: 'mfah' }).starredPlaceIds).toEqual([]);
  });

  it('saves a trip once and removes it', () => {
    const trip = { id: 't1', placeId: 'mfah', optionId: 'A' as const, summary: 'Route 5 · 20 min', savedAt: 1 };
    const a = reducer(initialState, { type: 'saveTrip', trip });
    const b = reducer(a, { type: 'saveTrip', trip: { ...trip, id: 't2' } });
    expect(b.savedTrips.filter((t) => t.placeId === 'mfah')).toHaveLength(1);
    expect(reducer(b, { type: 'removeTrip', id: 't1' }).savedTrips.some((t) => t.id === 't1')).toBe(false);
  });

  it('keeps recents unique, newest first, capped at 8', () => {
    let s = { ...initialState, recentPlaceIds: [] as string[] };
    for (let i = 0; i < 10; i++) s = reducer(s, { type: 'visitPlace', placeId: `p${i}` });
    s = reducer(s, { type: 'visitPlace', placeId: 'p5' });
    expect(s.recentPlaceIds[0]).toBe('p5');
    expect(s.recentPlaceIds).toHaveLength(8);
    expect(new Set(s.recentPlaceIds).size).toBe(8);
  });

  it('starts and ends trips', () => {
    const a = reducer(initialState, { type: 'startTrip', placeId: 'houston-zoo', optionId: 'A' });
    expect(a.activeTrip).toEqual({ placeId: 'houston-zoo', optionId: 'A' });
    expect(reducer(a, { type: 'endTrip' }).activeTrip).toBeNull();
  });

  it('hides and restores Home/Work', () => {
    const a = reducer(initialState, { type: 'hideSavedPlace', id: 'home' });
    expect(a.hiddenSavedPlaceIds).toEqual(['home']);
    expect(reducer(a, { type: 'restoreSavedPlaces' }).hiddenSavedPlaceIds).toEqual([]);
  });
});
