// Records live Transitous / Photon / OSRM / METRO alert responses into
// server/fixtures/ so the API can run with OFFLINE=1 (demo without network).
// Fixture files contain only the response body and a secret-free request key.

import { readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { implausibleWalk } from "../shared/walk.ts";

process.env.RECORD_FIXTURES = "1";
process.env.OFFLINE = "";

const { findLandmark } = await import("../server/services/landmarks.ts");
const { findStop } = await import("../server/gtfs/store.ts");
const { plan } = await import("../server/services/plan.ts");
const { photonPlaces, HOUSTON_CENTER } = await import("../server/services/places.ts");
const { walkRoute } = await import("../server/services/walk.ts");
const { getAlerts } = await import("../server/services/alerts.ts");
const { getNearby } = await import("../server/services/nearby.ts");
const { PWA_ROOT } = await import("../server/config.ts");
const { haversineM } = await import("../server/lib/geo.ts");

const lm = (id: string) => {
  const l = findLandmark(id)!;
  return { name: l.name, lat: l.lat, lon: l.lon };
};
const stop = (id: string) => {
  const s = findStop(id)!;
  return { id: s.id, name: s.name, lat: s.lat, lon: s.lon };
};
const point = (name: string, lat: number, lon: number) => ({ name, lat, lon });

const trips = [
  [point("UH campus", 29.7199, -95.3422), lm("hobby-airport")],
  [lm("city-hall"), lm("texas-medical-center")],
  [stop("11424"), lm("galleria")],
  [lm("main-street-square"), lm("nrg-park")],
  [point("Northwest TC area", 29.7831, -95.4555), lm("rice-university")],
  [lm("downtown-tc"), lm("iah-airport")],
] as const;

const pause = () => new Promise((r) => setTimeout(r, 1500));

for (const [from, to] of trips) {
  const res = await plan({ from, to });
  console.log(`plan ${from.name} -> ${to.name}: ${res.itineraries.length} itineraries`);
  for (const leg of res.itineraries[0]?.legs ?? []) {
    if (leg.type === "walk" && leg.distanceM > 20) {
      await walkRoute(leg.from, leg.to, leg.to.id ? { label: `stop #${leg.to.id}`, name: leg.to.name } : undefined);
      console.log(`  walk ${leg.from.name} -> ${leg.to.name}`);
    }
  }
  await pause();
}

for (const [from, to] of [
  [point("UH campus", 29.7199, -95.3422), stop("11424")],
  [point("UH campus", 29.7199, -95.3422), stop("11425")],
  [lm("city-hall"), lm("toyota-center")],
  // Section E: F4 (Walk here to 342).
  [point("F4 GPS", 29.7563, -95.3639), stop("342")],
] as const) {
  await walkRoute(from, to);
  console.log(`walk ${from.name} -> ${to.name}`);
}

// The street walks /nearby?precise=1 asks OSRM for (its 3 nearest stops) at every section-E GPS
// position, so offline cards show the same minutes as online. One request at a time, to go easy
// on the public OSRM server. The D4 museum walks are not recorded: OSRM puts 688 (345 m) behind
// 2504 (331 m), against F11's end state (filed in docs/design/requests.md).
for (const [name, lat, lon] of [
  ["F1/F4/F10", 29.7563, -95.3639],
  ["F2/F5", 29.744, -95.39],
  ["F3/F8", 29.7199, -95.3422],
  ["F7", 29.789, -95.456],
  ["F11", 29.75, -95.36],
] as const) {
  const { stops } = await getNearby(lat, lon);
  for (const { stop: s } of stops.slice(0, 3)) {
    const w = await walkRoute({ lat, lon }, s);
    console.log(`nearby ${name} -> ${s.id}: ${w.source}`);
    await pause();
  }
}

for (const q of ["hobby airport", "7800 airport blvd", "westheimer and kirby", "galleria", "rice village", "uh"]) {
  const places = await photonPlaces(q, HOUSTON_CENTER);
  console.log(`photon "${q}": ${places.length} places`);
  await pause();
}

const alerts = await getAlerts();
console.log(`alerts: ${alerts.alerts.length} (${alerts.source})`);

// OSRM can snap a downtown start onto a tunnel entrance (a 1.1 km route for a 35 m walk). Offline,
// such a recording would replace the right straight-line estimate, so it is not kept.
const osrmDir = join(PWA_ROOT, "server/fixtures/osrm");
for (const file of readdirSync(osrmDir)) {
  const path = join(osrmDir, file);
  const { key, json } = JSON.parse(readFileSync(path, "utf8")) as { key: string; json: { routes?: { distance: number }[] } };
  const [[lon1, lat1], [lon2, lat2]] = key.replace(/^foot\//, "").split(";").map((p) => p.split(",").map(Number));
  const straightM = haversineM(lat1, lon1, lat2, lon2);
  const routedM = json.routes?.[0]?.distance ?? 0;
  if (implausibleWalk(straightM, routedM)) {
    rmSync(path);
    console.log(`dropped ${key}: ${Math.round(routedM)} m routed for ${Math.round(straightM)} m straight`);
  }
}
