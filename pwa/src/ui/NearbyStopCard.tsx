import type { NearbyRoute } from "../api/types.ts";
import { useLang, useT } from "../i18n/index.ts";
import { departureA11y, headsignLine, sideLine, upcoming } from "../lib/format.ts";
import { toRouteRef } from "../lib/routes.ts";
import { walkMinutes } from "../lib/walk.ts";
import { useNow } from "../state/clock.ts";
import { useOffline } from "../state/offline.ts";
import { usePrefs } from "../state/prefs.ts";
import styles from "./cards.module.css";
import { DepTimes, shownDeps } from "./DepTimes.tsx";
import { Icon } from "./Icon.tsx";
import { RouteBadge } from "./RouteBadge.tsx";
import type { NearbyStopCardProps } from "./types.ts";
import { WalkButton } from "./WalkButton.tsx";

type RouteInfo = { id: string; name: string; color: string; textColor: string };
type Row = { kind: "route"; route: NearbyRoute; deps: NearbyRoute["departures"] } | ({ kind: "none" } & RouteInfo);

/**
 * Rows by first upcoming departure; canceled-only routes next; then routes with nothing in the
 * window ("No buses in the next 2 hours"): those in `stop.routes` without departures, and those
 * whose departures have all passed since the last poll.
 */
function orderRows(props: NearbyStopCardProps, now: number): Row[] {
  const withDeps = props.routes.map((route) => ({ route, deps: upcoming(route.departures, now) }));
  const firstLive = (deps: NearbyRoute["departures"]) => deps.find((d) => !d.canceled);
  const rank = (deps: NearbyRoute["departures"]) => {
    const first = firstLive(deps);
    return first ? Date.parse(first.departureTime) : Number.MAX_SAFE_INTEGER;
  };
  const running = withDeps.filter((r) => r.deps.length).sort((a, b) => rank(a.deps) - rank(b.deps));
  const shownIds = new Set(running.map((r) => r.route.routeId));
  const none = new Map<string, RouteInfo>();
  for (const { route } of withDeps)
    if (!shownIds.has(route.routeId)) none.set(route.routeId, { id: route.routeId, name: route.name, color: route.color, textColor: route.textColor });
  for (const r of props.stop.routes) if (!shownIds.has(r.id) && !none.has(r.id)) none.set(r.id, r);
  return [
    ...running.map(({ route, deps }): Row => ({ kind: "route", route, deps })),
    ...[...none.values()].map((r): Row => ({ kind: "none", ...r })),
  ];
}

/** C.5a: a nearby stop with its walk time and next buses per route. */
export function NearbyStopCard(props: NearbyStopCardProps) {
  const { stop, walkDistanceM, maxRoutes = 3, walkFrom, onOpen, onOpenRoute, onWalk, firstRowRef } = props;
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const offline = useOffline();
  const { walkPace } = usePrefs();
  const walkMin = walkDistanceM !== undefined ? walkMinutes(walkDistanceM, walkPace) : undefined;
  const rows = orderRows(props, now);
  const shown = rows.slice(0, maxRoutes);
  const hidden = rows.slice(maxRoutes);
  const side = sideLine(stop, { withCompass: false, lang });
  const title = t("stopLine.title", { name: stop.name, id: stop.id });

  const rowText = (row: Row) => {
    if (row.kind === "none") return `${t("routeName.a11y", { name: row.name })}, ${t("card.noBuses2h")}`;
    const ref = toRouteRef({ id: row.route.routeId, name: row.route.name, color: row.route.color, textColor: row.route.textColor });
    const times = shownDeps(row.deps, now, walkMin).slice(0, 2).map((d) => departureA11y(d, now, { walkMin, offline, lang }));
    return `${t("routeName.a11y", { name: row.route.name })} ${headsignLine(ref, row.route.directionLabel, row.route.headsign, lang)}, ${times.join(`; ${t("card.then")} `)}`;
  };
  const summary = [title, side, walkMin !== undefined ? t("time.minutesA11y", { count: walkMin }) : ""].filter(Boolean).join(", ");

  return (
    <article className={styles.card}>
      <button type="button" className={styles.hit} aria-label={`${summary}. ${shown.map(rowText).join(". ")}`} onClick={onOpen} />
      <h2 className={styles.name}>{title}</h2>
      {(side || walkDistanceM !== undefined) && (
        <div className={styles.metaRow}>
          <p className={styles.meta}>{side}</p>
          {walkDistanceM !== undefined && <WalkButton stopId={stop.id} walkDistanceM={walkDistanceM} walkFrom={walkFrom} onPress={onWalk} />}
        </div>
      )}
      <hr className={styles.divider} />
      <ul className={styles.rows}>
        {shown.map((row, i) => {
          const rowRef = i === 0 ? firstRowRef : undefined;
          if (row.kind === "none") {
            const ref = toRouteRef(row);
            return (
              <li key={`none-${row.id}`} ref={rowRef}>
                <button type="button" className={styles.row} onClick={() => onOpenRoute(row.id)}>
                  <RouteBadge route={ref} size="sm" />
                  <span className={`${styles.rowText} ${styles.noService}`}>
                    {t("routeName.a11y", { name: row.name })} · {t("card.noBuses2h")}
                  </span>
                </button>
              </li>
            );
          }
          const r = row.route;
          const ref = toRouteRef({ id: r.routeId, name: r.name, color: r.color, textColor: r.textColor });
          return (
            <li key={`${r.routeId}|${r.directionLabel}`} ref={rowRef}>
              <button type="button" className={styles.row} aria-label={rowText(row)} onClick={() => onOpenRoute(r.routeId)}>
                <RouteBadge route={ref} size="sm" />
                <span className={styles.rowText}>
                  <span className={styles.headsign}>{headsignLine(ref, r.directionLabel, r.headsign, lang)}</span>
                  <DepTimes deps={row.deps} walkMin={walkMin} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {hidden.length > 0 && (
        <button type="button" className={styles.link} onClick={onOpen}>
          <span>
            {t("card.alsoHere", {
              names: hidden.map((r) => t("routeName.a11y", { name: r.kind === "none" ? r.name : r.route.name })).join(", "),
            })}
            <Icon name="chevron_right" />
          </span>
        </button>
      )}
    </article>
  );
}
