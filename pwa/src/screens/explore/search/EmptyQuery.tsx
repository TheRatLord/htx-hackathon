// D5 before anything is typed: saved stops, recently viewed stops, recent searches and examples to tap.

import { useArrivals } from "../../../api/hooks.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { sideLine } from "../../../lib/format.ts";
import { useRecents } from "../../../state/recents.ts";
import { useSaved, type SavedStop } from "../../../state/saved.ts";
import { Button } from "../../../ui/Button.tsx";
import { Icon } from "../../../ui/Icon.tsx";
import { SavedStopRow } from "../../../ui/SavedStopRow.tsx";
import { SectionHeader } from "../../../ui/SectionHeader.tsx";
import { SimpleRow } from "./ResultRows.tsx";
import { savedRoutes } from "./savedRoutes.ts";
import styles from "./Search.module.css";

const MAX_SAVED = 3;
const MAX_RECENT = 5;
const MAX_RECENT_STOPS = 3;

interface EmptyQueryProps {
  /** Pick mode lists saved stops as plain pickable rows. */
  pick: boolean;
  onOpenStop: (stop: SavedStop) => void;
  onOpenRecentStop: (stop: { id: string; name: string }) => void;
  onRecent: (q: string) => void;
}

export function EmptyQuery({ pick, onOpenStop, onOpenRecentStop, onRecent }: EmptyQueryProps) {
  const t = useT();
  const lang = useLang();
  const savedAll = useSaved().stops;
  const saved = savedAll.slice(0, MAX_SAVED);
  const recents = useRecents();
  const searches = recents.searches.slice(0, MAX_RECENT);
  // Stops the rider opened before, so a repeat trip is one tap instead of typing (saved ones are listed above).
  const recentStops = recents.stops.filter((s) => !savedAll.some((x) => x.id === s.id)).slice(0, MAX_RECENT_STOPS);
  const examples = t("search.examples").split("|");
  return (
    <>
      {saved.length > 0 && (
        <section className={styles.section}>
          <SectionHeader tone="variant" label={t("search.saved")} />
          {pick ? (
            saved.map((s) => <SimpleRow key={s.id} icon="star_filled" title={t("stopLine.title", { name: s.name, id: s.id })} onPress={() => onOpenStop(s)} />)
          ) : (
            <div className={styles.saved}>
              {saved.map((s) => (
                <SavedRow key={s.id} stop={s} onOpen={() => onOpenStop(s)} />
              ))}
            </div>
          )}
        </section>
      )}
      {recentStops.length > 0 && (
        <section className={styles.section}>
          <SectionHeader tone="variant" label={t("search.recentStops")} />
          {recentStops.map((s) => (
            <SimpleRow
              key={s.id}
              icon="bus_stop"
              title={t("stopLine.title", { name: s.name, id: s.id })}
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
      <section className={styles.examples} aria-label={t("search.hint")}>
        <p className={styles.hint}>{t("search.tryLabel")}</p>
        <div className={styles.exampleChips}>
          {examples.map((q) => (
            <Button key={q} variant="tonal" label={q} onPress={() => onRecent(q)} />
          ))}
        </div>
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
