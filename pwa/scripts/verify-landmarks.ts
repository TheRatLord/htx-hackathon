// Sanity-checks server/data/landmarks.json: compares each landmark with Photon's
// top geocoding hit and reports the nearest METRO stop. Flags anything suspicious.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PWA_ROOT, config } from "../server/config.ts";
import { gtfs } from "../server/gtfs/store.ts";
import { haversineM } from "../server/lib/geo.ts";

interface Landmark {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

const { landmarks } = JSON.parse(readFileSync(join(PWA_ROOT, "server/data/landmarks.json"), "utf8")) as { landmarks: Landmark[] };
const stops = gtfs().stops;

for (const l of landmarks) {
  const q = encodeURIComponent(`${l.name.replace(/\(.*\)/, "")} Houston`);
  const res = await fetch(`https://photon.komoot.io/api/?q=${q}&lat=29.76&lon=-95.37&limit=1`, { headers: { "User-Agent": config.userAgent } });
  const hit = ((await res.json()) as { features: { geometry: { coordinates: [number, number] }; properties: { name?: string } }[] }).features[0];
  const photonM = hit ? haversineM(l.lat, l.lon, hit.geometry.coordinates[1], hit.geometry.coordinates[0]) : NaN;
  let nearest = { d: Infinity, name: "" };
  for (const s of stops) {
    const d = haversineM(l.lat, l.lon, s.lat, s.lon);
    if (d < nearest.d) nearest = { d, name: `#${s.id} ${s.name}` };
  }
  const flag = photonM > 600 || nearest.d > 500 ? "CHECK" : "ok";
  console.log(
    `${flag.padEnd(5)} ${l.id.padEnd(26)} photon: ${Math.round(photonM)} m (${hit?.properties.name ?? "-"})  nearest stop: ${Math.round(nearest.d)} m ${nearest.name}`,
  );
  await new Promise((r) => setTimeout(r, 350));
}
