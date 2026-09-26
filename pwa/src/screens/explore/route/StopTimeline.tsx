// D9's stop list: today's timetable spine with ring nodes, the next scheduled bus per stop, and
// one expanded row with the live strip and its actions.

import { useEffect, useRef } from "react";
import { useArrivals, useRouteNext } from "../../../api/hooks.ts";
import type { Dep, Vehicle } from "../../../api/types.ts";
import { useT } from "../../../i18n/index.ts";
import { upcoming } from "../../../lib/format.ts";
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
/** A bus not heard from for longer than this is drawn grey (D22). */
const STALE_VEHICLE_S = 120;

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
  const next = useRouteNext(routeId, Number(directionKey) as 0 | 1);
  const nextBy = new Map(next.data?.stops.map((s) => [s.stopId, s.next?.departureTime]));
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
    const place = () => {
      const inset = topInset();
      const top = row.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      scroller.scrollTop = top - inset - (scroller.clientHeight - inset) * SCROLL_AT;
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
          next={nextBy.get(stop.id)}
          loading={next.isPending}
          expanded={stop.id === expandedId}
          nearest={stop.id === nearestId}
          vehicle={vehiclesAt.get(stop.id)}
          onToggle={() => onToggle(stop.id)}
        />
      ))}
    </ol>
  );
}

interface StopRowProps {
  routeId: string;
  rail: boolean;
  stop: RouteStop;
  next?: string;
  loading: boolean;
  expanded: boolean;
  nearest: boolean;
  vehicle?: Vehicle;
  onToggle: () => void;
}

function StopRow({ routeId, rail, stop, next, loading, expanded, nearest, vehicle, onToggle }: StopRowProps) {
  const t = useT();
  const now = useNow();
  const nextDep = next ? upcoming([scheduledDep(next)], now)[0] : undefined;
  // A scheduled time never says "Now" (C.2), so a trip due this minute would show as a clock time
  // among minutes. The column shows only trips a minute or more away (requests.md: two per stop).
  const dueNow = nextDep !== undefined && Date.parse(nextDep.departureTime) - now < 60_000;
  const stale = vehicle && vehicle.ageSeconds > STALE_VEHICLE_S;
  return (
    <li className={styles.stop} data-stop={stop.id} data-expanded={expanded}>
      {vehicle && (
        <>
          <span className={`${styles.bus} ${stale ? styles.busStale : ""}`} aria-hidden="true">
            <Icon name={rail ? "tram" : "directions_bus"} size={14} />
          </span>
          <span className="visually-hidden">
            {stale ? t("route.vehicleOld", { n: Math.floor(vehicle.ageSeconds / 60) }) : t(rail ? "route.trainComing" : "route.busComing")}
          </span>
        </>
      )}
      <button type="button" className={styles.stopButton} aria-expanded={expanded} onClick={onToggle}>
        <span className={`${styles.node} ${nearest || expanded ? styles.nodeFilled : ""}`} aria-hidden="true" />
        <span className={styles.stopText}>
          <span className={styles.stopName}>
            {stop.name} <span className={styles.stopId}>({stop.id})</span>
          </span>
          {nearest && <NearestLine stop={stop} />}
        </span>
        {/* Expanded, the live strip below is the one answer for this stop. */}
        {!expanded && (
          <span className={styles.next}>
            {nextDep && !dueNow ? (
              <TimeValue dep={nextDep} size="body" />
            ) : (
              <>
                <span aria-hidden="true">{t("route.noNext")}</span>
                {!loading && <span className="visually-hidden">{t(dueNow ? "route.dueNowA11y" : "route.noNextA11y")}</span>}
              </>
            )}
          </span>
        )}
      </button>
      {expanded && <ExpandedStop routeId={routeId} stop={stop} scheduled={nextDep} />}
    </li>
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
            label={t("route.walk")}
            ariaLabel={t("route.walkA11y", { id: stop.id })}
            href={`/explore/stop/${encodeURIComponent(stop.id)}/walk?route=${route}&d=${Math.round(walk.distanceM)}`}
          />
        )}
      </div>
    </div>
  );
}
