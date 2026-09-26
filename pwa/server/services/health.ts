// What the server is running on: feed version, data build and which live sources are on.

import { config } from "../config.ts";
import { gtfs } from "../gtfs/store.ts";

export function getHealth() {
  const g = gtfs();
  return {
    ok: true,
    feedVersion: g.meta.feedVersion,
    feedValid: `${g.meta.feedStart}–${g.meta.feedEnd}`,
    dataBuiltAt: g.meta.generatedAt,
    stops: g.stops.length,
    routes: g.routes.length,
    trips: g.meta.trips.ids.length,
    realtime: {
      metroArrivalsApi: Boolean(config.metroTransitApiKey) && !config.offline,
      gtfsRtTripUpdates: Boolean(config.metroApiKey) && !config.offline,
      simulated: config.demoRealtime,
    },
    offline: config.offline,
  };
}
