// "Simulate moving" for demos with a pinned location (?demoLoc=): a pretend rider travels the
// itinerary's own geometry, fast, so every automatic step change and get-off warning can be seen
// in the foreground. The UI labels it as simulated wherever it is used.

import { useEffect, useMemo, useState } from "react";
import type { Itinerary, LatLon } from "../../api/types.ts";
import { haversineM } from "../../lib/geo.ts";
import { legCoords } from "../../lib/polyline.ts";

/** Demo speeds (m/s): about 10x a walk and 3x a city bus, so a 50-minute trip plays in minutes. */
const WALK_MPS = 14;
const RIDE_MPS = 30;
const TICK_MS = 1_000;

interface SimLeg {
  coords: [number, number][];
  mps: number;
}

export function simLegs(it: Itinerary, fromLeg: number): SimLeg[] {
  return it.legs.slice(fromLeg).map((l) => ({ coords: legCoords(l.geometry), mps: l.type === "walk" ? WALK_MPS : RIDE_MPS }));
}

const segmentM = (a: [number, number], b: [number, number]) => haversineM(a[1], a[0], b[1], b[0]);

/** Where the pretend rider is after `seconds`; the last point once the path is used up. */
export function simPosition(legs: SimLeg[], seconds: number): LatLon | undefined {
  let left = seconds;
  let last: [number, number] | undefined;
  for (const leg of legs) {
    let metres = left * leg.mps;
    for (let i = 1; i < leg.coords.length; i++) {
      const [a, b] = [leg.coords[i - 1], leg.coords[i]];
      const d = segmentM(a, b);
      if (metres < d) {
        const f = metres / d;
        return { lat: a[1] + (b[1] - a[1]) * f, lon: a[0] + (b[0] - a[0]) * f };
      }
      metres -= d;
    }
    left = metres / leg.mps;
    last = leg.coords.at(-1) ?? last;
  }
  return last && { lat: last[1], lon: last[0] };
}

/** The simulated position while `legs` is set; restarts from the path's start when `legs` changes. */
export function useSimulatedFix(legs: SimLeg[] | undefined): LatLon | undefined {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    setSeconds(0);
    if (!legs) return;
    const timer = setInterval(() => setSeconds((s) => s + TICK_MS / 1000), TICK_MS);
    return () => clearInterval(timer);
  }, [legs]);
  // One object per tick, so screens can key effects and memos on it.
  return useMemo(() => (legs ? simPosition(legs, seconds) : undefined), [legs, seconds]);
}
