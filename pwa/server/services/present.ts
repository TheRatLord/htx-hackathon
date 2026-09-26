// Shared response shapes for stops, so every endpoint describes a stop the same way.

import type { MetaStop } from "../gtfs/meta.ts";
import { findRoute } from "../gtfs/store.ts";

const KIND_LABEL: Record<MetaStop["kind"], string> = {
  stop: "Stop",
  "transit-center": "Transit center",
  "park-and-ride": "Park & Ride",
  rail: "Rail station",
};

export interface StopSummary {
  id: string;
  name: string;
  lat: number;
  lon: number;
  kind: MetaStop["kind"];
  directionLabel?: string;
  bearing?: number;
  side?: string;
  wheelchair?: boolean;
  routes: { id: string; name: string; color: string; textColor: string }[];
  /** e.g. "Stop #11424 · Southbound · Routes 25, 80" */
  subtitle: string;
}

export function stopSummary(s: MetaStop): StopSummary {
  const routes = s.routeIds.flatMap((id) => {
    const r = findRoute(id);
    return r ? [{ id: r.id, name: r.displayName, color: r.color, textColor: r.textColor }] : [];
  });
  return {
    id: s.id,
    name: s.name,
    lat: s.lat,
    lon: s.lon,
    kind: s.kind,
    ...(s.dir && { directionLabel: s.dir, bearing: s.bearing }),
    ...(s.side && { side: s.side }),
    ...(s.wheelchair !== undefined && { wheelchair: s.wheelchair }),
    routes,
    subtitle: stopSubtitle(s, routes.map((r) => r.name)),
  };
}

function stopSubtitle(s: MetaStop, routeNames: string[]): string {
  const label = s.kind === "stop" ? `Stop #${s.id}` : `${KIND_LABEL[s.kind]} · #${s.id}`;
  const routes = routeNames.length ? `${routeNames.length === 1 ? "Route" : "Routes"} ${routeNames.join(", ")}` : "No scheduled service";
  return [label, s.dir, routes].filter(Boolean).join(" · ");
}
