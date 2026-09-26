import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PWA_ROOT } from "../config.ts";

export interface BayRoute {
  routeId: string;
  route: string;
  directionId: 0 | 1;
  directionLabel: string;
  headsign: string;
  source: string;
}

export interface TransitCenter {
  id: string;
  name: string;
  stopIds: string[];
  lat: number;
  lon: number;
  source: "metro-transit-data-api" | "hand-authored-demo";
  sourceNote?: string;
  bays: { bay: string; stopId: string; lat: number; lon: number; routes: BayRoute[] }[];
  unassignedRoutes: string[];
}

let centers: TransitCenter[] | null = null;

export function transitCenters(): TransitCenter[] {
  centers ??= (
    JSON.parse(readFileSync(join(PWA_ROOT, "server/data/transit-centers.json"), "utf8")) as { transitCenters: TransitCenter[] }
  ).transitCenters;
  return centers;
}

export function transitCenterForStop(stopId: string): TransitCenter | undefined {
  return transitCenters().find((t) => t.stopIds.includes(stopId));
}

/** Bay a route/direction usually departs from at a hub stop. */
export function bayFor(stopId: string, routeId: string, directionId: number, headsign: string): string | undefined {
  const tc = transitCenterForStop(stopId);
  if (!tc) return undefined;
  const bays = tc.bays.filter((b) => b.stopId === stopId && b.routes.some((r) => r.routeId === routeId && r.directionId === directionId));
  return (bays.find((b) => b.routes.some((r) => r.routeId === routeId && r.headsign === headsign)) ?? bays[0])?.bay;
}
