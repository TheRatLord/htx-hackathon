// D16 Recent: SAVED first, then today's "recently viewed" sections and recent trips.
// Recents are written by other screens (C.17); this screen only reads and clears them.

import { useState } from "react";
import { useNavigate } from "react-router";
import { usePageTitle } from "../../app/usePageTitle.ts";
import { useLang, useT } from "../../i18n/index.ts";
import { useSavedStopRoutes } from "../../api/savedStop.ts";
import { headsignLine, sideLine, upcoming } from "../../lib/format.ts";
import { useNow } from "../../state/clock.ts";
import { planUrl, type PlanQuery } from "../../lib/planQuery.ts";
import { canonicalRouteId, routeRef, routeRefOrFallback, stopDirection, useAllRoutes, useRoutesLoaded } from "../../lib/routes.ts";
import { useRecents, type RecentStop } from "../../state/recents.ts";
import { useSaved } from "../../state/saved.ts";
import { Button } from "../../ui/Button.tsx";
import cards from "../../ui/cards.module.css";
import { DepTimes } from "../../ui/DepTimes.tsx";
import { Dialog } from "../../ui/Dialog.tsx";
import { EmptyState } from "../../ui/EmptyState.tsx";
import { Icon } from "../../ui/Icon.tsx";
import { ListRow } from "../../ui/ListRow.tsx";
import { RouteBadge } from "../../ui/RouteBadge.tsx";
import { SectionHeader } from "../../ui/SectionHeader.tsx";
import type { SavedStopRoute } from "../../ui/types.ts";
import styles from "./Recent.module.css";
import { SavedStops } from "./SavedStops.tsx";

/** A saved or recently viewed route: its chip and its name ("[82] Westheimer"), as the route list (D20). */
function RecentRouteRow({ route, longName }: { route: { id: string; name: string }; longName?: string }) {
  const t = useT();
  const ref = routeRefOrFallback(route.id, route.name);
  return (
    <ListRow
      kind="internal"
      leading={<RouteBadge route={ref} size="sm" />}
      label={longName || t("alerts.routeName", { route: ref.name })}
      href={`/explore/route/${encodeURIComponent(ref.id)}`}
    />
  );
}

/** Only the newest few recent stops fetch times, so a long history doesn't poll ten stops. */
const LIVE_RECENT_STOPS = 5;
const MAX_ROUTE_ROWS = 3;

/**
 * A recently viewed stop as a card (today's Recent shows each stop as a card with its route chip and
 * direction): the bold name, the side of the street, then one row per route with its next buses.
 * Older entries, and the moment before times arrive, show the route rows from the route table alone.
 */
function RecentStopCard({ stop, live }: { stop: RecentStop; live: boolean }) {
  const t = useT();
  const lang = useLang();
  const navigate = useNavigate();
  const now = useNow();
  const { routes, arrivals } = useSavedStopRoutes(live ? { id: stop.id, name: stop.name, addedAt: 0 } : undefined);
  const fromTable: SavedStopRoute[] = stop.routes.flatMap((id) => {
    const route = routeRef(id);
    const dir = stopDirection(id, stop.id);
    return route ? [{ route, directionLabel: dir?.directionLabel ?? "", headsign: dir?.headsign ?? "", deps: [] }] : [];
  });
  const loaded = live && routes !== undefined && !arrivals.isError;
  const rows = (loaded && routes.length ? routes : fromTable).slice(0, MAX_ROUTE_ROWS);
  const title = t("stopLine.title", { name: stop.name, id: stop.id });
  const side = sideLine(stop, { withCompass: false, lang });
  return (
    <article className={cards.card}>
      <button type="button" className={cards.hit} aria-label={title} onClick={() => navigate(`/explore/stop/${encodeURIComponent(stop.id)}`)} />
      <h3 className={cards.name}>{title}</h3>
      {side && <p className={cards.meta}>{side}</p>}
      {rows.length > 0 && <hr className={cards.divider} />}
      {rows.map((r) => (
        <div key={r.route.id} className={cards.routeRow}>
          <RouteBadge route={r.route} size="sm" />
          <div className={cards.rowText}>
            {r.headsign && <span className={cards.headsign}>{headsignLine(r.route, r.directionLabel, r.headsign, lang)}</span>}
            {loaded &&
              (upcoming(r.deps, now).length ? <DepTimes deps={r.deps} /> : <span className={cards.noService}>{t("strip.noBuses3h")}</span>)}
          </div>
        </div>
      ))}
    </article>
  );
}

/** A trip end the planner saved without a name: a stop id, or a place picked on the map ("29.6457,-95.2789"). */
function placeName(value: string | undefined, name: string | undefined, t: ReturnType<typeof useT>): string {
  if (name) return name;
  if (!value) return t("common.myLocation");
  return /^\d+$/.test(value) ? t("card.stopNumber", { id: value }) : t("recent.chosenPlace");
}

function RecentTrip({ query }: { query: PlanQuery }) {
  const t = useT();
  const from = placeName(query.from, query.fromName, t);
  const to = placeName(query.to, query.toName, t);
  return (
    <div className={styles.trip}>
      <span className={styles.tripText}>
        <span className={styles.place}>
          <span className={styles.originDot} aria-hidden="true" />
          {from}
        </span>
        <span className={styles.place}>
          <Icon name="place" size={20} color="var(--c-dest-pin)" />
          {to}
        </span>
      </span>
      {/* The time is dropped: planning again means leaving now. */}
      <Button
        variant="text"
        label={t("recent.planAgain")}
        ariaLabel={t("recent.planAgainA11y", { from, to })}
        href={planUrl({ ...query, time: undefined, arriveBy: undefined })}
      />
    </div>
  );
}

export default function Recent() {
  const t = useT();
  const navigate = useNavigate();
  const recents = useRecents();
  const saved = useSaved();
  const [editing, setEditing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  useRoutesLoaded();
  const { routes: allRoutes } = useAllRoutes();
  const longNames = new Map(allRoutes.map((r) => [r.id, r.longName]));
  usePageTitle(t("recent.title"));

  // A saved stop already has its card at the top; don't list it twice.
  const recentStops = recents.stops.filter((r) => !saved.stops.some((x) => x.id === r.id));
  const hasRecents = recents.routes.length + recents.stops.length + recents.trips.length > 0;
  const empty = !hasRecents && saved.stops.length === 0 && saved.routes.length === 0;

  return (
    <div className={styles.page}>
      <div className={styles.titleRow}>
        <h1 tabIndex={-1} className={styles.title}>
          {t("recent.title")}
        </h1>
        {hasRecents && <Button variant="text" label={t("common.clear")} onPress={() => setConfirmClear(true)} />}
      </div>

      {empty ? (
        <EmptyState
          icon="bus_stop"
          title={t("recent.emptyTitle")}
          body={t("recent.emptyBody")}
          action={{ label: t("recent.search"), onPress: () => navigate("/explore/search") }}
        />
      ) : (
        <>
          {saved.stops.length > 0 && <SavedStops editing={editing} onEdit={setEditing} />}

          {saved.routes.length > 0 && (
            <section>
              <SectionHeader label={t("recent.savedRoutes")} tone="variant" />
              {saved.routes.map((r) => (
                <RecentRouteRow key={r.id} route={r} longName={longNames.get(canonicalRouteId(r.id))} />
              ))}
            </section>
          )}

          {recentStops.length > 0 && (
            <section>
              <SectionHeader label={t("recent.recentStops")} tone="variant" />
              <ul className={styles.cards}>
                {recentStops.map((s, i) => (
                  <li key={s.id}>
                    <RecentStopCard stop={s} live={i < LIVE_RECENT_STOPS} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {recents.routes.length > 0 && (
            <section>
              <SectionHeader label={t("recent.recentRoutes")} tone="variant" />
              {recents.routes.map((r) => (
                <RecentRouteRow key={r.id} route={r} longName={longNames.get(canonicalRouteId(r.id))} />
              ))}
            </section>
          )}

          {recents.trips.length > 0 && (
            <section>
              <SectionHeader label={t("recent.recentTrips")} tone="variant" />
              {recents.trips.map(({ query }) => (
                <RecentTrip key={`${query.from}|${query.to}`} query={query} />
              ))}
            </section>
          )}

          {/* With nothing saved yet, one line at the end says how (it used to be a whole section on top). */}
          {saved.stops.length === 0 && (
            <p className={styles.tip}>
              <Icon name="star" size={20} color="var(--c-text-variant)" />
              {t("recent.savedEmpty")}
            </p>
          )}
        </>
      )}

      <Dialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title={t("recent.clearTitle")}
        body={t("recent.clearBody")}
        actions={[
          { label: t("common.cancel"), variant: "text", onPress: () => setConfirmClear(false) },
          {
            label: t("common.clear"),
            variant: "danger-text",
            onPress: () => {
              recents.clear();
              setConfirmClear(false);
            },
          },
        ]}
      />
    </div>
  );
}
