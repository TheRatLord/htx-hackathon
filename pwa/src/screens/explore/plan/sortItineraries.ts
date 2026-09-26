import type { Itinerary } from "../../../api/types.ts";
import type { PlanSort } from "../../../lib/planQuery.ts";

/**
 * Soonest keeps the planner's order; the others sort client-side (spec D11). Each entry keeps its
 * index in the API order, which is what My Itinerary's URL uses, so a sort never changes a link.
 */
export function sortItineraries(its: Itinerary[], sort: PlanSort = "soonest"): { it: Itinerary; index: number }[] {
  const list = its.map((it, index) => ({ it, index }));
  const end = (x: { it: Itinerary }) => Date.parse(x.it.endTime);
  if (sort === "transfers") return list.sort((a, b) => a.it.transfers - b.it.transfers || end(a) - end(b));
  if (sort === "walk") return list.sort((a, b) => a.it.walkDistanceM - b.it.walkDistanceM || end(a) - end(b));
  return list;
}
