// The itinerary as a timeline (spec C.13, D12): one row per walk, boarding, getting off, same-stop
// transfer and arrival. Used by My Itinerary and by Live trip's "All steps".

import type { Itinerary, PlanStop, TransitLeg, WalkLeg } from "../../api/types.ts";
import { t, type Lang } from "../../i18n/index.ts";
import { formatClock, formatDistance } from "../../lib/format.ts";
import { localiseSide, sideDirection } from "../../lib/i18nServer.ts";
import { formatLatLon } from "../../lib/geo.ts";
import { toRouteRef } from "../../lib/routes.ts";
import { walkMinutes, type WalkPace } from "../../lib/walk.ts";
import type { TimelineStep } from "../../ui/types.ts";
import { isEmptyWalk, type TripStep } from "./steps.ts";

export interface TimelineRow {
  step: TimelineStep;
  legIndex: number;
  role: "walk" | "final" | "transfer" | "board" | "alight" | "arrive";
  /** Where the row leads; rows without one (final walk, arrival) show the place on the map. */
  href?: string;
}

interface TimelineOpts {
  fromName: string;
  toName: string;
  pace: WalkPace;
  lang: Lang;
}

/** "M L King Blvd @ UH University Dr (#11424)" */
export const stopTitle = (s: PlanStop) => (s.id ? `${s.name} (#${s.id})` : s.name);

/**
 * "west side": the stop's side without the street, for lines that already name the stop
 * ("…UH University Dr (#11424), west side"). Empty when the stop has no side.
 */
export function shortSide(stop: PlanStop, lang: Lang): string {
  if (!stop.side) return "";
  const parsed = sideDirection(stop.side);
  return parsed ? t(`plan.sideShort.${parsed.dir}`, undefined, lang) : localiseSide(stop.side, lang);
}

const capitalise = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);

/** "M L King Blvd @ UH University Dr (#11424), west side" */
export function stopWithSide(stop: PlanStop, lang: Lang): string {
  const side = shortSide(stop, lang);
  return side ? `${stopTitle(stop)}, ${side}` : stopTitle(stop);
}

function stopHref(s: PlanStop, routeId: string): string | undefined {
  if (!s.id) return undefined;
  return `/explore/stop/${encodeURIComponent(s.id)}?route=${encodeURIComponent(routeId)}`;
}

/** D8 for a walk that ends at a stop, seeded with the leg's distance so every screen shows the same minutes. */
function walkHref(leg: WalkLeg, fromName: string, routeId: string): string | undefined {
  if (!leg.to.id) return undefined;
  const q = new URLSearchParams({ from: formatLatLon(leg.from), fromName, route: routeId, d: String(leg.distanceM) });
  return `/explore/stop/${encodeURIComponent(leg.to.id)}/walk?${q}`;
}

/** Minutes between getting to a stop and the bus leaving it. */
const waitMin = (arrive: string, ride: TransitLeg) => Math.max(0, Math.round((Date.parse(ride.departureTime) - Date.parse(arrive)) / 60_000));

function transferLines(ride: TransitLeg, lang: Lang): string[] {
  return [
    ...(ride.board.bay ? [t("stopLine.bay", { bay: ride.board.bay }, lang)] : []),
    ...(ride.transfer?.tight ? [t("plan.tightTransfer", undefined, lang)] : []),
  ];
}

export function itineraryTimeline(it: Itinerary, opts: TimelineOpts): TimelineRow[] {
  const { lang, pace } = opts;
  const rows: TimelineRow[] = [];
  it.legs.forEach((leg, legIndex) => {
    if (isEmptyWalk(leg)) return;
    const next = it.legs.slice(legIndex + 1).find((l): l is TransitLeg => l.type === "transit");
    if (leg.type === "walk") {
      const min = walkMinutes(leg.distanceM, pace);
      const walk = t("plan.walkMinDistance", { min, distance: formatDistance(leg.distanceM, lang) }, lang);
      if (!next) {
        rows.push({
          legIndex,
          role: "final",
          step: { kind: "walk", title: t("plan.walkTo", { min, place: opts.toName }, lang), lines: [formatDistance(leg.distanceM, lang)] },
        });
        return;
      }
      // The stop on its own line and the side under it, so the narrow timeline column doesn't
      // break "…University Dr (#11424), west / side" over four lines.
      const to = t("plan.toStop", { stop: stopTitle(leg.to) }, lang);
      const side = capitalise(shortSide(leg.to, lang));
      const first = legIndex === 0;
      const wait = t("plan.wait", { min: waitMin(leg.endTime, next) }, lang);
      rows.push({
        legIndex,
        role: "walk",
        href: walkHref(leg, first ? opts.fromName : leg.from.name, next.route.id),
        step: first
          ? { kind: "walk", title: opts.fromName, time: formatClock(it.startTime, lang), lines: [walk, to, ...(side ? [side] : [])] }
          : {
              kind: "walk",
              title: walk,
              lines: [to, side ? `${side} · ${wait}` : capitalise(wait), ...transferLines(next, lang)],
            },
      });
      return;
    }
    const route = toRouteRef(leg.route);
    if (leg.transfer?.sameStop) {
      rows.push({
        legIndex,
        role: "transfer",
        href: stopHref(leg.board, route.id),
        step: { kind: "transfer", title: t("plan.sameStop", { min: leg.transfer.waitMin }, lang), lines: transferLines(leg, lang) },
      });
    }
    // A walk or transfer row right above already named the stop; a trip that starts at it didn't.
    const named = rows.at(-1)?.role === "walk" || rows.at(-1)?.role === "transfer";
    const leaves = `${formatClock(leg.departureTime, lang)}${leg.isRealtime ? ` ${t("status.live", undefined, lang)}` : ""}`;
    rows.push({
      legIndex,
      role: "board",
      href: stopHref(leg.board, route.id),
      step: {
        kind: "board",
        route,
        titleLead: t("plan.board", undefined, lang).toUpperCase(),
        title: `${t("headsign.to", undefined, lang)} ${leg.headsign.toUpperCase()}`,
        lines: [...(named ? [] : [stopWithSide(leg.board, lang)]), `${leaves} · ${t("plan.stops", { count: leg.numStops }, lang)}`],
        duration: t("time.min", { n: leg.durationMin }, lang),
      },
    });
    rows.push({
      legIndex,
      role: "alight",
      href: stopHref(leg.alight, route.id),
      step: { kind: "alight", title: t("plan.getOffAt", { stop: stopTitle(leg.alight) }, lang), lines: [], time: formatClock(leg.arrivalTime, lang), legColor: route.color },
    });
  });
  rows.push({ legIndex: it.legs.length, role: "arrive", step: { kind: "arrive", title: opts.toName, lines: [], time: formatClock(it.endTime, lang) } });
  return rows;
}

/** The timeline row that is "You are here" for a Live trip step. */
export function rowForStep(rows: TimelineRow[], step: TripStep): number {
  if (step.kind === "arrived") return rows.length - 1;
  const roles: TimelineRow["role"][] = step.kind === "wait" || step.kind === "ride" ? ["board"] : [step.kind];
  return rows.findIndex((r) => r.legIndex === step.legIndex && roles.includes(r.role));
}
