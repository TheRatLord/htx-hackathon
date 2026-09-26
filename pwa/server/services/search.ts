// Unified search: stop ids, routes, curated landmarks, cross-street stops, then
// OpenStreetMap places. Results are tiered in that order, scored within a tier.

import type { LatLon } from "../../shared/types.ts";
import { findRoute, findStop, gtfs } from "../gtfs/store.ts";
import { stopsNear } from "../gtfs/spatial.ts";
import { formatDistance, haversineM } from "../lib/geo.ts";
import { matchScore, normalize, tokenize, type Token } from "../lib/text.ts";
import { landmarks, type Landmark } from "./landmarks.ts";
import { HOUSTON_CENTER, photonPlaces, type PlaceProvider } from "./places.ts";
import { stopSummary, type StopSummary } from "./present.ts";

export type SearchResultType = "stop" | "route" | "landmark" | "place";

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
  lat?: number;
  lon?: number;
  distanceM?: number;
  /** Stops at the same intersection share a group so the UI can show them together. */
  group?: string;
  stop?: StopSummary;
  /** Landmarks: stops riders should use to get there. */
  nearbyStops?: StopSummary[];
  route?: { id: string; name: string; color: string; textColor: string };
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  warnings: string[];
}

const MIN_SCORE = 0.7;
const MAX_STOPS = 12;
const MAX_PLACES = 5;

export async function search(
  q: string,
  opts: { near?: LatLon; limit?: number; places?: PlaceProvider | null } = {},
): Promise<SearchResponse> {
  const query = q.trim();
  const near = opts.near;
  const tokens = tokenize(query);
  const warnings: string[] = [];
  const results: SearchResult[] = [
    ...stopIdMatch(query),
    ...routeMatches(query, tokens),
    ...landmarkMatches(query, tokens),
    ...stopNameMatches(tokens, near),
  ];
  const deduped = results.filter((r, i) => results.findIndex((x) => x.type === r.type && x.id === r.id) === i);

  const places = opts.places === undefined ? photonPlaces : opts.places;
  if (places && !/^#?\d+$/.test(query)) {
    try {
      const found = await places(query, near ?? HOUSTON_CENTER);
      const landmarkHits = deduped.filter((r) => r.type === "landmark");
      deduped.push(
        ...found
          .filter((p) => !landmarkHits.some((l) => haversineM(l.lat!, l.lon!, p.lat, p.lon) < 400 || sameName(l.title, p.name)))
          .slice(0, MAX_PLACES)
          .map((p, i): SearchResult => {
            return {
              type: "place",
              id: `${p.lat.toFixed(5)},${p.lon.toFixed(5)}`,
              title: p.name,
              subtitle: `Place · ${p.address ?? p.kind.replaceAll("_", " ")}`,
              lat: p.lat,
              lon: p.lon,
              ...(near && { distanceM: Math.round(haversineM(near.lat, near.lon, p.lat, p.lon)) }),
              group: `place-${i}`,
            };
          }),
      );
    } catch (err) {
      warnings.push(`Address search is unavailable right now (${(err as Error).message}).`);
    }
  }
  return { query, results: deduped.slice(0, opts.limit ?? 25).map(stripGroupIfSingle), warnings };
}

function stripGroupIfSingle(r: SearchResult, _i: number, all: SearchResult[]): SearchResult {
  if (!r.group || all.filter((x) => x.group === r.group).length > 1) return r;
  const { group: _g, ...rest } = r;
  return rest;
}

function stopIdMatch(query: string): SearchResult[] {
  const m = query.match(/^(?:stop\s*)?#?\s*(\d{1,6})$/i);
  const stop = m && findStop(m[1]);
  if (!stop) return [];
  const s = stopSummary(stop);
  return [{ type: "stop", id: s.id, title: s.name, subtitle: s.subtitle, lat: s.lat, lon: s.lon, stop: s }];
}

function routeMatches(query: string, tokens: Token[]): SearchResult[] {
  const m = normalize(query).match(/^(?:route |bus |line )?(\d{1,3}|red|green|purple|silver)(?: line)?$/);
  const exact = m && findRoute(m[1] === "silver" ? "433" : m[1]);
  // Name matches ("westheimer" -> 82 Westheimer) must cover most of the route name,
  // so "tmc" doesn't surface every "... / TMC P&R" express route.
  const byName = gtfs().routes.filter((r) => {
    if (r === exact || matchScore(tokens, normalize(r.longName).split(" ")) < 1) return false;
    const nameTokens = tokenize(r.longName).filter((t) => t.role === "core");
    const covered = nameTokens.filter((nt) => tokens.some((qt) => qt.text === nt.text)).length;
    return covered / nameTokens.length >= 0.5;
  });
  return [...(exact ? [exact] : []), ...byName].map((r) => ({
    type: "route" as const,
    id: r.id,
    title: r.type === "rail" ? r.longName : `${r.displayName} ${r.longName}`,
    subtitle: `${r.type === "rail" ? "Rail line" : "Bus route"} · ${r.directions.map((d) => d.label).join(" / ")}`,
    route: { id: r.id, name: r.displayName, color: r.color, textColor: r.textColor },
  }));
}

function landmarkMatches(query: string, tokens: Token[]): SearchResult[] {
  const nq = normalize(query);
  const scored = landmarks()
    .map((l) => ({ l, score: landmarkScore(l, nq, tokens) }))
    .filter((x) => x.score >= MIN_SCORE);
  // A landmark named exactly by the query ("hobby" → Hobby Airport) hides partial matches
  // ("Hobby Center" under Theater District), which read as unrelated results.
  const exact = scored.filter((x) => x.score >= EXACT_LANDMARK);
  return (exact.length ? exact : scored)
    .sort((a, b) => b.score - a.score)
    .map(({ l }) => {
      const stops = (l.stopIds?.map(findStop).filter((s) => s !== undefined) ?? []).map(stopSummary);
      const nearbyStops = stops.length ? stops : stopsNear(l.lat, l.lon, 400, 3).map((n) => stopSummary(gtfs().stops[n.stopIdx]));
      return {
        type: "landmark" as const,
        id: l.id,
        title: l.name,
        subtitle: [capitalize(l.category), l.address].filter(Boolean).join(" · "),
        lat: l.lat,
        lon: l.lon,
        nearbyStops,
      };
    });
}

const EXACT_LANDMARK = 1.1;

function landmarkScore(l: Landmark, nq: string, tokens: Token[]): number {
  const names = [l.name, ...l.aliases].map(normalize);
  if (names.includes(nq)) return EXACT_LANDMARK;
  return Math.max(...names.map((n) => matchScore(tokens, n.split(" "))));
}

function stopNameMatches(tokens: Token[], near?: LatLon): SearchResult[] {
  const core = tokens.filter((t) => t.role === "core");
  // A lone number is a stop id or route, not a street name.
  if (!core.length || (core.length === 1 && /^\d+$/.test(core[0].text))) return [];
  const { search, stopIndex, stops } = gtfs();
  const scored = search
    .map((e) => ({ e, score: matchScore(tokens, e.tokens) }))
    .filter((x) => x.score >= MIN_SCORE)
    .map((x) => {
      const stop = stops[stopIndex.get(x.e.id)!];
      const distanceM = near ? haversineM(near.lat, near.lon, stop.lat, stop.lon) : undefined;
      return { ...x, stop, distanceM, group: x.e.key ?? x.e.id };
    });
  // Rank intersections by their best stop, then keep each intersection's stops together.
  const groupRank = new Map<string, { score: number; dist: number }>();
  for (const x of scored) {
    const g = groupRank.get(x.group);
    const dist = x.distanceM ?? 0;
    if (!g || x.score > g.score || (x.score === g.score && dist < g.dist)) groupRank.set(x.group, { score: x.score, dist });
  }
  scored.sort((a, b) => {
    const ga = groupRank.get(a.group)!;
    const gb = groupRank.get(b.group)!;
    return gb.score - ga.score || ga.dist - gb.dist || a.group.localeCompare(b.group) || (a.stop.dir ?? "").localeCompare(b.stop.dir ?? "");
  });
  return scored.slice(0, MAX_STOPS).map((x) => {
    const s = stopSummary(x.stop);
    const dist = x.distanceM !== undefined ? ` · ${formatDistance(x.distanceM)} away` : "";
    return {
      type: "stop",
      id: s.id,
      title: s.name,
      subtitle: s.subtitle + dist,
      lat: s.lat,
      lon: s.lon,
      ...(x.distanceM !== undefined && { distanceM: Math.round(x.distanceM) }),
      group: x.group,
      stop: s,
    };
  });
}

/** "Hobby Airport" vs "William P. Hobby Airport": every word of the landmark appears in the place. */
function sameName(landmark: string, place: string): boolean {
  const placeWords = normalize(place).split(" ");
  return normalize(landmark.replace(/\(.*\)/, "")).split(" ").every((w) => placeWords.includes(w));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
