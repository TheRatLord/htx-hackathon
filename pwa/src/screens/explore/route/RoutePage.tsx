// D9 Route page: the route's stops in order for one direction, the next scheduled bus at each,
// and one expanded stop with its live strip.

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { ApiError } from "../../../api/client.ts";
import { useAlerts, useRoute, useVehicles } from "../../../api/hooks.ts";
import type { RouteDetail } from "../../../api/types.ts";
import { useBack } from "../../../app/useBack.ts";
import { usePageTitle } from "../../../app/usePageTitle.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { directionWord, displayHeadsign, headsignLine } from "../../../lib/format.ts";
import { toRouteRef } from "../../../lib/routes.ts";
import { useLocation } from "../../../state/location.tsx";
import { recentsActions } from "../../../state/recents.ts";
import { useSaved } from "../../../state/saved.ts";
import { AlertStatusLine } from "../../../ui/AlertStatusLine.tsx";
import { AppBar } from "../../../ui/AppBar.tsx";
import { Button } from "../../../ui/Button.tsx";
import { EmptyState } from "../../../ui/EmptyState.tsx";
import { ErrorState } from "../../../ui/ErrorState.tsx";
import { RouteBadge } from "../../../ui/RouteBadge.tsx";
import { SegmentedControl } from "../../../ui/SegmentedControl.tsx";
import { Skeleton } from "../../../ui/Skeleton.tsx";
import { useToast } from "../../../ui/Toast.tsx";
import { FindInput } from "./FindInput.tsx";
import { nearestDirection, nearestStop, placeVehicles, routeTitle, schedulesUrl } from "./routeGeo.ts";
import styles from "./RoutePage.module.css";
import { stopMatches } from "./stopMatch.ts";
import { StopTimeline } from "./StopTimeline.tsx";

export default function RoutePage() {
  const t = useT();
  const navigate = useNavigate();
  const { routeId = "" } = useParams();
  const route = useRoute(routeId);
  const onBack = useBack();
  usePageTitle(route.data ? t("route.pageTitle", { name: routeTitle(route.data) }) : t("routeName.a11y", { name: routeId }));

  if (route.data) return <RouteBody route={route.data} onBack={onBack} />;
  const notFound = route.error instanceof ApiError && route.error.code === "route_not_found";
  return (
    <div className={styles.screen}>
      <AppBar title={t("routeName.a11y", { name: routeId })} onBack={onBack} />
      {notFound ? (
        <EmptyState
          icon="search"
          title={t("route.notFound", { id: routeId })}
          body={t("route.notFoundBody")}
          action={{ label: t("route.allRoutes"), onPress: () => navigate("/more/routes") }}
        />
      ) : route.isError ? (
        <ErrorState error={route.error} context={{ id: routeId }} onRetry={() => void route.refetch()} />
      ) : (
        <div className={styles.page}>
          <Skeleton variant="row" />
          <Skeleton variant="row" />
          <Skeleton variant="row" />
        </div>
      )}
    </div>
  );
}

function SaveRoute({ route }: { route: RouteDetail }) {
  const t = useT();
  const toast = useToast();
  const saved = useSaved();
  const on = saved.isRouteSaved(route.id);
  const entry = { id: route.id, name: routeTitle(route) };
  const toggle = () => {
    if (!on) {
      saved.addRoute(entry);
      toast({ message: t("route.savedToast") });
      return;
    }
    saved.removeRoute(route.id);
    toast({ message: t("route.removedToast"), action: { label: t("common.undo"), onPress: () => saved.addRoute(entry) } });
  };
  // "Save route": elsewhere the app saves stops, so the button says what it saves.
  return (
    <Button
      variant="tonal"
      icon={on ? "star_filled" : "star"}
      label={on ? t("common.saved") : t("route.saveRoute")}
      ariaLabel={t("route.saveRouteA11y", { name: routeTitle(route) })}
      pressed={on}
      onPress={toggle}
    />
  );
}

/** True once `marker` has scrolled up under the sticky `bar`, i.e. the page header is out of view. */
function useScrolledPast(marker: RefObject<HTMLElement | null>, bar: RefObject<HTMLElement | null>): boolean {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const scroller = marker.current?.closest("main");
    if (!scroller) return;
    const check = () => {
      if (marker.current && bar.current) setPast(marker.current.getBoundingClientRect().top < bar.current.getBoundingClientRect().bottom);
    };
    check();
    scroller.addEventListener("scroll", check, { passive: true });
    return () => scroller.removeEventListener("scroll", check);
  }, [marker, bar]);
  return past;
}

function RouteBody({ route, onBack }: { route: RouteDetail; onBack: () => void }) {
  const t = useT();
  const { fix } = useLocation();
  const alerts = useAlerts();
  const lang = useLang();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  // The auto-expanded nearest stop stays closed once the rider closes it.
  const [nearestClosed, setNearestClosed] = useState(false);
  const bar = useRef<HTMLDivElement>(null);
  const compact = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLDivElement>(null);
  const scrolledPast = useScrolledPast(marker, bar);
  const ref = toRouteRef({ id: route.id, name: route.displayName, color: route.color, textColor: route.textColor });
  const rail = route.type === "rail";
  const routeName = t(rail ? "routeName.railA11y" : "routeName.a11y", { name: ref.name });

  useEffect(() => {
    recentsActions.addRoute({ id: route.id, name: routeTitle(route) });
  }, [route]);

  const replaceParams = (patch: Record<string, string | undefined>) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        for (const [k, v] of Object.entries(patch)) {
          if (v === undefined) next.delete(k);
          else next.set(k, v);
        }
        return next;
      },
      { replace: true },
    );

  const dirParam = params.get("dir");
  const urlDir = dirParam === "0" || dirParam === "1" ? (Number(dirParam) as 0 | 1) : undefined;
  const dirId = urlDir ?? nearestDirection(route, fix);
  // The first fix picks the direction once and writes it to the URL, so later fixes can't flip it.
  const pickDirection = urlDir === undefined && fix !== undefined;
  useEffect(() => {
    if (pickDirection) setParams((p) => new URLSearchParams({ ...Object.fromEntries(p), dir: String(dirId) }), { replace: true });
  }, [pickDirection, dirId, setParams]);
  const direction = route.directions.find((d) => d.directionId === dirId) ?? route.directions[0];

  // The nearest stop is chosen once per direction, so walking along the street doesn't move the expanded row.
  const nearestByDir = useRef(new Map<number, string | undefined>());
  if (fix && direction && !nearestByDir.current.has(direction.directionId)) {
    nearestByDir.current.set(direction.directionId, nearestStop(direction.stops, fix)?.id);
  }
  const nearestId = direction && nearestByDir.current.get(direction.directionId);
  const stopParam = params.get("stop") ?? undefined;
  const expandedId = stopParam ?? (nearestClosed ? undefined : nearestId);

  const onToggle = (stopId: string) => {
    if (stopId === expandedId) {
      if (stopId === nearestId) setNearestClosed(true);
      replaceParams({ stop: undefined });
    } else {
      replaceParams({ stop: stopId });
    }
  };

  const setDirection = (d: 0 | 1) => {
    setNearestClosed(false);
    replaceParams({ dir: String(d), stop: undefined });
  };

  const vehicles = useVehicles(route.id, { enabled: true });
  const vehiclesAt = useMemo(
    () => (direction ? placeVehicles(vehicles.data?.vehicles ?? [], direction) : new Map()),
    [vehicles.data, direction],
  );

  const toHeadsign = (headsigns: string[]) => t("route.to", { headsign: displayHeadsign(headsigns[0] ?? "") });
  const directionText = direction && (rail ? toHeadsign(direction.headsigns) : `${directionWord(direction.label, lang)} ${toHeadsign(direction.headsigns)}`);
  // "EASTBOUND to DOWNTOWN", the way every card and the stop sheet write it.
  const directionCaps = direction && headsignLine(ref, direction.label, direction.headsigns[0] ?? "", lang);
  const nextLabel = t(rail ? "route.nextTrain" : "route.nextBus");
  const other = route.directions.find((d) => d.directionId !== direction?.directionId);
  const shown = direction ? direction.stops.filter((s) => stopMatches(s, query)) : [];
  const topInset = useCallback(() => (bar.current?.offsetHeight ?? 0) + (compact.current?.offsetHeight ?? 0), []);

  return (
    <div className={styles.screen}>
      <div ref={bar} className={styles.sticky}>
        <AppBar title={routeName} onBack={onBack} right={<SaveRoute route={route} />} />
        {direction && (
          // Once the header scrolls away this keeps the route and direction in view (a tap goes back up to
          // change it), and labels the time column so "5 min" always reads as the next bus at that stop.
          <div ref={compact} className={styles.compact} data-shown={scrolledPast} aria-hidden={!scrolledPast}>
            <button
              type="button"
              className={styles.compactButton}
              tabIndex={scrolledPast ? 0 : -1}
              onClick={() => marker.current?.closest("main")?.scrollTo({ top: 0 })}
            >
              <RouteBadge route={ref} size="sm" />
              <span className={styles.compactText}>{directionCaps}</span>
              {other && <span className={styles.compactAction}>{t("route.change")}</span>}
            </button>
            <p className={styles.columnHead}>
              <span>{t("route.stopColumn")}</span>
              <span>{nextLabel}</span>
            </p>
          </div>
        )}
      </div>
      <div className={styles.page}>
        <div className={styles.header}>
          <RouteBadge route={ref} size="lg" />
          <div>
            <h2 className={styles.routeName}>{route.longName}</h2>
            <p className={styles.kind}>{rail ? t("route.railLine") : t("route.busRoute")}</p>
          </div>
        </div>
        {/* The route's line on the map, from the rider's position (D3). */}
        <div className={styles.mapLink}>
          <Button variant="text" icon="map_pin" label={t("route.showOnMap")} href={`/explore?route=${encodeURIComponent(route.id)}`} />
        </div>
        <AlertStatusLine scope="route" name={routeName} alerts={alerts.forRoute(route.id)} />
        {direction && route.directions.length > 1 ? (
          <SegmentedControl
            ariaLabel={t("route.directions")}
            value={String(direction.directionId)}
            onChange={(v) => setDirection(Number(v) as 0 | 1)}
            options={route.directions.map((d) => ({
              value: String(d.directionId),
              label: rail ? toHeadsign(d.headsigns) : directionWord(d.label, lang),
              sub: rail ? undefined : toHeadsign(d.headsigns),
            }))}
          />
        ) : (
          <p className={styles.singleDirection}>{directionText}</p>
        )}
        <div ref={marker} />
        {direction && (
          <>
            <FindInput value={query} onChange={setQuery} label={t("route.find")} />
            <div className={styles.listHead}>
              {/* A column header: stop count on the left, what the right-hand times mean on the right. */}
              <p className={styles.columnHeadStatic}>
                <span>
                  {query
                    ? t("route.matchCount", { count: shown.length, total: direction.stops.length })
                    : t("route.stopCount", { count: direction.stops.length })}
                </span>
                <span>{nextLabel}</span>
              </p>
              {vehicles.isError && <p className={styles.caption}>{t("route.vehiclesUnavailable")}</p>}
            </div>
            {shown.length ? (
              <StopTimeline
                routeId={route.id}
                rail={rail}
                directionKey={String(direction.directionId)}
                stops={shown}
                expandedId={expandedId}
                nearestId={nearestId}
                scrollToId={query ? undefined : expandedId}
                topInset={topInset}
                vehiclesAt={vehiclesAt}
                onToggle={onToggle}
              />
            ) : (
              <div className={styles.noMatch}>
                <p>{t("route.noMatch", { q: query })}</p>
                {other && <Button variant="text" label={t("route.otherDirection")} onPress={() => setDirection(other.directionId)} />}
              </div>
            )}
          </>
        )}
        <Button variant="text" label={t("route.schedules")} href={schedulesUrl(route)} external />
      </div>
    </div>
  );
}
