// Records live Transitous / Photon / OSRM / METRO alert responses into
// server/fixtures/ so the API can run with OFFLINE=1 (demo without network).
// Fixture files contain only the response body and a secret-free request key.

process.env.RECORD_FIXTURES = "1";
process.env.OFFLINE = "";

const { findLandmark } = await import("../server/services/landmarks.ts");
const { findStop } = await import("../server/gtfs/store.ts");
const { plan } = await import("../server/services/plan.ts");
const { photonPlaces, HOUSTON_CENTER } = await import("../server/services/places.ts");
const { walkRoute } = await import("../server/services/walk.ts");
const { getAlerts } = await import("../server/services/alerts.ts");

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
      await walkRoute(leg.from, leg.to, leg.to.id ? `stop #${leg.to.id}` : undefined);
      console.log(`  walk ${leg.from.name} -> ${leg.to.name}`);
    }
  }
  await pause();
}

for (const [from, to] of [
  [point("UH campus", 29.7199, -95.3422), stop("11424")],
  [point("UH campus", 29.7199, -95.3422), stop("11425")],
  [lm("city-hall"), lm("toyota-center")],
] as const) {
  await walkRoute(from, to);
  console.log(`walk ${from.name} -> ${to.name}`);
}

for (const q of ["hobby airport", "7800 airport blvd", "westheimer and kirby", "galleria", "rice village", "uh"]) {
  const places = await photonPlaces(q, HOUSTON_CENTER);
  console.log(`photon "${q}": ${places.length} places`);
  await pause();
}

const alerts = await getAlerts();
console.log(`alerts: ${alerts.alerts.length} (${alerts.source})`);
