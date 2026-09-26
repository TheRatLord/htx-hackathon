// D9 Route page: the route's stops in order for one direction, the next scheduled bus at each,
// and one expanded stop with its live strip.

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { useAlerts, useRoute, useVehicles } from "../../../api/hooks.ts";
import type { RouteDetail, Vehicle } from "../../../api/types.ts";
import { useBack } from "../../../app/useBack.ts";
import { usePageTitle } from "../../../app/usePageTitle.ts";
import { useT } from "../../../i18n/index.ts";
import { toRouteRef } from "../../../lib/routes.ts";
import { useLocation } from "../../../state/location.tsx";
import { recentsActions } from "../../../state/recents.ts";
import { useSaved } from "../../../state/saved.ts";
import { AlertStatusLine } from "../../../ui/AlertStatusLine.tsx";
import { AppBar } from "../../../ui/AppBar.tsx";
import { Button } from "../../../ui/Button.tsx";
import { ErrorState } from "../../../ui/ErrorState.tsx";
import { RouteBadge } from "../../../ui/RouteBadge.tsx";
import { SegmentedControl } from "../../../ui/SegmentedControl.tsx";
import { Skeleton } from "../../../ui/Skeleton.tsx";
import { useToast } from "../../../ui/Toast.tsx";
import { FindInput } from "./FindInput.tsx";
import { nearestDirection, nearestStop, routeTitle, type RouteDirectionDetail } from "./routeGeo.ts";
import styles from "./RoutePage.module.css";
import { stopMatches } from "./stopMatch.ts";
import { StopTimeline } from "./StopTimeline.tsx";
import { useDirectionWord } from "./useDirectionWord.ts";

/** METRO's schedules page; the per-route PDFs are linked from there. */
const PDF_SCHEDULES_URL = "https://www.ridemetro.org/schedules";

export default function RoutePage() {
  const t = useT();
  const { routeId = "" } = useParams();
  const route = useRoute(routeId);
  const onBack = useBack();
  usePageTitle(route.data ? t("route.pageTitle", { name: routeTitle(route.data) }) : t("route.appBar"));

  return (
    <>
      <AppBar title={t("route.appBar")} onBack={onBack} right={route.data && <SaveRoute route={route.data} />} />
      {route.data ? (
        <RouteBody route={route.data} />
      ) : route.isError ? (
        <ErrorState error={route.error} context={{ id: routeId }} onRetry={() => void route.refetch()} />
      ) : (
        <div className={styles.page}>
          <Skeleton variant="row" />
          <Skeleton variant="row" />
          <Skeleton variant="row" />
        </div>
      )}
    </>
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
  return (
    <Button variant="tonal" icon={on ? "star_filled" : "star"} label={on ? t("common.saved") : t("common.save")} pressed={on} onPress={toggle} />
  );
}

function RouteBody({ route }: { route: RouteDetail }) {
  const t = useT();
  const { fix } = useLocation();
  const alerts = useAlerts();
  const dirLabel = useDirectionWord();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  // The auto-expanded nearest stop stays closed once the rider closes it.
  const [nearestClosed, setNearestClosed] = useState(false);
  const ref = toRouteRef({ id: route.id, name: route.displayName, color: route.color, textColor: route.textColor });

  useEffect(() => {
    recentsActions.addRoute({ id: route.id, name: routeTitle(route) });
  }, [route]);

  const dirParam = params.get("dir");
  const dirId = dirParam === "0" || dirParam === "1" ? (Number(dirParam) as 0 | 1) : nearestDirection(route, fix);
  const direction = route.directions.find((d) => d.directionId === dirId) ?? route.directions[0];
  const stopParam = params.get("stop") ?? undefined;
  const nearest = fix && direction ? nearestStop(direction.stops, fix) : undefined;
  const expandedId = stopParam ?? (nearestClosed ? undefined : nearest?.id);

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

  const onToggle = (stopId: string) => {
    if (stopId === expandedId) {
      if (stopId === nearest?.id) setNearestClosed(true);
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
  const vehiclesAt = useMemo(() => placeVehicles(vehicles.data?.vehicles ?? [], direction), [vehicles.data, direction]);

  if (!direction) return null;
  const shown = direction.stops.filter((s) => stopMatches(s, query));
  const other = route.directions.find((d) => d.directionId !== direction.directionId);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <RouteBadge route={ref} size="lg" />
        <div>
          <h2 className={styles.routeName}>{route.longName}</h2>
          <p className={styles.kind}>{route.type === "rail" ? t("route.railLine") : t("route.busRoute")}</p>
        </div>
      </div>
      <AlertStatusLine scope="route" name={t(ref.mode === "rail" ? "routeName.railA11y" : "routeName.a11y", { name: ref.name })} alerts={alerts.forRoute(route.id)} />
      {route.directions.length > 1 ? (
        <SegmentedControl
          ariaLabel={t("route.directions")}
          value={String(direction.directionId)}
          onChange={(v) => setDirection(Number(v) as 0 | 1)}
          options={route.directions.map((d) => ({
            value: String(d.directionId),
            label: route.type === "rail" ? t("route.to", { headsign: d.headsigns[0] ?? "" }) : dirLabel(d.label),
            sub: route.type === "rail" ? undefined : t("route.to", { headsign: d.headsigns[0] ?? "" }),
          }))}
        />
      ) : (
        <p className={styles.singleDirection}>
          {dirLabel(direction.label)} {t("route.to", { headsign: direction.headsigns[0] ?? "" })}
        </p>
      )}
      <FindInput value={query} onChange={setQuery} label={t("route.find")} />
      <div className={styles.listHead}>
        <p className={styles.caption}>{t("route.stopCount", { count: direction.stops.length })}</p>
        {vehicles.isError && <p className={styles.caption}>{t("route.vehiclesUnavailable")}</p>}
      </div>
      {shown.length ? (
        <StopTimeline
          routeId={route.id}
          directionKey={String(direction.directionId)}
          stops={shown}
          expandedId={expandedId}
          nearestId={nearest?.id}
          scrollToId={query ? undefined : expandedId}
          vehiclesAt={vehiclesAt}
          onToggle={onToggle}
        />
      ) : (
        <div className={styles.noMatch}>
          <p>{t("route.noMatch", { q: query })}</p>
          {other && <Button variant="text" label={t("route.otherDirection")} onPress={() => setDirection(other.directionId)} />}
        </div>
      )}
      <Button variant="text" label={t("route.pdf")} href={PDF_SCHEDULES_URL} external />
    </div>
  );
}

/** Each live bus of this direction, at the stop it is nearest to (a schematic, like the spine). */
function placeVehicles(vehicles: Vehicle[], direction: RouteDirectionDetail | undefined): Map<string, Vehicle> {
  const at = new Map<string, Vehicle>();
  if (!direction) return at;
  for (const v of vehicles) {
    if (v.directionLabel !== direction.label) continue;
    const stop = nearestStop(direction.stops, v);
    if (stop && !at.has(stop.id)) at.set(stop.id, v);
  }
  return at;
}
