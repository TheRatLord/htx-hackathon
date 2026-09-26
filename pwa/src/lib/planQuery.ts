// The only reader and writer of the trip-planner URL (spec G.4). `from` / `to` are
// "lat,lon", a stop id, or "landmark:<id>", exactly what /api/plan accepts.

import type { LatLon, SearchResult } from "../api/types.ts";
import { t } from "../i18n/index.ts";
import { formatLatLon } from "./geo.ts";

export type PlanSort = "soonest" | "transfers" | "walk";

export interface PlanQuery {
  from?: string;
  fromName?: string;
  to?: string;
  toName?: string;
  /** ISO time; absent means now. */
  time?: string;
  arriveBy?: boolean;
  sort?: PlanSort;
}

const SORTS: PlanSort[] = ["soonest", "transfers", "walk"];

export function parsePlanQuery(search: URLSearchParams): PlanQuery {
  const q: PlanQuery = {};
  for (const k of ["from", "fromName", "to", "toName", "time"] as const) {
    const v = search.get(k);
    if (v) q[k] = v;
  }
  if (search.get("arriveBy") === "1") q.arriveBy = true;
  const sort = search.get("sort") as PlanSort | null;
  if (sort && SORTS.includes(sort)) q.sort = sort;
  return q;
}

export function planSearchParams(q: PlanQuery): URLSearchParams {
  const p = new URLSearchParams();
  for (const k of ["from", "fromName", "to", "toName", "time"] as const) if (q[k]) p.set(k, q[k]!);
  if (q.arriveBy) p.set("arriveBy", "1");
  if (q.sort) p.set("sort", q.sort);
  return p;
}

/** "/explore/plan?…" (list) or "/explore/plan/<index>?…" (detail). */
export function planUrl(q: PlanQuery, extra: { edit?: boolean; index?: number } = {}): string {
  const p = planSearchParams(q);
  if (extra.edit) p.set("edit", "1");
  const qs = p.toString();
  return `/explore/plan${extra.index !== undefined ? `/${extra.index}` : ""}${qs ? `?${qs}` : ""}`;
}

type PickResult = SearchResult | { kind: "my-location"; point: LatLon };

function placeOf(result: PickResult): { value: string; name: string } | undefined {
  if ("kind" in result) return { value: formatLatLon(result.point), name: t("common.myLocation") };
  switch (result.type) {
    case "stop":
      return { value: result.id, name: result.title };
    case "landmark":
      return { value: `landmark:${result.id}`, name: result.title };
    case "place":
      return result.lat !== undefined && result.lon !== undefined
        ? { value: formatLatLon({ lat: result.lat, lon: result.lon }), name: result.title }
        : undefined;
    default:
      return undefined;
  }
}

/** Search pick mode's way back: the planner URL `returnTo` with `field` filled from the tapped result. */
export function encodePick(returnTo: string, field: "from" | "to", result: PickResult): string {
  const url = new URL(returnTo, "http://x");
  const q = parsePlanQuery(url.searchParams);
  const place = placeOf(result);
  if (place) {
    q[field] = place.value;
    q[field === "from" ? "fromName" : "toName"] = place.name;
  }
  const index = url.pathname.match(/^\/explore\/plan\/(\d+)$/)?.[1];
  return planUrl(q, index !== undefined ? { index: Number(index) } : {});
}
