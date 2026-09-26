// The running trip (spec D13): the current step, where the rider is on the ride, and moving on by
// itself when a step is done. Manual Previous / Next always win: a step entered by hand only
// auto-advances after its "done" condition has first been false.

import { useEffect, useMemo, useRef, useState } from "react";
import { useTripStops } from "../../api/hooks.ts";
import type { LatLon, PlanStop } from "../../api/types.ts";
import { useNow } from "../../state/clock.ts";
import { tripActions, type ActiveTrip } from "../../state/trip.ts";
import { ridePosition, rideStops, stepDone, type PositionSource } from "./progress.ts";
import { countedSteps, tripSteps } from "./steps.ts";

/** Where the trip ends: the last leg's destination, named as the rider chose it. */
export function destinationOf(active: ActiveTrip): PlanStop {
  const last = active.itinerary.legs.at(-1);
  const place = last ? (last.type === "walk" ? last.to : last.alight) : { name: "", lat: 0, lon: 0 };
  return { ...place, name: active.query.toName ?? place.name };
}

export function useLiveTrip(active: ActiveTrip, fix: LatLon | undefined) {
  const now = useNow();
  const destination = useMemo(() => destinationOf(active), [active]);
  const steps = useMemo(() => tripSteps(active.itinerary, destination), [active.itinerary, destination]);
  const stepIndex = Math.min(Math.max(active.stepIndex, 0), steps.length - 1);
  const step = steps[stepIndex];
  const ride = step.kind === "wait" || step.kind === "ride" ? step.ride : undefined;
  const useClock = !active.fixture;

  const tripStops = useTripStops(ride?.tripId, ride?.board.id);
  const stops = useMemo(() => ride && rideStops(ride, tripStops.data), [ride, tripStops.data]);

  // The stop index only moves forward, per ride.
  const [reached, setReached] = useState<Record<string, number>>({});
  const rideKey = ride ? `${ride.tripId}:${ride.board.id}` : "";
  const position = stops ? ridePosition(stops, reached[rideKey] ?? 0, { fix, now, useClock }) : undefined;
  useEffect(() => {
    if (position && position.index > (reached[rideKey] ?? 0)) setReached((r) => ({ ...r, [rideKey]: position.index }));
  }, [position, reached, rideKey]);

  const done = stepDone(step, { fix, now, useClock, rideIndex: position?.index, rideStopCount: stops?.length });
  const manual = useRef<number | null>(null);
  useEffect(() => {
    if (!done) {
      if (manual.current === stepIndex) manual.current = null;
      return;
    }
    if (manual.current !== stepIndex && stepIndex < steps.length - 1) tripActions.setStep(stepIndex + 1);
  }, [done, stepIndex, steps.length]);

  const goTo = (i: number) => {
    const next = Math.min(Math.max(i, 0), steps.length - 1);
    manual.current = next;
    tripActions.setStep(next);
  };

  const source: PositionSource = position?.source ?? (fix ? "location" : useClock ? "schedule" : "none");
  return {
    steps,
    step,
    stepIndex,
    total: countedSteps(steps),
    destination,
    stops,
    rideIndex: position?.index ?? 0,
    source,
    goTo,
  };
}
