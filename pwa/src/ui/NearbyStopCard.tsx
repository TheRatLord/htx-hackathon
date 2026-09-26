import type { NearbyRoute } from "../api/types.ts";
import { useLang, useT } from "../i18n/index.ts";
import { formatDeparture, headsignLine, sideLine, statusOf, upcoming } from "../lib/format.ts";
import { toRouteRef } from "../lib/routes.ts";
import { walkMinutes } from "../lib/walk.ts";
import { useNow } from "../state/clock.ts";
import { usePrefs } from "../state/prefs.ts";
import styles from "./cards.module.css";
import { DepTimes } from "./DepTimes.tsx";
import { Icon } from "./Icon.tsx";
import { RouteBadge } from "./RouteBadge.tsx";
import type { NearbyStopCardProps } from "./types.ts";
import { WalkButton } from "./WalkButton.tsx";

type Row = { kind: "route"; route: NearbyRoute } | { kind: "none"; id: string; name: string; color: string; textColor: string };

/**
 * Rows by first upcoming departure; canceled-only routes, then routes with no departure in the
 * window ("No buses in the next 2 hours", from `stop.routes`), last.
 */
function orderRows(props: NearbyStopCardProps, now: number): Row[] {
  const rank = (r: NearbyRoute) => {
    const next = upcoming(r.departures, now);
    const first = next.find((d) => !d.canceled);
    if (first) return Date.parse(first.departureTime);
    return next.length ? Number.MAX_SAFE_INTEGER - 1 : Number.MAX_SAFE_INTEGER;
  };
  const served = new Set(props.routes.map((r) => r.routeId));
  const routes = [...props.routes].sort((a, b) => rank(a) - rank(b));
  const none = props.stop.routes.filter((r) => !served.has(r.id));
  return [...routes.map((route): Row => ({ kind: "route", route })), ...none.map((r): Row => ({ kind: "none", ...r }))];
}

/** C.5a: a nearby stop with its walk time and next buses per route. */
export function NearbyStopCard(props: NearbyStopCardProps) {
  const { stop, walkDistanceM, maxRoutes = 3, walkFrom, onOpen, onOpenRoute, onWalk } = props;
  const t = useT();
  const lang = useLang();
  const now = useNow();
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
    const times = upcoming(row.route.departures, now)
      .slice(0, 2)
      .map((d) => formatDeparture(d.departureTime, now, { status: statusOf(d), lang }));
    return `${t("routeName.a11y", { name: row.route.name })} ${headsignLine(ref, row.route.directionLabel, row.route.headsign, lang)}, ${times.join(`; ${t("card.then")} `)}`;
  };
  const summary = [title, side, walkMin !== undefined ? t("time.minutesA11y", { count: walkMin }) : ""].filter(Boolean).join(", ");

  return (
    <article className={styles.card}>
      <button type="button" className={styles.hit} aria-label={`${summary}. ${shown.map(rowText).join(". ")}`} onClick={onOpen} />
      <div className={styles.top}>
        <h2 className={styles.name}>{title}</h2>
        {walkDistanceM !== undefined && (
          <WalkButton stopId={stop.id} walkDistanceM={walkDistanceM} walkFrom={walkFrom} onPress={onWalk} />
        )}
      </div>
      {side && <p className={styles.meta}>{side}</p>}
      <hr className={styles.divider} />
      <ul className={styles.rows}>
        {shown.map((row) => {
          if (row.kind === "none") {
            const ref = toRouteRef(row);
            return (
              <li key={row.id}>
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
            <li key={`${r.routeId}|${r.directionLabel}`}>
              <button type="button" className={styles.row} aria-label={rowText(row)} onClick={() => onOpenRoute(r.routeId)}>
                <RouteBadge route={ref} size="sm" />
                <span className={styles.rowText}>
                  <span className={styles.headsign}>{headsignLine(ref, r.directionLabel, r.headsign, lang)}</span>
                  <DepTimes deps={r.departures} walkMin={walkMin} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {hidden.length > 0 && (
        <button type="button" className={styles.link} onClick={onOpen}>
          {t("card.moreRoutes", {
            count: hidden.length,
            names: hidden.map((r) => (r.kind === "none" ? r.name : r.route.name)).join(", "),
          })}
          <Icon name="chevron_right" />
        </button>
      )}
    </article>
  );
}
