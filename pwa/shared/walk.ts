// The walk-time constants shared by the server estimates and the client's walkMinutes (spec C.17).

/** m/s: about 2.8 mph (normal) and 2 mph (slower, for older riders or with bags). */
export const WALK_SPEED_MPS = { normal: 1.25, slower: 0.9 } as const;

/** Straight-line distance understates real walks by roughly this factor in Houston's grid. */
export const WALK_DETOUR_FACTOR = 1.3;
