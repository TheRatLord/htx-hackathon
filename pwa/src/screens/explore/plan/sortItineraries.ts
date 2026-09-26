import type { Itinerary } from "../../../api/types.ts";
import type { PlanSort } from "../../../lib/planQuery.ts";

/**
 * "Fastest" (v2.71's word) is the trip that gets there first; the others sort by their own measure,
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
