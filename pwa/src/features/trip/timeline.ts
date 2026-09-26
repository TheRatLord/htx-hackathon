// The itinerary as a timeline (spec C.13, D12): one row per walk, boarding, getting off, same-stop
// transfer and arrival. Used by My Itinerary and by Live trip's "All steps".

import type { Itinerary, PlanStop, TransitLeg, WalkLeg } from "../../api/types.ts";
import { t, type Lang } from "../../i18n/index.ts";
import { localiseSide } from "../../lib/i18nServer.ts";
import { formatClock, formatDistance, sideLine } from "../../lib/format.ts";
import { formatLatLon } from "../../lib/geo.ts";
import { toRouteRef } from "../../lib/routes.ts";
import { walkMinutes, type WalkPace } from "../../lib/walk.ts";
import type { TimelineStep } from "../../ui/types.ts";
import type { TripStep } from "./steps.ts";

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

const stopHref = (s: PlanStop, routeId: string) => s.id && `/explore/stop/${encodeURIComponent(s.id)}?route=${encodeURIComponent(routeId)}`;

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
      const side = leg.to.side ? ` · ${localiseSide(leg.to.side, lang)}` : "";
      const to = `${t("plan.toStop", { stop: stopTitle(leg.to) }, lang)}${side}`;
      const first = legIndex === 0;
      rows.push({
        legIndex,
        role: "walk",
        href: walkHref(leg, first ? opts.fromName : leg.from.name, next.route.id),
        step: first
          ? { kind: "walk", title: opts.fromName, time: formatClock(it.startTime, lang), lines: [walk, to] }
          : {
              kind: "walk",
              title: walk,
              lines: [`${to} · ${t("plan.wait", { min: waitMin(leg.endTime, next) }, lang)}`, ...transferLines(next, lang)],
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
    const side = sideLine({ ...leg.board, kind: route.mode }, { withCompass: false, lang });
    rows.push({
      legIndex,
      role: "board",
      href: stopHref(leg.board, route.id),
      step: {
        kind: "board",
        route,
        title: t("plan.boardTo", { headsign: leg.headsign.toUpperCase() }, lang),
        lines: [stopTitle(leg.board), ...(side ? [side] : []), t("plan.rideStops", { count: leg.numStops }, lang)],
        time: formatClock(leg.departureTime, lang),
        status: leg.isRealtime ? "live" : undefined,
        duration: t("time.min", { n: leg.durationMin }, lang),
      },
    });
    rows.push({
      legIndex,
      role: "alight",
      href: stopHref(leg.alight, route.id),
      step: { kind: "alight", title: t("plan.getOffAt", { stop: stopTitle(leg.alight) }, lang), lines: [], time: formatClock(leg.arrivalTime, lang) },
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
