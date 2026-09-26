import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ClientRoute } from "../../shared/types.ts";
import { PWA_ROOT } from "../config.ts";
import { decodeStopTimes, type StopTimesIndex } from "./binary.ts";
import type { GtfsMeta, MetaStop, SearchIndexEntry } from "./meta.ts";

const DATA_DIR = join(PWA_ROOT, "server/data/generated");

export interface Gtfs {
  meta: GtfsMeta;
  st: StopTimesIndex;
  /** Trip index of every stop_time (derived at load). */
  stTrip: Uint16Array;
  search: SearchIndexEntry[];
  stops: MetaStop[];
  routes: ClientRoute[];
  stopIndex: Map<string, number>;
  routeIndex: Map<string, number>;
  tripIndex: Map<string, number>;
}

let loaded: Gtfs | null = null;

/** Loads generated GTFS data once (~0.3 s). */
export function gtfs(): Gtfs {
  if (loaded) return loaded;
  const metaPath = join(DATA_DIR, "gtfs.json");
  if (!existsSync(metaPath)) throw new Error("GTFS data missing: run `npm run data:build` first");
  const meta = JSON.parse(readFileSync(metaPath, "utf8")) as GtfsMeta;
  const st = decodeStopTimes(readFileSync(join(DATA_DIR, "stop-times.bin")));
  const stTrip = new Uint16Array(st.stTime.length);
  for (let t = 0; t < st.tripOff.length - 1; t++) stTrip.fill(t, st.tripOff[t], st.tripOff[t + 1]);
  loaded = {
    meta,
    st,
    stTrip,
    search: JSON.parse(readFileSync(join(DATA_DIR, "search-index.json"), "utf8")) as SearchIndexEntry[],
    stops: meta.stops,
    routes: meta.routes,
    stopIndex: new Map(meta.stops.map((s, i) => [s.id, i])),
    routeIndex: new Map(meta.routes.map((r, i) => [r.id, i])),
    tripIndex: new Map(meta.trips.ids.map((id, i) => [id, i])),
  };
  return loaded;
}

export function findStop(id: string): MetaStop | undefined {
  const g = gtfs();
  const i = g.stopIndex.get(id);
  return i === undefined ? undefined : g.stops[i];
}

/** Accepts "080", "80" or "Red". */
export function findRoute(id: string): ClientRoute | undefined {
  const g = gtfs();
  const i = g.routeIndex.get(id) ?? g.routeIndex.get(id.padStart(3, "0"));
  if (i !== undefined) return g.routes[i];
  return g.routes.find((r) => r.displayName.toLowerCase() === id.toLowerCase());
}

export interface TripInfo {
  id: string;
  route: ClientRoute;
  directionId: 0 | 1;
  headsign: string;
  directionLabel: string;
}

export function tripInfo(tripIdx: number): TripInfo {
  const g = gtfs();
  const t = g.meta.trips;
  const route = g.routes[t.route[tripIdx]];
  const directionId = t.direction[tripIdx] as 0 | 1;
  return {
    id: t.ids[tripIdx],
    route,
    directionId,
    headsign: g.meta.headsigns[t.headsign[tripIdx]],
    directionLabel: route.directions.find((d) => d.directionId === directionId)?.label ?? "",
  };
}
