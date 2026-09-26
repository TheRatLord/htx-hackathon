import { describe, expect, it } from 'vitest';
import { parseHash, tabOf, toHash, type Route } from './router';

describe('router', () => {
  const routes: Route[] = [
    { name: 'home' },
    { name: 'home', sheet: 'half' },
    { name: 'search' },
    { name: 'routes', placeId: 'houston-zoo' },
    { name: 'trip', placeId: 'houston-zoo', optionId: 'A' },
    { name: 'stop', stopId: 'wheeler-bay-f' },
    { name: 'fares' },
    { name: 'recent' },
    { name: 'more' },
  ];

  it.each(routes)('round-trips %o', (r) => {
    expect(parseHash(toHash(r))).toEqual(r);
  });

  it('falls back to home for unknown or incomplete paths', () => {
    expect(parseHash('')).toEqual({ name: 'home' });
    expect(parseHash('#/nope')).toEqual({ name: 'home' });
    expect(parseHash('#/trip/houston-zoo')).toEqual({ name: 'home' });
    expect(parseHash('#/routes')).toEqual({ name: 'search' });
  });

  it('maps screens to tabs', () => {
    expect(tabOf({ name: 'stop', stopId: 'x' })).toBe('trip');
    expect(tabOf({ name: 'fares' })).toBe('fares');
  });
});
