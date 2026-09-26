// Tests never touch the network or real-time APIs: they run on the generated
// GTFS data (npm run data:build) and recorded fixtures.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PWA_ROOT, config } from "../server/config.ts";

if (!existsSync(join(PWA_ROOT, "server/data/generated/gtfs.json"))) {
  throw new Error("Generated GTFS data missing: run `npm run data:build` before `npm test`.");
}

config.metroApiKey = undefined;
config.metroTransitApiKey = undefined;
config.demoRealtime = false;
config.offline = true;
