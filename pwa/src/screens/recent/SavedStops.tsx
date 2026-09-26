// D16's SAVED STOPS section: live saved rows, with Move up / Move down / Remove in edit mode.

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";
import { useNavigate } from "react-router";
import { useArrivals } from "../../api/hooks.ts";
import { keys } from "../../api/keys.ts";
import type { Arrival } from "../../api/types.ts";
import { useT } from "../../i18n/index.ts";
import { canonicalRouteId, routeRef, toRouteRef } from "../../lib/routes.ts";
import { useSaved, type SavedStop } from "../../state/saved.ts";
import { Button } from "../../ui/Button.tsx";
import { SavedStopRow } from "../../ui/SavedStopRow.tsx";
import { ScheduleCaption } from "../../ui/ScheduleCaption.tsx";
import { SectionHeader } from "../../ui/SectionHeader.tsx";
import { useToast } from "../../ui/Toast.tsx";
import type { SavedStopRoute } from "../../ui/types.ts";
import { UpdatedAgo } from "../../ui/UpdatedAgo.tsx";
import { useStopDirections } from "../alerts/staticData.ts";
import styles from "./Recent.module.css";

/** C.5b: one arrivals call per saved stop (the same query the Explore saved row uses). */
const SAVED_ROW_LIMIT = 6;
const savedRowKey = (stopId: string) => keys.arrivals(stopId, undefined, SAVED_ROW_LIMIT);

/** One entry per route (its first direction), in order of first departure. */
function byRoute(arrivals: Arrival[]): SavedStopRoute[] {
  const groups = new Map<string, SavedStopRoute>();
  for (const a of arrivals) {
    const key = canonicalRouteId(a.routeId);
    const group = groups.get(key);
    if (group) {
      if (group.directionLabel === a.directionLabel) group.deps.push(a);
      continue;
    }
    const route = routeRef(a.routeId) ?? toRouteRef({ id: a.routeId, name: a.routeShortName, color: a.routeColor, textColor: a.routeTextColor });
    groups.set(key, { route, directionLabel: a.directionLabel, headsign: a.headsign, deps: [a] });
  }
  return [...groups.values()];
}

/**
 * C.5b: the preferred route always shows, with "No buses in the next 3 hours" when it has none.
 * The row's call returns the next 6 buses of any route, so a preferred route missing from it gets
 * its own call; when that is empty too, its direction and headsign come from routes.json.
 */
function usePreferredRoute(stop: SavedStop, rowArrivals: Arrival[] | undefined): SavedStopRoute | undefined {
  const prefId = stop.preferredRouteId ? canonicalRouteId(stop.preferredRouteId) : undefined;
  const missing = Boolean(prefId && rowArrivals && !rowArrivals.some((a) => canonicalRouteId(a.routeId) === prefId));
  const own = useArrivals(stop.id, { route: prefId, limit: SAVED_ROW_LIMIT, enabled: missing });
  const directions = useStopDirections(missing && own.data?.arrivals.length === 0);
  if (!missing || !prefId || !own.data) return undefined;
  const found = byRoute(own.data.arrivals)[0];
  if (found) return found;
  const route = routeRef(prefId);
  const dir = directions?.get(stop.id)?.find((d) => d.routeId === prefId);
  return route && dir ? { route, directionLabel: dir.directionLabel, headsign: dir.headsign, deps: [] } : undefined;
}

function SavedRow({ stop, editing }: { stop: SavedStop; editing: boolean }) {
  const t = useT();
  const navigate = useNavigate();
  const arrivals = useArrivals(stop.id, { limit: SAVED_ROW_LIMIT });
  const preferred = usePreferredRoute(stop, arrivals.data?.arrivals);
  const routes = byRoute(arrivals.data?.arrivals ?? []);
  const route = stop.preferredRouteId ? `?route=${encodeURIComponent(stop.preferredRouteId)}` : "";
  return (
    <>
      {/* Inert while editing, so a tap that misses Move or Remove never opens the stop. */}
      <div inert={editing}>
        <SavedStopRow
          stopId={stop.id}
          name={stop.name}
          preferredRouteId={stop.preferredRouteId && canonicalRouteId(stop.preferredRouteId)}
          routes={preferred ? [preferred, ...routes] : routes}
          onOpen={() => navigate(`/explore/stop/${encodeURIComponent(stop.id)}${route}`)}
        />
      </div>
      {arrivals.isError && !arrivals.data && (
        <p className={styles.rowError}>
          {t("recent.timesError")}
          <Button variant="text" label={t("common.tryAgain")} onPress={() => void arrivals.refetch()} />
        </p>
      )}
    </>
  );
}

/** When the newest saved-row answer arrived (0 before any), for the one "Updated … ago" line. */
function useRowsUpdatedAt(stopIds: string[]): number {
  const qc = useQueryClient();
  const subscribe = useCallback((onChange: () => void) => qc.getQueryCache().subscribe(onChange), [qc]);
  return useSyncExternalStore(subscribe, () => Math.max(0, ...stopIds.map((id) => qc.getQueryState(savedRowKey(id))?.dataUpdatedAt ?? 0)));
}

export function SavedStops({ editing, onEdit }: { editing: boolean; onEdit: (on: boolean) => void }) {
  const t = useT();
  const toast = useToast();
  const qc = useQueryClient();
  const saved = useSaved();
  const stopIds = saved.stops.map((s) => s.id);
  const updatedAt = useRowsUpdatedAt(stopIds);

  const remove = (stop: SavedStop, index: number) => {
    saved.remove(stop.id);
    if (saved.stops.length === 1) onEdit(false);
    toast({ message: t("recent.removed", { name: stop.name }), action: { label: t("common.undo"), onPress: () => saved.restore(stop, index) } });
  };
  const refresh = () => stopIds.forEach((id) => void qc.refetchQueries({ queryKey: savedRowKey(id), exact: true }));

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
        <>
          {updatedAt > 0 && (
            <div className={styles.status}>
              <ScheduleCaption />
              <UpdatedAgo at={new Date(updatedAt).toISOString()} onRefresh={refresh} />
            </div>
          )}
          <ul className={styles.saved}>
            {saved.stops.map((stop, i) => (
              <li key={stop.id}>
                <SavedRow stop={stop} editing={editing} />
                {editing && (
                  <div className={styles.editRow}>
                    {i > 0 && (
                      <Button
                        variant="text"
                        icon="arrow_upward"
                        label={t("recent.moveUp")}
                        ariaLabel={t("recent.moveUpA11y", { name: stop.name })}
                        onPress={() => saved.move(stop.id, "up")}
                      />
                    )}
                    {i < saved.stops.length - 1 && (
                      <Button
                        variant="text"
                        icon="arrow_downward"
                        label={t("recent.moveDown")}
                        ariaLabel={t("recent.moveDownA11y", { name: stop.name })}
                        onPress={() => saved.move(stop.id, "down")}
                      />
                    )}
                    <Button
                      variant="danger-text"
                      label={t("common.remove")}
                      ariaLabel={t("recent.removeA11y", { name: stop.name })}
                      onPress={() => remove(stop, i)}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
