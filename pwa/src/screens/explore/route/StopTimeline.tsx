// D9's stop list: today's timetable spine with ring nodes, the next scheduled bus per stop, and
// one expanded row with the live strip and its actions.

import { useEffect, useRef } from "react";
import { useArrivals, useRouteNext } from "../../../api/hooks.ts";
import type { Dep, Vehicle } from "../../../api/types.ts";
import { useT } from "../../../i18n/index.ts";
import { ageMinutes, STALE_VEHICLE_S, upcoming } from "../../../lib/format.ts";
import { MAX_WALK_MINUTES } from "../../../lib/walk.ts";
import { useNow } from "../../../state/clock.ts";
import { Button } from "../../../ui/Button.tsx";
import { Icon } from "../../../ui/Icon.tsx";
import { LiveStrip } from "../../../ui/LiveStrip.tsx";
import { TimeValue } from "../../../ui/TimeValue.tsx";
import type { RouteStop } from "./routeGeo.ts";
import styles from "./RoutePage.module.css";
import { useStopWalk } from "./useStopWalk.ts";

/** Where the target row lands in the space under the sticky bar, so the stops before and after it show. */
const SCROLL_AT = 0.35;
/** How long the target row is held in place while the rest of the page loads. */
const PIN_MS = 3000;

const scheduledDep = (departureTime: string): Dep => ({ departureTime, isRealtime: false, canceled: false, source: "schedule", tripId: "" });

interface StopTimelineProps {
  routeId: string;
  rail: boolean;
  directionKey: string;
  stops: RouteStop[];
  expandedId?: string;
  nearestId?: string;
  /** The row brought into view when a direction first shows (?stop= or the nearest stop). */
  scrollToId?: string;
  /** Height of the sticky bar over the scroll area. */
  topInset: () => number;
  /** Live buses, keyed by the stop each is heading to. */
  vehiclesAt: Map<string, Vehicle>;
  onToggle: (stopId: string) => void;
}

export function StopTimeline({ routeId, rail, directionKey, stops, expandedId, nearestId, scrollToId, topInset, vehiclesAt, onToggle }: StopTimelineProps) {
  const now = useNow();
  const next = useRouteNext(routeId, Number(directionKey) as 0 | 1);
  const nextBy = new Map(next.data?.stops.map((s) => [s.stopId, [s.next, s.then].flatMap((d) => (d ? [d.departureTime] : []))]));
  // Where the next-bus time drops from one stop to the next ("7 min", then "1 min"), a scheduled bus is
  // between them right now: the one before it has already passed the earlier stops. A glyph on the spine
  // says so, so the jump doesn't read as a mistake.
  const firstAhead = (id: string) => (nextBy.get(id) ?? []).map(Date.parse).find((ms) => ms > now);
  const busBefore = new Set<string>();
  stops.forEach((stop, i) => {
    const here = firstAhead(stop.id);
    const before = i > 0 ? firstAhead(stops[i - 1].id) : undefined;
    if (here !== undefined && before !== undefined && here < before) busBefore.add(stop.id);
  });
  // The stop right above a bus (live or by the timetable) has just been passed: its time is the bus
  // after that one. It is greyed and says so, so "7 min" above "1 min" reads as two different buses.
  const justPassed = new Set<string>();
  stops.forEach((stop, i) => {
    if (i > 0 && (busBefore.has(stop.id) || vehiclesAt.has(stop.id))) justPassed.add(stops[i - 1].id);
  });
  const list = useRef<HTMLOListElement>(null);
  // Only the first target of each direction scrolls; later taps expand in place.
  const initial = useRef<{ directionKey: string; stopId: string } | null>(null);
  if (scrollToId && initial.current?.directionKey !== directionKey) initial.current = { directionKey, stopId: scrollToId };
  const target = initial.current?.directionKey === directionKey ? initial.current.stopId : undefined;

  useEffect(() => {
    if (!target) return;
    const row = list.current?.querySelector<HTMLElement>(`[data-stop="${CSS.escape(target)}"]`);
    const scroller = row?.closest("main");
    const page = list.current?.parentElement;
    if (!row || !scroller || !page) return;
    const contentTop = (el: Element) => el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    const place = () => {
      const inset = topInset();
      let top = contentTop(row) - inset - (scroller.clientHeight - inset) * SCROLL_AT;
      // Never leave a row sliced by the sticky header: move to the nearer edge of the row it would cut.
      const edge = top + inset;
      for (const li of list.current?.children ?? []) {
        const start = contentTop(li);
        const end = start + (li as HTMLElement).offsetHeight;
        if (start < edge && end > edge) {
          top = edge - start < end - edge ? start - inset : end - inset;
          break;
        }
      }
      scroller.scrollTop = top;
    };
    place();
    // Live bus markers and the alert line can still arrive above the row: keep it in place for
    // a moment, unless the rider starts scrolling.
    const observer = new ResizeObserver(place);
    observer.observe(page);
    const stop = () => observer.disconnect();
    const timer = setTimeout(stop, PIN_MS);
    const events = ["pointerdown", "wheel", "keydown"] as const;
    events.forEach((e) => scroller.addEventListener(e, stop, { once: true, passive: true }));
    return () => {
      clearTimeout(timer);
      stop();
      events.forEach((e) => scroller.removeEventListener(e, stop));
    };
  }, [directionKey, target, topInset]);

  return (
    <ol ref={list} className={styles.timeline}>
      {stops.map((stop) => (
        <StopRow
          key={stop.id}
          routeId={routeId}
          rail={rail}
          stop={stop}
          next={nextBy.get(stop.id) ?? []}
          loading={next.isPending}
          expanded={stop.id === expandedId}
          nearest={stop.id === nearestId}
          vehicle={vehiclesAt.get(stop.id)}
          scheduledBus={busBefore.has(stop.id)}
          passed={justPassed.has(stop.id)}
          onToggle={() => onToggle(stop.id)}
        />
      ))}
    </ol>
  );
}

/** "Westheimer Rd" in "Westheimer Rd @ Mandell St": the street the bus runs along. */
const onStreet = (name: string) => name.match(/^(.+?) @ /)?.[1];

interface StopRowProps {
  routeId: string;
  rail: boolean;
  stop: RouteStop;
  /** The next two scheduled departures. */
  next: string[];
  loading: boolean;
  expanded: boolean;
  nearest: boolean;
  vehicle?: Vehicle;
  /** By the timetable, a bus is between the stop above and this one now (drawn only when no live bus is). */
  scheduledBus: boolean;
  /** The bus drawn under this stop has just left it; the time shown is the one after. */
  passed: boolean;
  onToggle: () => void;
}

function StopRow({ routeId, rail, stop, next, loading, expanded, nearest, vehicle, scheduledBus, passed, onToggle }: StopRowProps) {
  const t = useT();
  const now = useNow();
  const deps = upcoming(next.map(scheduledDep), now);
  // A scheduled time never says "Now" (C.2): a trip still ahead reads "1 min", the same as the strip when
  // the row is opened, and one already gone gives way to the next.
  const shown = deps.find((d) => Date.parse(d.departureTime) > now);
  const dueNow = !shown && deps.length > 0;
  const stale = vehicle && vehicle.ageSeconds > STALE_VEHICLE_S;
  return (
    <li className={styles.stop} data-stop={stop.id} data-expanded={expanded} data-passed={passed && !expanded}>
      {/* The bus between the stop above and this one, said in words on its own line: the next-bus times
          restart here ("7 min" above, "1 min" below), and an unlabelled glyph read as a data error. */}
      {(vehicle || scheduledBus) && (
        <p className={styles.busMark}>
          <span className={`${styles.bus} ${!vehicle ? styles.busScheduled : stale ? styles.busStale : ""}`} aria-hidden="true">
            <Icon name={rail ? "tram" : "directions_bus"} size={14} />
          </span>
          <span aria-hidden="true">{t(vehicle ? (rail ? "route.trainHere" : "route.busHere") : rail ? "route.trainHereScheduled" : "route.busHereScheduled")}</span>
          <span className="visually-hidden">
            {vehicle
              ? stale
                ? t("route.vehicleOld", { n: ageMinutes(now - vehicle.ageSeconds * 1000, now) })
                : t(rail ? "route.trainComing" : "route.busComing")
              : t(rail ? "route.trainScheduled" : "route.busScheduled")}
          </span>
        </p>
      )}
      <button type="button" className={styles.stopButton} aria-expanded={expanded} onClick={onToggle}>
        {nearest ? (
          <span className={styles.nodeNearest} aria-hidden="true">
            <Icon name="my_location" size={20} />
          </span>
        ) : (
          <span className={`${styles.node} ${expanded ? styles.nodeFilled : ""}`} aria-hidden="true" />
        )}
        <span className={styles.stopText}>
          <StopName name={stop.name} id={stop.id} />
          {passed && !expanded && <span className={styles.passedLine}>{t(rail ? "route.trainJustLeft" : "route.busJustLeft")}</span>}
          {nearest && <NearestLine stop={stop} />}
        </span>
        {/* Expanded, the live strip below is the one answer for this stop. */}
        {!expanded && (
          <span className={styles.next}>
            {shown ? (
              <>
                <TimeValue dep={shown} size="body" />
                {/* What the number is, on every row: the next bus to reach this stop. */}
                <span className={styles.nextCaption} aria-hidden="true">
                  {t(rail ? "route.nextTrainCaption" : "route.nextBusCaption")}
                </span>
              </>
            ) : (
              <>
                <span aria-hidden="true">{t("route.noNext")}</span>
                {!loading && <span className="visually-hidden">{t(dueNow ? "route.dueNowA11y" : "route.noNextA11y")}</span>}
              </>
            )}
          </span>
        )}
      </button>
      {expanded && <ExpandedStop routeId={routeId} stop={stop} scheduled={deps[0]} />}
    </li>
  );
}

/**
 * One name form in every row, open or closed: the cross street and number in bold ("Mandell St (2953)"),
 * which never break apart, and the street the bus runs along on a grey line under it. Every row and
 * every state uses it, so a tap never renames the row under the rider's finger. Screen readers hear
 * the whole name first ("Westheimer Rd @ Mandell St (2953)").
 */
function StopName({ name, id }: { name: string; id: string }) {
  const street = onStreet(name);
  const cross = street ? name.slice(street.length + 3) : name;
  return (
    <>
      <span className={styles.stopName}>
        {street && <span className="visually-hidden">{street} @ </span>}
        <span className={styles.cross}>
          {cross}
          {"\u00a0"}
          <span className={styles.stopId}>({id})</span>
        </span>
      </span>
      {street && (
        <span className={styles.street} aria-hidden="true">
          {street}
        </span>
      )}
    </>
  );
}

function NearestLine({ stop }: { stop: RouteStop }) {
  const t = useT();
  const walk = useStopWalk(stop);
  return walk ? <span className={styles.nearest}>{t("route.nearest", { count: walk.minutes })}</span> : null;
}

function ExpandedStop({ routeId, stop, scheduled }: { routeId: string; stop: RouteStop; scheduled?: Dep }) {
  const t = useT();
  const walk = useStopWalk(stop);
  const arrivals = useArrivals(stop.id, { route: routeId, limit: 4 });
  const route = encodeURIComponent(routeId);
  const failed = arrivals.isError && !arrivals.data;
  return (
    <div className={styles.panel}>
      {failed && <p className={styles.panelNote}>{t("route.liveUnavailable")}</p>}
      <LiveStrip deps={failed ? (scheduled ? [scheduled] : []) : (arrivals.data?.arrivals ?? [])} loading={arrivals.isPending && !failed} />
      <div className={styles.pills}>
        <Button variant="tonal" label={`${t("route.stopDetails")} ›`} href={`/explore/stop/${encodeURIComponent(stop.id)}?route=${route}`} />
        {walk && (
          <Button
            variant="tonal"
            icon="directions_walk"
            label={walk.minutes <= MAX_WALK_MINUTES ? t("route.walkMin", { min: walk.minutes }) : t("route.walk")}
            ariaLabel={t("route.walkA11y", { id: stop.id })}
            href={`/explore/stop/${encodeURIComponent(stop.id)}/walk?route=${route}&d=${Math.round(walk.distanceM)}`}
          />
        )}
      </div>
    </div>
  );
}
