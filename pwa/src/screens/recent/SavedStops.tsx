// D16's SAVED STOPS section: live saved rows, with Move up / Move down / Remove in edit mode.
// Recent renders it only when a stop is saved; with none, Recent ends with a one-line tip instead.

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";
import { useNavigate } from "react-router";
import { savedRowKey, useSavedStopRoutes } from "../../api/savedStop.ts";
import { useLang, useT } from "../../i18n/index.ts";
import { sideLine } from "../../lib/format.ts";
import { useRecents } from "../../state/recents.ts";
import { useSaved, type SavedStop } from "../../state/saved.ts";
import { Button } from "../../ui/Button.tsx";
import { SavedStopRow } from "../../ui/SavedStopRow.tsx";
import { ScheduleCaption } from "../../ui/ScheduleCaption.tsx";
import { SectionHeader } from "../../ui/SectionHeader.tsx";
import { useToast } from "../../ui/Toast.tsx";
import { UpdatedAgo } from "../../ui/UpdatedAgo.tsx";
import styles from "./Recent.module.css";

function SavedRow({ stop, editing }: { stop: SavedStop; editing: boolean }) {
  const t = useT();
  const lang = useLang();
  // The side of the street, when the stop was opened before (recents keep it), as on every stop card.
  const seen = useRecents().stops.find((r) => r.id === stop.id);
  const side = seen ? sideLine(seen, { withCompass: false, lang }) || undefined : undefined;
  const navigate = useNavigate();
  const { routes, preferredRouteId, arrivals } = useSavedStopRoutes(stop);
  const route = stop.preferredRouteId ? `?route=${encodeURIComponent(stop.preferredRouteId)}` : "";
  return (
    <>
      {/* Inert while editing, so a tap that misses Move or Remove never opens the stop. */}
      <div inert={editing}>
        <SavedStopRow
          stopId={stop.id}
          name={stop.name}
          preferredRouteId={preferredRouteId}
          routes={routes ?? []}
          side={side}
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
        label={t("recent.savedStops")}
        tone="variant"
        action={{ label: editing ? t("common.done") : t("common.edit"), onPress: () => onEdit(!editing) }}
      />
      {saved.stops.length > 0 && (
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
