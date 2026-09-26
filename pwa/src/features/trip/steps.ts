// The Live trip's steps, built from an itinerary's legs (spec D13):
// Walk to the board stop → Wait → Ride → (Walk to the transfer stop → Wait → Ride) → Final walk → Arrived.

import type { Itinerary, Leg, PlanStop, TransitLeg, WalkLeg } from "../../api/types.ts";

/** The planner ends a trip with a zero-length walk when it ends at a stop; there is nothing to walk. */
const NO_WALK_M = 5;

/** A walk leg with nothing to walk: no step, no timeline row, no 🚶 in the mode strip. */
export const isEmptyWalk = (leg: Leg): boolean => leg.type === "walk" && leg.distanceM < NO_WALK_M;

export type TripStep =
  /** To the stop of the next ride. */
  | { kind: "walk"; leg: WalkLeg; ride: TransitLeg; legIndex: number }
  | { kind: "wait"; ride: TransitLeg; legIndex: number }
  | { kind: "ride"; ride: TransitLeg; legIndex: number }
  | { kind: "final"; leg: WalkLeg; legIndex: number }
  | { kind: "arrived"; destination: PlanStop };

export function tripSteps(it: Itinerary, destination: PlanStop): TripStep[] {
  const steps: TripStep[] = [];
  it.legs.forEach((leg, legIndex) => {
    if (leg.type === "transit") {
      steps.push({ kind: "wait", ride: leg, legIndex }, { kind: "ride", ride: leg, legIndex });
      return;
    }
    if (isEmptyWalk(leg)) return;
    const ride = it.legs.slice(legIndex + 1).find((l): l is TransitLeg => l.type === "transit");
    steps.push(ride ? { kind: "walk", leg, ride, legIndex } : { kind: "final", leg, legIndex });
  });
  steps.push({ kind: "arrived", destination });
  return steps;
}

/** "Step 3 of 7" counts the steps before Arrived. */
export const countedSteps = (steps: TripStep[]) => steps.filter((s) => s.kind !== "arrived").length;
