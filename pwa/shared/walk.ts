// The walk-time constants shared by the server estimates and the client's walkMinutes (spec C.17).

/** m/s: about 2.8 mph (normal) and 2 mph (slower, for older riders or with bags). */
export const WALK_SPEED_MPS = { normal: 1.25, slower: 0.9 } as const;

/** Straight-line distance understates real walks by roughly this factor in Houston's grid. */
export const WALK_DETOUR_FACTOR = 1.3;

/**
 * OSRM can snap a downtown start onto the pedestrian tunnels (a 1.1 km route for a 35 m walk).
 * A routed walk this much longer than the straight line is not trusted.
 */
export function implausibleWalk(straightM: number, routedM: number): boolean {
  return routedM > 3 * straightM + 150;
}
