// D5 before anything is typed: the rider's saved stops and routes, recently viewed routes and stops,
// recent searches, then one short hint line and a way to browse routes.

import { useArrivals } from "../../../api/hooks.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { sideLine, stopTitle } from "../../../lib/format.ts";
import { routeRef, routeRefOrFallback } from "../../../lib/routes.ts";
import { useRecents } from "../../../state/recents.ts";
import { useSaved, type SavedStop } from "../../../state/saved.ts";
import { Button } from "../../../ui/Button.tsx";
import { Icon } from "../../../ui/Icon.tsx";
import { RouteBadge } from "../../../ui/RouteBadge.tsx";
import { SavedStopRow } from "../../../ui/SavedStopRow.tsx";
import { SectionHeader } from "../../../ui/SectionHeader.tsx";
import { SimpleRow } from "./ResultRows.tsx";
import { savedRoutes } from "./savedRoutes.ts";
import styles from "./Search.module.css";

const MAX_SAVED = 3;
const MAX_RECENT = 5;
const MAX_RECENT_STOPS = 3;
const MAX_ROUTES = 3;

interface EmptyQueryProps {
  /** Pick mode lists saved stops as plain pickable rows. */
  pick: boolean;
  onOpenStop: (stop: SavedStop) => void;
  onOpenRecentStop: (stop: { id: string; name: string }) => void;
  onRecent: (q: string) => void;
  /** A saved or recently viewed route (not offered in pick mode, which picks places and stops). */
  onOpenRoute: (id: string) => void;
  onAllRoutes: () => void;
}

export function EmptyQuery({ pick, onOpenStop, onOpenRecentStop, onRecent, onOpenRoute, onAllRoutes }: EmptyQueryProps) {
  const t = useT();
  const lang = useLang();
  const savedState = useSaved();
  const savedAll = savedState.stops;
  const saved = savedAll.slice(0, MAX_SAVED);
  const recents = useRecents();
  const searches = recents.searches.slice(0, MAX_RECENT);
  // Stops the rider opened before, so a repeat trip is one tap instead of typing (saved ones are listed above).
  const recentStops = recents.stops.filter((s) => !savedAll.some((x) => x.id === s.id)).slice(0, MAX_RECENT_STOPS);
  // Saved routes first, then the ones the rider opened lately.
  const routes = pick
    ? []
    : [...savedState.routes, ...recents.routes]
        .filter((r, i, all) => all.findIndex((x) => x.id === r.id) === i)
        .slice(0, MAX_ROUTES);
  return (
    <>
      {saved.length > 0 && (
        <section className={styles.section}>
          <SectionHeader tone="variant" label={t("search.saved")} />
          {pick ? (
            saved.map((s) => <SimpleRow key={s.id} icon="star_filled" title={stopTitle(s.name, s.id, lang)} onPress={() => onOpenStop(s)} />)
          ) : (
            <div className={styles.saved}>
              {saved.map((s) => (
                <SavedRow key={s.id} stop={s} onOpen={() => onOpenStop(s)} />
              ))}
            </div>
          )}
        </section>
      )}
      {routes.length > 0 && (
        <section className={styles.section}>
          <SectionHeader tone="variant" label={t("search.yourRoutes")} />
          {routes.map((r) => (
            <div key={r.id} className={styles.row}>
              <button type="button" className={styles.body} onClick={() => onOpenRoute(r.id)}>
                <span className={styles.badge} aria-hidden="true">
                  <RouteBadge route={routeRef(r.id) ?? routeRefOrFallback(r.id, r.name.split(" ")[0] ?? r.name)} size="sm" />
                </span>
                <span className={`${styles.text} ${styles.routeTitle}`}>
                  <span className={styles.title}>{r.name}</span>
                </span>
                <span className={styles.chevron} aria-hidden="true">
                  <Icon name="chevron_right" />
                </span>
              </button>
            </div>
          ))}
        </section>
      )}
      {recentStops.length > 0 && (
        <section className={styles.section}>
          <SectionHeader tone="variant" label={t("search.recentStops")} />
          {recentStops.map((s) => (
            <SimpleRow
              key={s.id}
              icon="bus_stop"
              title={stopTitle(s.name, s.id, lang)}
              lines={[sideLine({ kind: s.kind, side: s.side }, { withCompass: false, lang })].filter(Boolean)}
              onPress={() => onOpenRecentStop(s)}
            />
          ))}
        </section>
      )}
      {searches.length > 0 && (
        <section className={styles.section}>
          <SectionHeader tone="variant" label={t("search.recent")} />
          {searches.map((s) => (
            <div key={s.q} className={styles.recent}>
              <button type="button" className={styles.recentQuery} onClick={() => onRecent(s.q)}>
                <span className={styles.recentIcon}>
                  <Icon name="schedule" color="var(--c-text-variant)" />
                </span>
                {s.q}
              </button>
              <Button variant="text" label={t("common.remove")} ariaLabel={t("search.removeRecentA11y", { q: s.q })} onPress={() => recents.removeSearch(s.q)} />
            </div>
          ))}
        </section>
      )}
      <section className={styles.section}>
        {/* One short line that says what can be typed. */}
        <p className={styles.hint}>{t("search.hint")}</p>
        {!pick && <SimpleRow icon="directions_bus" title={t("search.allRoutes")} lines={[t("search.allRoutesLine")]} onPress={onAllRoutes} />}
      </section>
    </>
  );
}

function SavedRow({ stop, onOpen }: { stop: SavedStop; onOpen: () => void }) {
  const arrivals = useArrivals(stop.id, { limit: 6 });
  return (
    <SavedStopRow
      stopId={stop.id}
      name={stop.name}
      preferredRouteId={stop.preferredRouteId}
      routes={savedRoutes(arrivals.data?.arrivals ?? [])}
      onOpen={onOpen}
    />
  );
}
