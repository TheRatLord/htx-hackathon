// D16 Recent: SAVED first, then today's "recently viewed" sections and recent trips.
// Recents are written by other screens (C.17); this screen only reads and clears them.

import { useState } from "react";
import { useNavigate } from "react-router";
import { usePageTitle } from "../../app/usePageTitle.ts";
import { useLang, useT } from "../../i18n/index.ts";
import { sideLine } from "../../lib/format.ts";
import { planUrl, type PlanQuery } from "../../lib/planQuery.ts";
import { routeRef, useRoutesLoaded } from "../../lib/routes.ts";
import { useRecents, type RecentStop } from "../../state/recents.ts";
import { useSaved } from "../../state/saved.ts";
import { Button } from "../../ui/Button.tsx";
import { Dialog } from "../../ui/Dialog.tsx";
import { EmptyState } from "../../ui/EmptyState.tsx";
import { Icon } from "../../ui/Icon.tsx";
import { ListRow } from "../../ui/ListRow.tsx";
import { RouteBadge } from "../../ui/RouteBadge.tsx";
import { SectionHeader } from "../../ui/SectionHeader.tsx";
import { routeRefOr } from "../alerts/routeRefs.ts";
import styles from "./Recent.module.css";
import { SavedStops } from "./SavedStops.tsx";

function RouteChips({ routes }: { routes: { id: string; name: string }[] }) {
  const navigate = useNavigate();
  const refs = routes.map((r) => routeRefOr(r.id, r.name));
  return (
    <div className={styles.chips}>
      {refs.map((r) => (
        <RouteBadge key={r.id} route={r} size="md" onPress={() => navigate(`/explore/route/${encodeURIComponent(r.id)}`)} />
      ))}
    </div>
  );
}

function RecentStopRow({ stop }: { stop: RecentStop }) {
  const t = useT();
  const lang = useLang();
  const names = stop.routes.map((id) => routeRef(id)?.name ?? id);
  const sub = [sideLine(stop, { withCompass: true, lang }), names.length ? t("recent.routes", { count: names.length, names: names.join(", ") }) : ""]
    .filter(Boolean)
    .join(" · ");
  return (
    <ListRow
      kind="internal"
      leading={<Icon name="bus_stop" color="var(--c-text-variant)" />}
      label={t("stopLine.title", { name: stop.name, id: stop.id })}
      sub={sub}
      href={`/explore/stop/${encodeURIComponent(stop.id)}`}
    />
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
  usePageTitle(t("recent.title"));

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
          <SavedStops editing={editing} onEdit={setEditing} />

          {saved.routes.length > 0 && (
            <section>
              <SectionHeader label={`★ ${t("recent.savedRoutes")}`} tone="variant" />
              <RouteChips routes={saved.routes} />
            </section>
          )}

          {recents.routes.length > 0 && (
            <section>
              <SectionHeader label={t("recent.recentRoutes")} tone="variant" />
              <RouteChips routes={recents.routes} />
            </section>
          )}

          {recents.stops.length > 0 && (
            <section>
              <SectionHeader label={t("recent.recentStops")} tone="variant" />
              {recents.stops.map((s) => (
                <RecentStopRow key={s.id} stop={s} />
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
