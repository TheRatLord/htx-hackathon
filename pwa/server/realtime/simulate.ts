// DEMO_REALTIME: deterministic fake "live" predictions so demos look alive when
// no METRO key is configured. Always labelled source "simulated".

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Same trip + service date always yields the same delay (-1..+7 min), ~2% canceled. */
export function simulatedDelay(tripId: string, serviceDate: string): { delaySec: number; canceled: boolean } {
  const h = hash(`${tripId}:${serviceDate}`);
  return { delaySec: (h % 480) - 60, canceled: h % 50 === 0 };
}
