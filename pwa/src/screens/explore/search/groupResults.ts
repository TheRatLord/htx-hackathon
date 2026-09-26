// D5's client-side grouping and order of /api/search results.

import type { SearchResult, TransitCenterSummary } from "../../../api/types.ts";
import { haversineM } from "../../../lib/geo.ts";
import { stopMatches } from "../route/stopMatch.ts";

/** A transit center or stop that belongs to a landmark (Hobby Airport's TC and its stop). */
export interface Attached {
  tcs: TransitCenterSummary[];
  stops: SearchResult[];
}

/** A TC or stop this close to a landmark is shown under it, not as a separate result. */
const ATTACH_M = 400;

export type SearchSection =
  | { kind: "places"; items: SearchResult[]; attached: Map<string, Attached> }
  | { kind: "transitCenters"; items: TransitCenterSummary[] }
  | { kind: "stops"; items: SearchResult[] }
  | { kind: "routes"; items: SearchResult[] };

const ROUTE_TOKEN = "(\\d{1,3}|red|green|purple)";

/** "82", "Red", "route 40", "green line": the rider typed a route, so routes come first. */
export function isRouteQuery(q: string): boolean {
  return new RegExp(`^(?:route\\s+)?${ROUTE_TOKEN}(?:\\s+line)?$`, "i").test(q.trim());
}

/** "82 montrose" → { route: "82", stop: "montrose" } (the route + stop shortcut). */
export function parseRouteStopQuery(q: string): { route: string; stop: string } | undefined {
  const m = q.trim().match(new RegExp(`^${ROUTE_TOKEN}\\s+(.+)$`, "i"));
  return m ? { route: m[1], stop: m[2] } : undefined;
}

/** "westheimer and kirby", "Main & Lamar", "Main @ Gray": the rider wants the stops at a corner. */
function isCornerQuery(q: string): boolean {
  return /\s(and|&|@)\s|[&@]/i.test(q.trim());
}

const ORDER: SearchSection["kind"][] = ["transitCenters", "places", "stops", "routes"];
const CORNER_ORDER: SearchSection["kind"][] = ["stops", "transitCenters", "places", "routes"];
const LANDMARK_ORDER: SearchSection["kind"][] = ["places", "transitCenters", "stops", "routes"];
const ROUTE_ORDER: SearchSection["kind"][] = ["routes", "stops", "transitCenters", "places"];

/**
 * Places (landmarks first), transit centers, stops, routes; routes first for a route query and
 * stops first for a corner.
 * Without a curated landmark, a matching transit center goes before places: it is METRO's own
 * answer, while OpenStreetMap places often share its name ("northwest" finds four). Its platform
 * stops collapse into its one row, and transit centers whose name matches are added from the cache.
 */
export function groupResults(results: SearchResult[], tcs: TransitCenterSummary[], q: string): SearchSection[] {
  const tcHits = new Map<string, TransitCenterSummary>();
  const stops: SearchResult[] = [];
  for (const r of results.filter((x) => x.type === "stop")) {
    const tc = r.stop?.kind === "transit-center" ? tcs.find((c) => c.stopIds.includes(r.id)) : undefined;
    if (tc) tcHits.set(tc.id, tc);
    else stops.push(r);
  }
  for (const tc of tcs) if (!tcHits.has(tc.id) && stopMatches({ id: "", name: tc.name }, q)) tcHits.set(tc.id, tc);

  const places = [...results.filter((r) => r.type === "landmark"), ...results.filter((r) => r.type === "place")];
  // One answer per landmark: "Hobby Airport" once, with its transit center and stop under it.
  const attached = new Map<string, Attached>();
  const taken = new Set<string>();
  for (const lm of places.filter((p) => p.type === "landmark" && p.lat !== undefined && p.lon !== undefined)) {
    const near = (p: { lat: number; lon: number }) => haversineM(lm.lat!, lm.lon!, p.lat, p.lon) <= ATTACH_M;
    const own = new Set((lm.nearbyStops ?? []).map((s) => s.id));
    const a: Attached = {
      tcs: [...tcHits.values()].filter((tc) => !taken.has(`tc:${tc.id}`) && (tc.stopIds.some((id) => own.has(id)) || near(tc))),
      stops: stops.filter((r) => !taken.has(`stop:${r.id}`) && r.stop && (own.has(r.id) || near(r.stop))),
    };
    a.tcs.forEach((tc) => taken.add(`tc:${tc.id}`));
    a.stops.forEach((r) => taken.add(`stop:${r.id}`));
    if (a.tcs.length || a.stops.length) attached.set(lm.id, a);
  }
  const sections: SearchSection[] = [
    { kind: "transitCenters", items: [...tcHits.values()].filter((tc) => !taken.has(`tc:${tc.id}`)) },
    { kind: "places", items: places, attached },
    { kind: "stops", items: stops.filter((r) => !taken.has(`stop:${r.id}`)) },
    { kind: "routes", items: results.filter((r) => r.type === "route") },
  ];
  const hasLandmark = places.some((p) => p.type === "landmark");
  const order = isRouteQuery(q) ? ROUTE_ORDER : isCornerQuery(q) ? CORNER_ORDER : hasLandmark ? LANDMARK_ORDER : ORDER;
  return sections.filter((s) => s.items.length > 0).sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}
