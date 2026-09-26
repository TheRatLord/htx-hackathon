// D5's result rows. Their inline actions replace today's "What do you want to do?" dialog.

import { useAlerts, useRoute } from "../../../api/hooks.ts";
import type { SearchResult, StopSummary, TransitCenterSummary } from "../../../api/types.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { formatDistance, sideLine } from "../../../lib/format.ts";
import { toRouteRef } from "../../../lib/routes.ts";
import { estimateWalk } from "../../../lib/walk.ts";
import { useLocation } from "../../../state/location.tsx";
import { usePrefs } from "../../../state/prefs.ts";
import { AlertStatusLine } from "../../../ui/AlertStatusLine.tsx";
import { Button } from "../../../ui/Button.tsx";
import { Icon, type IconName } from "../../../ui/Icon.tsx";
import { RouteBadge } from "../../../ui/RouteBadge.tsx";
import { nearestDirection } from "../route/routeGeo.ts";
import { useDirectionWord } from "../route/useDirectionWord.ts";
import { useStopWalk } from "../route/useStopWalk.ts";
import styles from "./Search.module.css";

/** The tappable part of a row: icon, bold title and the lines under it. */
function RowBody({ icon, title, lines, onPress, ariaLabel }: { icon: IconName | "tc"; title: string; lines: string[]; onPress: () => void; ariaLabel?: string }) {
  const t = useT();
  return (
    <button type="button" className={styles.body} onClick={onPress} aria-label={ariaLabel}>
      {icon === "tc" ? (
        <span className={styles.tcTile} aria-hidden="true">
          {t("card.tcTile")}
        </span>
      ) : (
        <span className={styles.icon}>
          <Icon name={icon} />
        </span>
      )}
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        {lines.map((line) => (
          <span key={line} className={styles.line}>
            {line}
          </span>
        ))}
      </span>
    </button>
  );
}

/** A pickable row (pick mode, the route + stop shortcut, recents). */
export function SimpleRow(props: { icon: IconName | "tc"; title: string; lines?: string[]; onPress: () => void }) {
  return (
    <div className={styles.row}>
      <RowBody {...props} lines={props.lines ?? []} />
    </div>
  );
}

/** "Hobby Airport (10567) · Eastbound · 3 min walk from there". */
function useClosestStopLine(place: { lat?: number; lon?: number }, stop: StopSummary | undefined): string | undefined {
  const t = useT();
  const dirLabel = useDirectionWord();
  const { fix } = useLocation();
  const { walkPace } = usePrefs();
  if (!stop) return undefined;
  const parts = [t("stopLine.title", { name: stop.name, id: stop.id })];
  if (stop.kind !== "rail" && stop.directionLabel) parts.push(dirLabel(stop.directionLabel));
  if (fix && place.lat !== undefined && place.lon !== undefined) {
    parts.push(t("search.closestWalk", { count: estimateWalk({ lat: place.lat, lon: place.lon }, stop, walkPace).minutes }));
  }
  return t("search.closestStop", { stop: parts.join(" · ") });
}

/** Landmarks keep the server's "Airport · 7800 Airport Blvd"; OSM places get a localised kind word. */
function placeSubtitle(result: SearchResult, placeWord: string): string {
  return result.type === "place" ? [placeWord, result.subtitle.split(" · ").slice(1).join(" · ")].filter(Boolean).join(" · ") : result.subtitle;
}

export function PlaceRow({ result, onNear, onDirections }: { result: SearchResult; onNear: () => void; onDirections: () => void }) {
  const t = useT();
  const closest = useClosestStopLine(result, result.nearbyStops?.[0]);
  return (
    <div className={styles.row}>
      <RowBody icon="place" title={result.title} lines={[placeSubtitle(result, t("search.place")), ...(closest ? [closest] : [])]} onPress={onNear} />
      <div className={styles.pills}>
        <Button variant="tonal" icon="route_plan" label={t("search.directions")} onPress={onDirections} />
        <Button variant="tonal" icon="bus_stop" label={t("search.stopsNear")} onPress={onNear} />
      </div>
    </div>
  );
}

export function TransitCenterRow({ tc, onOpen }: { tc: TransitCenterSummary; onOpen: () => void }) {
  const t = useT();
  return (
    <div className={styles.row}>
      <RowBody icon="tc" title={tc.name} lines={[t("search.tcLine", { bays: tc.bayCount })]} onPress={onOpen} />
    </div>
  );
}

interface StopRowProps {
  result: SearchResult;
  /** False in pick mode, where the row only picks the stop. */
  walkable: boolean;
  onOpen: () => void;
  onWalk: (distanceM: number) => void;
}

export function StopRow({ result, walkable, onOpen, onWalk }: StopRowProps) {
  const t = useT();
  const lang = useLang();
  const stop = result.stop!;
  const walk = useStopWalk(stop);
  const names = stop.routes.map((r) => r.name);
  const line = [
    sideLine(stop, { withCompass: true, lang }),
    names.length ? t("search.routeList", { count: names.length, list: names.join(", ") }) : "",
    result.distanceM !== undefined ? t("search.away", { distance: formatDistance(result.distanceM, lang) }) : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className={`${styles.row} ${styles.stopRow}`}>
      <RowBody icon="bus_stop" title={t("stopLine.title", { name: stop.name, id: stop.id })} lines={[line]} onPress={onOpen} />
      {walkable && walk && (
        <span className={styles.walk}>
          <Button variant="tonal" icon="directions_walk" label={t("search.walk")} ariaLabel={t("search.walkA11y", { id: stop.id })} onPress={() => onWalk(walk.distanceM)} />
        </span>
      )}
    </div>
  );
}

export function RouteRow({ result, onOpen }: { result: SearchResult; onOpen: (dir: 0 | 1) => void }) {
  const t = useT();
  const dirLabel = useDirectionWord();
  const alerts = useAlerts();
  const { fix } = useLocation();
  const detail = useRoute(result.id);
  const ref = toRouteRef(result.route ?? { id: result.id, name: result.title, color: "#004080", textColor: "#FFFFFF" });
  const directions = detail.data?.directions ?? [];
  return (
    <div className={styles.row}>
      <button type="button" className={styles.body} onClick={() => onOpen(detail.data ? nearestDirection(detail.data, fix) : 0)}>
        <RouteBadge route={ref} size="sm" />
        <span className={`${styles.text} ${styles.routeTitle}`}>
          <span className={styles.title}>{result.title}</span>
        </span>
      </button>
      {directions.length > 0 && (
        <div className={styles.pills}>
          {directions.map((d) => (
            <Button
              key={d.directionId}
              variant="tonal"
              label={dirLabel(d.label)}
              ariaLabel={t("search.openRouteA11y", { route: result.title, direction: `${dirLabel(d.label)} ${t("route.to", { headsign: d.headsigns[0] ?? "" })}` })}
              onPress={() => onOpen(d.directionId)}
            />
          ))}
        </div>
      )}
      <div className={styles.alertLine}>
        <AlertStatusLine scope="route" name={t(ref.mode === "rail" ? "routeName.railA11y" : "routeName.a11y", { name: ref.name })} alerts={alerts.forRoute(result.id)} />
      </div>
    </div>
  );
}
