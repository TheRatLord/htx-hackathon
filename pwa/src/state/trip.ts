// The planned and the active trip (spec C.17, D11–D13), in localStorage["ridemetro.trip"].

import type { Itinerary, PlanResponse } from "../api/types.ts";
import type { PlanQuery } from "../lib/planQuery.ts";
import { persistentStore } from "../lib/storage.ts";

export interface StoredTrip {
  query: PlanQuery;
  /** Already fixture-shifted in offline mode (D11). */
  response: PlanResponse;
  chosen: number | null;
}

export interface ActiveTrip {
  itinerary: Itinerary;
  query: PlanQuery;
  stepIndex: number;
  startedAt: number;
  /** From a recorded plan: clock-based advancing is off (D13). */
  fixture: boolean;
}

interface TripState {
  planned?: StoredTrip;
  active?: ActiveTrip;
}

const store = persistentStore<TripState>("ridemetro.trip", {});

export const tripActions = {
  setPlanned(planned: StoredTrip | undefined) {
    store.set((s) => ({ ...s, planned }));
  },
  /** Starts `itinerary`, taking its query from the planned trip. */
  start(itinerary: Itinerary) {
    store.set((s) => ({
      ...s,
      active: {
        itinerary,
        query: s.planned?.query ?? {},
        stepIndex: 0,
        startedAt: Date.now(),
        fixture: s.planned?.response.source === "offline-fixture",
      },
    }));
  },
  setStep(stepIndex: number) {
    store.set((s) => (s.active ? { ...s, active: { ...s.active, stepIndex } } : s));
  },
  /** Ends the active trip; the planned one stays so it can be restarted. */
  end() {
    store.set((s) => ({ ...s, active: undefined }));
  },
};

export function useTrip() {
  return { ...store.use(), ...tripActions };
}
