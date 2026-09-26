// METRO service alerts (GTFS-RT protobuf) with a demo fallback.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { PWA_ROOT, config } from "../config.ts";
import { findRoute, findStop } from "../gtfs/store.ts";
import { TtlCache } from "../lib/cache.ts";
import { fetchUpstream } from "../lib/upstream.ts";

const { FeedMessage, Alert: PbAlert } = GtfsRealtimeBindings.transit_realtime;
const ALERTS_URL = "https://api.ridemetro.org/v2alertspb/alerts.pb";

export interface Alert {
  id: string;
  cause: string;
  effect: string;
  severity: string;
  header: Record<string, string>;
  description: Record<string, string>;
  routes: { routeId: string; route: string; color: string }[];
  stopIds: string[];
  activeFrom: string | null;
  activeUntil: string | null;
}

export interface AlertsResult {
  source: "metro" | "demo";
  sourceNote?: string;
  alerts: Alert[];
}

interface RawAlert extends Omit<Alert, "routes"> {
  routeIds: string[];
}

const cache = new TtlCache<{ source: AlertsResult["source"]; sourceNote?: string; raw: RawAlert[] }>(60_000, 1);

export async function getAlerts(filter: { routeId?: string; stopId?: string } = {}, now = Date.now()): Promise<AlertsResult> {
  const { source, sourceNote, raw } = await cache.get("alerts", loadAlerts);
  const route = filter.routeId ? findRoute(filter.routeId) : undefined;
  const stop = filter.stopId ? findStop(filter.stopId) : undefined;
  const alerts = raw
    .filter((a) => isActive(a, now))
    .filter((a) => !filter.routeId || (route && a.routeIds.includes(route.id)))
    .filter((a) => !filter.stopId || (stop && (a.stopIds.includes(stop.id) || a.routeIds.some((r) => stop.routeIds.includes(r)))))
    .map(({ routeIds, ...a }) => ({
      ...a,
      routes: routeIds.flatMap((id) => {
        const r = findRoute(id);
        return r ? [{ routeId: r.id, route: r.displayName, color: r.color }] : [];
      }),
    }));
  return { source, ...(sourceNote && { sourceNote }), alerts };
}

async function loadAlerts() {
  if (config.metroApiKey && !config.offline) {
    try {
      const { body } = await fetchUpstream<Uint8Array>({
        service: "metro-alerts",
        url: `${ALERTS_URL}?subscription-key=${config.metroApiKey}`,
        fixtureKey: "alerts",
        binary: true,
      });
      return { source: "metro" as const, raw: parseAlerts(body) };
    } catch (err) {
      return { source: "demo" as const, sourceNote: `METRO alerts unavailable (${(err as Error).message}); showing demo alerts.`, raw: demoAlerts() };
    }
  }
  const why = config.offline ? "offline mode" : "no METRO_API_KEY configured";
  return { source: "demo" as const, sourceNote: `Demo alerts (${why}).`, raw: demoAlerts() };
}

function demoAlerts(): RawAlert[] {
  return (JSON.parse(readFileSync(join(PWA_ROOT, "server/data/demo-alerts.json"), "utf8")) as { alerts: RawAlert[] }).alerts;
}

type Translated = { translation?: { text?: string | null; language?: string | null }[] | null } | null | undefined;

function translations(t: Translated): Record<string, string> {
  const out: Record<string, string> = {};
  for (const tr of t?.translation ?? []) if (tr.text) out[tr.language || "en"] = tr.text.replace(/\r\n?/g, "\n").replace(/\n{2,}/g, "\n").trim();
  return out;
}

function parseAlerts(buf: Uint8Array): RawAlert[] {
  const feed = FeedMessage.decode(buf);
  return feed.entity.flatMap((e) => {
    const a = e.alert;
    if (!a) return [];
    const period = a.activePeriod?.[0];
    const iso = (s: unknown) => (s ? new Date(Number(s) * 1000).toISOString() : null);
    return [
      {
        id: e.id,
        cause: PbAlert.Cause[a.cause ?? PbAlert.Cause.UNKNOWN_CAUSE] ?? "UNKNOWN_CAUSE",
        effect: PbAlert.Effect[a.effect ?? PbAlert.Effect.UNKNOWN_EFFECT] ?? "UNKNOWN_EFFECT",
        severity: PbAlert.SeverityLevel[a.severityLevel ?? PbAlert.SeverityLevel.UNKNOWN_SEVERITY] ?? "UNKNOWN_SEVERITY",
        header: translations(a.headerText),
        description: translations(a.descriptionText),
        routeIds: [...new Set((a.informedEntity ?? []).flatMap((ie) => (ie.routeId ? [ie.routeId] : [])))],
        stopIds: [...new Set((a.informedEntity ?? []).flatMap((ie) => (ie.stopId ? [ie.stopId.split("_")[0]] : [])))],
        activeFrom: iso(period?.start),
        activeUntil: iso(period?.end),
      },
    ];
  });
}

function isActive(a: RawAlert, now: number): boolean {
  return (!a.activeFrom || Date.parse(a.activeFrom) <= now) && (!a.activeUntil || Date.parse(a.activeUntil) > now);
}
