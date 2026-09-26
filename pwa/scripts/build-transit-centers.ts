// Builds server/data/transit-centers.json: which bay each route leaves from.
//
// GTFS has one stop per transit center, but METRO's Transit Data API lists every
// bay as its own stop ("Ho414_4620_79_K"), and both its per-stop Arrivals and the
// GTFS-RT TripUpdates feed report the bay each trip uses. This script samples
// both (low request volume: one Arrivals call per hub + one feed download) and
// merges them with the GTFS routes serving each hub.
//
// Requires METRO_TRANSIT_API_KEY (and optionally METRO_API_KEY); run after data:build.
// Output is committed, so the server never needs the key for bay data.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { PWA_ROOT, config } from "../server/config.ts";
import { findStop, gtfs, tripInfo } from "../server/gtfs/store.ts";

const API = "https://api.ridemetro.org";
const PREFIX = "Ho414_4620_";
const OUT = join(PWA_ROOT, "server/data/transit-centers.json");
const HAND_AUTHORED = join(PWA_ROOT, "server/data/transit-centers.hand-authored.json");

interface ODataStop {
  StopId: string;
  Name: string;
  Lat: number;
  Lon: number;
}

interface ODataArrival {
  StopId: string;
  TripId: string;
  RouteName: string;
}

interface BayRoute {
  routeId: string;
  route: string;
  directionId: 0 | 1;
  directionLabel: string;
  headsign: string;
  observations: number;
  source: "metro-arrivals-api" | "gtfs-rt";
}

async function getJson<T>(path: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${API}${path}${sep}subscription-key=${config.metroTransitApiKey}`, {
    headers: { "User-Agent": config.userAgent },
  });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

async function main() {
  if (!config.metroTransitApiKey) throw new Error("METRO_TRANSIT_API_KEY is required");
  gtfs();
  const stops = (await getJson<{ value: ODataStop[] }>("/data/Stops")).value;

  // "Ho414_4620_79_K" -> hub stop "79", bay "K"
  const bays = new Map<string, { bay: string; hub: string; stop: ODataStop }>();
  for (const s of stops) {
    const m = s.StopId.slice(PREFIX.length).match(/^(\d+)_([A-Z0-9]+)$/);
    if (m) bays.set(`${m[1]}_${m[2]}`, { hub: m[1], bay: m[2], stop: s });
  }
  const hubs = [...new Set([...bays.values()].map((b) => b.hub))];
  console.log(`${bays.size} bays across ${hubs.length} hub stops`);

  // bayKey -> routeId|direction|headsign -> route info
  const observed = new Map<string, Map<string, BayRoute>>();
  const observe = (bayKey: string, tripId: string, source: BayRoute["source"]) => {
    const ti = gtfs().tripIndex.get(tripId);
    if (ti === undefined || !bays.has(bayKey)) return;
    const t = tripInfo(ti);
    const key = `${t.route.id}|${t.directionId}|${t.headsign}`;
    let m = observed.get(bayKey);
    if (!m) observed.set(bayKey, (m = new Map()));
    const prev = m.get(key);
    if (prev) prev.observations++;
    else
      m.set(key, {
        routeId: t.route.id,
        route: t.route.displayName,
        directionId: t.directionId,
        directionLabel: t.directionLabel,
        headsign: t.headsign,
        observations: 1,
        source,
      });
  };

  if (config.metroApiKey) {
    const res = await fetch(`${API}/GtfsRealtime/TripUpdates?subscription-key=${config.metroApiKey}`);
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(await res.arrayBuffer()));
    for (const e of feed.entity) {
      const tripId = e.tripUpdate?.trip?.tripId;
      for (const u of e.tripUpdate?.stopTimeUpdate ?? []) if (tripId && u.stopId?.includes("_")) observe(u.stopId, tripId, "gtfs-rt");
    }
  }

  for (const hub of hubs) {
    try {
      const arrivals = (await getJson<{ value: ODataArrival[] }>(`/data/Stops('${PREFIX}${hub}')/Arrivals`)).value;
      for (const a of arrivals) observe(a.StopId.slice(PREFIX.length), a.TripId.slice(PREFIX.length), "metro-arrivals-api");
    } catch (err) {
      console.warn(`  arrivals for hub ${hub} failed: ${(err as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  const hubGroups = new Map<string, string[]>();
  for (const hub of hubs) {
    const name = hubName(bays, hub);
    hubGroups.set(name, [...(hubGroups.get(name) ?? []), hub]);
  }

  const transitCenters = [...hubGroups.entries()].map(([name, hubStopIds]) => {
    const hubBays = [...bays.entries()]
      .filter(([, b]) => hubStopIds.includes(b.hub))
      .sort(([, a], [, b]) => a.bay.localeCompare(b.bay, "en", { numeric: true }));
    const assigned = new Set<string>();
    const bayList = hubBays.map(([key, b]) => {
      const routes = [...(observed.get(key)?.values() ?? [])].sort(
        (x, y) => x.route.localeCompare(y.route, "en", { numeric: true }) || x.directionId - y.directionId,
      );
      routes.forEach((r) => assigned.add(r.routeId));
      return { bay: b.bay, stopId: b.hub, lat: b.stop.Lat, lon: b.stop.Lon, routes };
    });
    const gtfsRoutes = [...new Set(hubStopIds.flatMap((id) => findStop(id)?.routeIds ?? []))];
    const first = findStop(hubStopIds[0]);
    return {
      id: slug(name),
      name,
      stopIds: hubStopIds,
      lat: first?.lat ?? hubBays[0][1].stop.Lat,
      lon: first?.lon ?? hubBays[0][1].stop.Lon,
      source: "metro-transit-data-api",
      bays: bayList,
      /** Routes serving the hub whose bay was not observed during sampling. */
      unassignedRoutes: gtfsRoutes.filter((r) => !assigned.has(r)).map((r) => findRouteName(r)),
    };
  });

  const handAuthored = JSON.parse(readFileSync(HAND_AUTHORED, "utf8")) as { transitCenters: unknown[] };
  const out = {
    generatedAt: new Date().toISOString(),
    note:
      "Bay assignments sampled from METRO's Transit Data API arrivals and GTFS-RT TripUpdates. Bays with no routes " +
      "had no departures during sampling. Bay coordinates are METRO's; many bays share the hub coordinate.",
    transitCenters: [...transitCenters, ...handAuthored.transitCenters],
  };
  writeFileSync(OUT, JSON.stringify(out, null, 1));
  const empty = transitCenters.flatMap((t) => t.bays).filter((b) => !b.routes.length).length;
  console.log(`Wrote ${transitCenters.length} transit centers (${empty} bays without observed routes) to ${OUT}`);
}

function hubName(bays: Map<string, { hub: string; stop: ODataStop }>, hub: string): string {
  const gtfsName = findStop(hub)?.name;
  const odName = [...bays.values()].find((b) => b.hub === hub && / - Bay /.test(b.stop.Name))?.stop.Name.split(" - ")[0];
  return (odName ?? gtfsName ?? hub).replace(/Transit center/i, "Transit Center").replace(/ - Platform \d+$/, "");
}

function findRouteName(routeId: string): string {
  return gtfs().routes.find((r) => r.id === routeId)?.displayName ?? routeId;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

await main();
