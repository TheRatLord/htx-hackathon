import type { Itinerary } from "../../../api/types.ts";
import { tripShape } from "../../../features/trip/departures.ts";
import type { PlanSort } from "../../../lib/planQuery.ts";

/**
 * "Arrives first" (v2.71's "Fastest") is the trip that gets there first; the others sort by their own measure,
 * then by arrival (spec D11). Sorting is client-side, and each entry keeps its
 * index in the API order, which is what My Itinerary's URL uses, so a sort never changes a link.
 */
export function sortItineraries(its: Itinerary[], sort: PlanSort = "soonest"): { it: Itinerary; index: number }[] {
  const list = its.map((it, index) => ({ it, index }));
  const end = (x: { it: Itinerary }) => Date.parse(x.it.endTime);
  if (sort === "transfers") return list.sort((a, b) => a.it.transfers - b.it.transfers || end(a) - end(b));
  if (sort === "walk") return list.sort((a, b) => a.it.walkDistanceM - b.it.walkDistanceM || end(a) - end(b));
  return list.sort((a, b) => end(a) - end(b));
}

/** A later copy of a trip (same buses, same stops) folds into the first card (22). */
export function foldRepeats<T extends { it: Itinerary }>(list: T[]): { first: T; later: T[] }[] {
  const groups = new Map<string, { first: T; later: T[] }>();
  for (const x of list) {
    const key = tripShape(x.it);
    const g = groups.get(key);
    if (g) g.later.push(x);
    else groups.set(key, { first: x, later: [] });
  }
  return [...groups.values()];
}
