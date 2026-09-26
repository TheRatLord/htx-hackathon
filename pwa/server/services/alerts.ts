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
  /** "unavailable": a METRO key is configured but the live feed failed; never fall back to demo alerts then. */
  source: "metro" | "demo" | "unavailable";
  sourceNote?: string;
  alerts: Alert[];
}

interface RawAlert extends Omit<Alert, "routes"> {
  /** Every GTFS-RT active period (recurring closures have several); `activeFrom/Until` show the current or next one. */
  periods?: { from: string | null; until: string | null }[];
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
    // `periods` is internal (activeFrom/Until carry the one shown).
    .map(({ routeIds, periods: _periods, ...a }) => ({
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
    } catch {
      return { source: "unavailable" as const, sourceNote: "METRO alerts could not be loaded.", raw: [] };
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
    const iso = (s: unknown) => (s ? new Date(Number(s) * 1000).toISOString() : null);
    const periods = (a.activePeriod ?? []).map((p) => ({ from: iso(p.start), until: iso(p.end) }));
    const period = shownPeriod(periods, Date.now());
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
        activeFrom: period?.from ?? null,
        activeUntil: period?.until ?? null,
        ...(periods.length > 1 && { periods }),
      },
    ];
  });
}

type Period = { from: string | null; until: string | null };
const contains = (p: Period, now: number) => (!p.from || Date.parse(p.from) <= now) && (!p.until || Date.parse(p.until) > now);

/** The period in force now, else the next one to start, else the first. */
function shownPeriod(periods: Period[], now: number): Period | undefined {
  const upcoming = periods.filter((p) => p.from && Date.parse(p.from) > now).sort((a, b) => Date.parse(a.from!) - Date.parse(b.from!));
  return periods.find((p) => contains(p, now)) ?? upcoming[0] ?? periods[0];
}

/** Active when any of its periods contains `now` (a weekend-only closure is active each weekend). */
function isActive(a: RawAlert, now: number): boolean {
  return a.periods ? a.periods.some((p) => contains(p, now)) : contains({ from: a.activeFrom, until: a.activeUntil }, now);
}
