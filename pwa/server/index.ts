import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { config } from "./config.ts";
import { gtfs } from "./gtfs/store.ts";

const t0 = performance.now();
gtfs();
console.log(`GTFS loaded in ${Math.round(performance.now() - t0)} ms`);

serve({ fetch: createApp().fetch, port: config.port }, (info) => {
  const modes = [
    !config.offline && config.metroTransitApiKey && "METRO arrivals API",
    !config.offline && config.metroApiKey && "GTFS-RT",
    config.demoRealtime && "simulated realtime",
    config.offline && "OFFLINE fixtures",
  ].filter(Boolean);
  console.log(`API listening on http://localhost:${info.port}/api (${modes.join(", ") || "schedule only"})`);
});
