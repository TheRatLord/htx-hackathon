// D16's SAVED STOPS section: live saved rows, with Move up / Move down / Remove in edit mode.

import { useNavigate } from "react-router";
import { useArrivals } from "../../api/hooks.ts";
import type { Arrival } from "../../api/types.ts";
import { useT } from "../../i18n/index.ts";
import { routeRef, toRouteRef } from "../../lib/routes.ts";
import { useSaved, type SavedStop } from "../../state/saved.ts";
import { Button } from "../../ui/Button.tsx";
import { SavedStopRow } from "../../ui/SavedStopRow.tsx";
import { SectionHeader } from "../../ui/SectionHeader.tsx";
import { useToast } from "../../ui/Toast.tsx";
import type { SavedStopRoute } from "../../ui/types.ts";
import styles from "./Recent.module.css";

/** C.5b: one arrivals call per saved stop (the same query the Explore saved row uses). */
const SAVED_ROW_LIMIT = 6;

/** One entry per route and direction, in order of first departure. */
function byRoute(arrivals: Arrival[]): SavedStopRoute[] {
  const groups = new Map<string, SavedStopRoute>();
  for (const a of arrivals) {
    const key = `${a.routeId}|${a.directionLabel}`;
    const group = groups.get(key);
    if (group) {
      group.deps.push(a);
      continue;
    }
    const route = routeRef(a.routeId) ?? toRouteRef({ id: a.routeId, name: a.routeShortName, color: a.routeColor, textColor: a.routeTextColor });
    groups.set(key, { route, directionLabel: a.directionLabel, headsign: a.headsign, deps: [a] });
  }
  return [...groups.values()];
}

function SavedRow({ stop }: { stop: SavedStop }) {
  const t = useT();
  const navigate = useNavigate();
  const arrivals = useArrivals(stop.id, { limit: SAVED_ROW_LIMIT });
  const route = stop.preferredRouteId ? `?route=${encodeURIComponent(stop.preferredRouteId)}` : "";
  return (
    <>
      <SavedStopRow
        stopId={stop.id}
        name={stop.name}
        preferredRouteId={stop.preferredRouteId}
        routes={byRoute(arrivals.data?.arrivals ?? [])}
        onOpen={() => navigate(`/explore/stop/${encodeURIComponent(stop.id)}${route}`)}
      />
      {arrivals.isError && !arrivals.data && (
        <p className={styles.rowError}>
          {t("recent.timesError")}
          <Button variant="text" label={t("common.tryAgain")} onPress={() => void arrivals.refetch()} />
        </p>
      )}
    </>
  );
}

export function SavedStops({ editing, onEdit }: { editing: boolean; onEdit: (on: boolean) => void }) {
  const t = useT();
  const toast = useToast();
  const saved = useSaved();

  const remove = (stop: SavedStop, index: number) => {
    saved.remove(stop.id);
    if (saved.stops.length === 1) onEdit(false);
    toast({ message: t("recent.removed", { name: stop.name }), action: { label: t("common.undo"), onPress: () => saved.restore(stop, index) } });
  };

  return (
    <section>
      <SectionHeader
        label={`★ ${t("recent.savedStops")}`}
        tone="variant"
        action={saved.stops.length ? { label: editing ? t("common.done") : t("common.edit"), onPress: () => onEdit(!editing) } : undefined}
      />
      {saved.stops.length === 0 ? (
        <p className={styles.hint}>{t("recent.savedEmpty")}</p>
      ) : (
        <ul className={styles.saved}>
          {saved.stops.map((stop, i) => (
            <li key={stop.id}>
              <SavedRow stop={stop} />
              {editing && (
                <div className={styles.editRow}>
                  {i > 0 && <Button variant="text" icon="arrow_upward" label={t("recent.moveUp")} onPress={() => saved.move(stop.id, "up")} />}
                  {i < saved.stops.length - 1 && (
                    <Button variant="text" icon="arrow_downward" label={t("recent.moveDown")} onPress={() => saved.move(stop.id, "down")} />
                  )}
                  <Button variant="danger-text" label={t("common.remove")} onPress={() => remove(stop, i)} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
