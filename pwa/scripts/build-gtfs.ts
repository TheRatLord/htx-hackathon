// Builds client and server data from METRO's static GTFS feed.
// Usage: npm run data:build   (GTFS_DIR=/path/to/extracted/gtfs to skip the download)

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Cardinal, ClientRoute, ClientStop, RouteDirection, StopKind } from "../shared/types.ts";
import { encodeStopTimes } from "../server/gtfs/binary.ts";
import type { GtfsMeta, MetaStop, SearchIndexEntry } from "../server/gtfs/meta.ts";
import { cleanRouteLongName, displayRouteName } from "../server/gtfs/names.ts";
import { bearingAlong, cardinalOf, circularMean, encodePolyline, prepareLine, simplify } from "../server/lib/geo.ts";
import { cleanName, intersectionKey, normalize, streetCore } from "../server/lib/text.ts";
import { parseCsv, parseGtfsTime } from "./gtfs/csv.ts";
import { ensureGtfs } from "./gtfs/source.ts";

const ROOT = resolve(import.meta.dirname, "..");
const CLIENT_OUT = join(ROOT, "public/data");
const SERVER_OUT = join(ROOT, "server/data/generated");

/** Minimum agreement of shape bearings before we claim a direction/side. */
const DIRECTION_CONFIDENCE = 0.75;
const SIDE_CONFIDENCE = 0.9;

const RIGHT_SIDE: Record<Cardinal, string> = {
  Northbound: "East",
  Southbound: "West",
  Eastbound: "South",
  Westbound: "North",
};

interface StopTimeRow {
  seq: number;
  stop: number;
  time: number;
  boardable: boolean;
}

async function main() {
  const t0 = Date.now();
  const dir = await ensureGtfs(join(ROOT, ".cache"));
  const read = (f: string) => parseCsv(readFileSync(join(dir, f), "utf8"));

  const stopsRaw = read("stops.txt");
  const routesRaw = read("routes.txt");
  const tripsRaw = read("trips.txt");
  const feedInfo = read("feed_info.txt")[0] ?? {};
  const dirNames = read("direction_names_exceptions.txt");
  const calendarRaw = read("calendar.txt");
  const calendarDatesRaw = read("calendar_dates.txt");

  const stopIdx = new Map(stopsRaw.map((s, i) => [s.stop_id, i]));
  const routeIdx = new Map(routesRaw.map((r, i) => [r.route_id, i]));

  // route-level direction labels keyed by "<short> <long>|<direction_id>"
  const dirLabel = new Map(dirNames.map((d) => [`${d.route_name}|${d.direction_id}`, d.direction_name]));
  const routeDirLabel = (r: Record<string, string>, d: number) =>
    dirLabel.get(`${r.route_short_name} ${r.route_long_name}|${d}`) ?? (d === 0 ? "Outbound" : "Inbound");

  console.log("Reading shapes");
  const shapes = new Map<string, [number, number, number][]>();
  for (const r of read("shapes.txt")) {
    let arr = shapes.get(r.shape_id);
    if (!arr) shapes.set(r.shape_id, (arr = []));
    arr.push([Number(r.shape_pt_sequence), Number(r.shape_pt_lat), Number(r.shape_pt_lon)]);
  }
  const shapePts = new Map<string, [number, number][]>();
  for (const [id, pts] of shapes) shapePts.set(id, pts.sort((a, b) => a[0] - b[0]).map(([, la, lo]) => [la, lo]));

  console.log("Reading stop_times");
  const tripIdx = new Map(tripsRaw.map((t, i) => [t.trip_id, i]));
  const byTrip: StopTimeRow[][] = tripsRaw.map(() => []);
  readStopTimes(join(dir, "stop_times.txt"), (tripId, row) => {
    const ti = tripIdx.get(tripId);
    const si = stopIdx.get(row.stopId);
    if (ti === undefined || si === undefined) return;
    byTrip[ti].push({ seq: row.seq, stop: si, time: row.time, boardable: row.pickup !== 1 });
  });
  for (const st of byTrip) st.sort((a, b) => a.seq - b.seq);

  console.log("Deriving patterns, directions and bearings");
  const headsigns: string[] = [];
  const headsignIdx = new Map<string, number>();
  const services = [...new Set(tripsRaw.map((t) => t.service_id))];
  const serviceIdx = new Map(services.map((s, i) => [s, i]));

  // (shape, stop) -> number of trips; route ids boarding at each stop
  const shapeStopCount = new Map<string, number>();
  const stopRoutes = stopsRaw.map(() => new Set<number>());
  // neighbours along patterns, for the "which side of which street" check
  const neighbours = stopsRaw.map(() => new Set<number>());
  // pattern counts per route/direction
  const patterns = new Map<string, Map<string, { count: number; stops: number[]; shapes: Map<string, number> }>>();
  const headsignCounts = new Map<string, Map<string, number>>();

  tripsRaw.forEach((t, ti) => {
    const st = byTrip[ti];
    const ri = routeIdx.get(t.route_id)!;
    const rdKey = `${t.route_id}|${t.direction_id}`;
    if (!headsignIdx.has(t.trip_headsign)) {
      headsignIdx.set(t.trip_headsign, headsigns.length);
      headsigns.push(t.trip_headsign);
    }
    inc(getOrSet(headsignCounts, rdKey, () => new Map()), t.trip_headsign);
    const sig = st.map((s) => s.stop).join(",");
    const pm = getOrSet(patterns, rdKey, () => new Map());
    const p = getOrSet(pm, sig, () => ({ count: 0, stops: st.map((s) => s.stop), shapes: new Map<string, number>() }));
    p.count++;
    inc(p.shapes, t.shape_id);
    st.forEach((s, i) => {
      if (i < st.length - 1 && s.boardable) stopRoutes[s.stop].add(ri);
      if (i > 0) neighbours[s.stop].add(st[i - 1].stop);
      if (i < st.length - 1) neighbours[s.stop].add(st[i + 1].stop);
      if (i < st.length - 1 && t.shape_id) inc(shapeStopCount, `${t.shape_id}|${s.stop}`);
    });
  });

  const stopBearings = stopsRaw.map(() => [] as { bearing: number; weight: number }[]);
  const byShape = new Map<string, { stop: number; count: number }[]>();
  for (const [key, count] of shapeStopCount) {
    const [shapeId, stop] = key.split("|");
    getOrSet(byShape, shapeId, () => []).push({ stop: Number(stop), count });
  }
  for (const [shapeId, list] of byShape) {
    const pts = shapePts.get(shapeId);
    if (!pts) continue;
    const line = prepareLine(pts);
    for (const { stop, count } of list) {
      const s = stopsRaw[stop];
      const b = bearingAlong(line, Number(s.stop_lat), Number(s.stop_lon));
      if (b && b.offsetM < 80) stopBearings[stop].push({ bearing: b.bearing, weight: count });
    }
  }

  const railStops = new Set<number>();
  tripsRaw.forEach((t, ti) => {
    if (routesRaw[routeIdx.get(t.route_id)!].route_type !== "3") byTrip[ti].forEach((s) => railStops.add(s.stop));
  });

  const metaStops: MetaStop[] = stopsRaw.map((s, i) => {
    const name = cleanName(s.stop_name);
    const kind = stopKind(name, railStops.has(i));
    const mean = circularMean(stopBearings[i]);
    const stop: MetaStop = {
      id: s.stop_id,
      name,
      desc: s.stop_desc,
      lat: Number(s.stop_lat),
      lon: Number(s.stop_lon),
      routeIds: [...stopRoutes[i]].sort((a, b) => a - b).map((r) => routesRaw[r].route_id),
      kind,
    };
    // Hubs are served in every direction, so a single travel direction would mislead.
    const isHub = kind === "transit-center" || kind === "park-and-ride";
    if (mean && mean.strength >= DIRECTION_CONFIDENCE && !isHub) {
      stop.dir = cardinalOf(mean.bearing);
      stop.bearing = Math.round(mean.bearing);
      const side = sideHint(name, stop.dir, mean.strength, [...neighbours[i]].map((n) => stopsRaw[n].stop_name));
      if (side && kind === "stop") stop.side = side;
    }
    if (s.wheelchair_boarding === "1") stop.wheelchair = true;
    else if (s.wheelchair_boarding === "2") stop.wheelchair = false;
    return stop;
  });

  const routes: ClientRoute[] = routesRaw.map((r) => {
    const directions: RouteDirection[] = [];
    for (const d of [0, 1] as const) {
      const pm = patterns.get(`${r.route_id}|${d}`);
      if (!pm) continue;
      const best = [...pm.values()].sort((a, b) => b.count - a.count)[0];
      const shapeId = [...best.shapes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      const pts = shapeId ? shapePts.get(shapeId) : undefined;
      directions.push({
        directionId: d,
        label: routeDirLabel(r, d),
        headsigns: [...headsignCounts.get(`${r.route_id}|${d}`)!.entries()].sort((a, b) => b[1] - a[1]).map(([h]) => h),
        stopIds: best.stops.map((si) => stopsRaw[si].stop_id),
        shape: pts ? encodePolyline(simplify(pts, 5)) : "",
      });
    }
    return {
      id: r.route_id,
      shortName: r.route_short_name,
      displayName: displayRouteName(r.route_short_name),
      longName: cleanRouteLongName(r.route_long_name),
      color: `#${r.route_color || "004080"}`,
      textColor: `#${r.route_text_color || "FFFFFF"}`,
      type: r.route_type === "3" ? "bus" : "rail",
      directions,
    };
  });

  console.log("Building departure index");
  const tripOff = new Uint32Array(tripsRaw.length + 1);
  byTrip.forEach((st, i) => (tripOff[i + 1] = tripOff[i] + st.length));
  const nST = tripOff[tripsRaw.length];
  const stTime = new Int32Array(nST);
  const stStop = new Uint16Array(nST);
  const perStop = stopsRaw.map(() => [] as number[]);
  byTrip.forEach((st, ti) =>
    st.forEach((s, j) => {
      const k = tripOff[ti] + j;
      stTime[k] = s.time;
      stStop[k] = s.stop;
      if (j < st.length - 1 && s.boardable) perStop[s.stop].push(k);
    }),
  );
  const depOff = new Uint32Array(stopsRaw.length + 1);
  perStop.forEach((l, i) => (depOff[i + 1] = depOff[i] + l.length));
  const depRef = new Uint32Array(depOff[stopsRaw.length]);
  perStop.forEach((l, i) => depRef.set(l.sort((a, b) => stTime[a] - stTime[b]), depOff[i]));

  const meta: GtfsMeta = {
    feedVersion: feedInfo.feed_version ?? "",
    feedStart: feedInfo.feed_start_date ?? "",
    feedEnd: feedInfo.feed_end_date ?? "",
    generatedAt: new Date().toISOString(),
    stops: metaStops,
    routes,
    trips: {
      ids: tripsRaw.map((t) => t.trip_id),
      route: tripsRaw.map((t) => routeIdx.get(t.route_id)!),
      service: tripsRaw.map((t) => serviceIdx.get(t.service_id)!),
      direction: tripsRaw.map((t) => Number(t.direction_id)),
      headsign: tripsRaw.map((t) => headsignIdx.get(t.trip_headsign)!),
    },
    headsigns,
    services,
    calendar: calendarRaw.map((c) => ({
      serviceId: c.service_id,
      days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((d) => Number(c[d])),
      start: c.start_date,
      end: c.end_date,
    })),
    calendarDates: calendarDatesRaw.map((c) => ({
      serviceId: c.service_id,
      date: c.date,
      type: c.exception_type === "1" ? 1 : 2,
    })),
  };

  const routeDisplay = new Map(routes.map((r) => [r.id, r.displayName]));
  const clientStops: ClientStop[] = metaStops.map((s) => ({
    id: s.id,
    name: s.name,
    lat: s.lat,
    lon: s.lon,
    ...(s.dir && { dir: s.dir, bearing: s.bearing }),
    ...(s.side && { side: s.side }),
    routes: s.routeIds.map((r) => routeDisplay.get(r)!),
    kind: s.kind,
    ...(s.wheelchair !== undefined && { wheelchair: s.wheelchair }),
  }));

  const searchIndex: SearchIndexEntry[] = metaStops.map((s) => ({
    id: s.id,
    name: s.name,
    tokens: [...new Set(normalize(`${s.name} ${s.desc}`).split(" ").filter(Boolean))],
    key: intersectionKey(s.name),
  }));

  mkdirSync(CLIENT_OUT, { recursive: true });
  mkdirSync(SERVER_OUT, { recursive: true });
  const write = (path: string, data: string | Buffer) => {
    writeFileSync(path, data);
    console.log(`  ${path.replace(ROOT + "/", "")}  ${(data.length / 1024).toFixed(0)} KB`);
  };
  write(join(CLIENT_OUT, "stops.json"), JSON.stringify(clientStops));
  write(join(CLIENT_OUT, "routes.json"), JSON.stringify(routes));
  write(join(SERVER_OUT, "gtfs.json"), JSON.stringify(meta));
  write(join(SERVER_OUT, "search-index.json"), JSON.stringify(searchIndex));
  write(join(SERVER_OUT, "stop-times.bin"), encodeStopTimes({ tripOff, stTime, depOff, depRef, stStop }));

  const withDir = metaStops.filter((s) => s.dir).length;
  const withSide = metaStops.filter((s) => s.side).length;
  console.log(
    `Done in ${((Date.now() - t0) / 1000).toFixed(1)}s: ${metaStops.length} stops (${withDir} with direction, ${withSide} with side), ` +
      `${routes.length} routes, ${tripsRaw.length} trips, ${nST} stop_times, ${depRef.length} departures`,
  );
}

function readStopTimes(path: string, onRow: (tripId: string, r: { seq: number; stopId: string; time: number; pickup: number }) => void) {
  const text = readFileSync(path, "utf8");
  let pos = text.indexOf("\n") + 1;
  const header = text.slice(0, pos).trim().split(",");
  const col = (n: string) => header.indexOf(n);
  const [cTrip, cDep, cStop, cSeq, cPickup] = ["trip_id", "departure_time", "stop_id", "stop_sequence", "pickup_type"].map(col);
  while (pos < text.length) {
    let end = text.indexOf("\n", pos);
    if (end < 0) end = text.length;
    const line = text.slice(pos, end).replace(/\r$/, "");
    pos = end + 1;
    if (!line) continue;
    const f = line.split(",");
    onRow(f[cTrip], { seq: Number(f[cSeq]), stopId: f[cStop].trim(), time: parseGtfsTime(f[cDep]), pickup: Number(f[cPickup] || 0) });
  }
}

function stopKind(name: string, isRail: boolean): StopKind {
  if (isRail) return "rail";
  if (/park\s*(&|and)\s*ride|\bP&R\b/i.test(name)) return "park-and-ride";
  if (!name.includes("@") && /transit center|\bTC\b/i.test(name)) return "transit-center";
  return "stop";
}

/**
 * US buses board on the right, so a northbound stop sits on the east side of
 * its street. Only claimed when the bus demonstrably travels along the stop's
 * named street (a neighbouring stop on the pattern shares that street).
 */
function sideHint(name: string, dir: Cardinal, strength: number, neighbourNames: string[]): string | undefined {
  if (strength < SIDE_CONFIDENCE || !name.includes(" @ ")) return undefined;
  const street = name.split(" @ ")[0];
  const core = streetCore(street).join(" ");
  const along = neighbourNames.some((n) => n.includes(" @ ") && streetCore(n.split(" @ ")[0]).join(" ") === core);
  return along ? `${RIGHT_SIDE[dir]} side of ${street}` : undefined;
}

function getOrSet<K, V>(m: Map<K, V>, k: K, make: () => V): V {
  let v = m.get(k);
  if (v === undefined) m.set(k, (v = make()));
  return v;
}

function inc<K>(m: Map<K, number>, k: K) {
  m.set(k, (m.get(k) ?? 0) + 1);
}

await main();
