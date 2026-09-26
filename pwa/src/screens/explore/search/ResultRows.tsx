// D5's result rows. Their inline actions replace today's "What do you want to do?" dialog.

import type { ReactNode } from "react";
import { useAlerts, useRoute } from "../../../api/hooks.ts";
import type { SearchResult, StopSummary, TransitCenterSummary } from "../../../api/types.ts";
import { hasKey, useLang, useT } from "../../../i18n/index.ts";
import { directionWord, displayHeadsign, formatDistance, sideLine, stopTitle } from "../../../lib/format.ts";
import { toRouteRef } from "../../../lib/routes.ts";
import { estimateWalk } from "../../../lib/walk.ts";
import { useLocation } from "../../../state/location.tsx";
import { usePrefs } from "../../../state/prefs.ts";
import { AlertStatusLine } from "../../../ui/AlertStatusLine.tsx";
import { Button } from "../../../ui/Button.tsx";
import { Icon, type IconName } from "../../../ui/Icon.tsx";
import { RouteBadge } from "../../../ui/RouteBadge.tsx";
import { nearestDirection } from "../route/routeGeo.ts";
import { useStopWalk } from "../route/useStopWalk.ts";
import type { Attached } from "./groupResults.ts";
import styles from "./Search.module.css";

/** Keeps "·" with the words before it, so a wrapped line never starts with a separator. */
export const SEP = "\u00A0· ";
/** "1.7 mi" that never breaks between the number and its unit. */
const unbroken = (s: string) => s.replaceAll(" ", "\u00A0");

/** The tappable part of a row: icon, bold title and the lines under it. */
function RowBody({ icon, title, lines, extra, onPress }: { icon: IconName | "tc"; title: string; lines: string[]; extra?: ReactNode; onPress: () => void }) {
  const t = useT();
  return (
    <button type="button" className={styles.body} onClick={onPress}>
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
        {extra}
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

/**
 * "Closest stop: Hobby Airport (10567)" over "Eastbound · 3 min walk": two whole lines, so a wrap never
 * leaves a "·" hanging at a line end. The same two lines in the place row and in its sub-row.
 */
interface ClosestStop {
  title: string;
  detail: string;
}

function useClosestStop(place: { lat?: number; lon?: number }, stop: StopSummary | undefined): ClosestStop | undefined {
  const t = useT();
  const lang = useLang();
  const { fix } = useLocation();
  const { walkPace } = usePrefs();
  if (!stop) return undefined;
  const detail: string[] = [];
  if (stop.kind !== "rail" && stop.directionLabel) detail.push(directionWord(stop.directionLabel, lang));
  if (fix && place.lat !== undefined && place.lon !== undefined) {
    detail.push(t("search.closestWalk", { count: estimateWalk({ lat: place.lat, lon: place.lon }, stop, walkPace).minutes }));
  }
  // A plain space before "(688)": the F11 check reads this line as text.
  return { title: t("search.closestStop", { stop: t("stopLine.title", { name: stop.name, id: stop.id }) }), detail: detail.join(SEP) };
}

/** The closest-stop lines inside the place row; screen readers hear one sentence ("… (688) · Northbound"). */
function ClosestLines({ closest }: { closest: ClosestStop }) {
  return (
    <>
      <span className={styles.line}>{closest.title}</span>
      {closest.detail && (
        <>
          <span className="visually-hidden"> · </span>
          <span className={styles.line}>{closest.detail}</span>
        </>
      )}
    </>
  );
}

/**
 * "Airport · 7800 Airport Blvd": the server's kind word ("Airport", or "Place" for OpenStreetMap
 * places) is replaced by a localised one; the address stays as written.
 */
function usePlaceSubtitle(result: SearchResult): string {
  const t = useT();
  const [kind = "", ...rest] = result.subtitle.split(" · ");
  const categoryKey = `search.category.${kind.toLowerCase()}`;
  const word = result.type === "place" ? t("search.place") : hasKey(categoryKey) ? t(categoryKey) : kind;
  return [word, rest.join(" · ")].filter(Boolean).join(SEP);
}

interface PlaceRowProps {
  result: SearchResult;
  /** Directions and Stops near as pills; other rows keep only the tap on the body (Stops near). */
  actions: boolean;
  /** The landmark's own transit center and stops, listed under it instead of as separate results. */
  attached?: Attached;
  onNear: () => void;
  onDirections: () => void;
  onOpenTc?: (tc: TransitCenterSummary) => void;
  onOpenStop?: (stop: SearchResult) => void;
}

export function PlaceRow({ result, actions, attached, onNear, onDirections, onOpenTc, onOpenStop }: PlaceRowProps) {
  const t = useT();
  const lang = useLang();
  const subtitle = usePlaceSubtitle(result);
  const closestStop = result.nearbyStops?.[0];
  const closest = useClosestStop(result, closestStop);
  // The closest stop, when it is also a result, becomes its own tappable line under the place.
  const closestAttached = closestStop && attached?.stops.find((s) => s.id === closestStop.id);
  const otherStops = attached?.stops.filter((s) => s !== closestAttached) ?? [];
  return (
    <div className={styles.row}>
      <RowBody
        icon="place"
        title={result.title}
        lines={[subtitle]}
        extra={closest && !closestAttached ? <ClosestLines closest={closest} /> : undefined}
        onPress={onNear}
      />
      {actions && (
        <div className={styles.pills}>
          <Button variant="tonal" icon="route_plan" label={t("search.directions")} onPress={onDirections} />
          <Button variant="tonal" icon="bus_stop" label={t("search.stopsNear")} onPress={onNear} />
        </div>
      )}
      {attached && (
        <ul className={styles.subRows}>
          {attached.tcs.map((tc) => (
            <li key={tc.id}>
              <SubRow icon="tc" title={t("search.tcAt", { name: tc.name })} line={t("tc.bays", { count: tc.bayCount })} onPress={() => onOpenTc?.(tc)} />
            </li>
          ))}
          {closestAttached && closest && (
            <li>
              <SubRow icon="bus_stop" title={closest.title} line={closest.detail || undefined} onPress={() => onOpenStop?.(closestAttached)} />
            </li>
          )}
          {otherStops.map((s) => (
            <li key={s.id}>
              <SubRow icon="bus_stop" title={stopTitle(s.title, s.id, lang)} onPress={() => onOpenStop?.(s)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A result that belongs to the place above it: "TC Hobby Airport transit center · 2 bays ›". */
function SubRow({ icon, title, line, onPress }: { icon: IconName | "tc"; title: string; line?: string; onPress: () => void }) {
  const t = useT();
  return (
    <button type="button" className={styles.subRow} onClick={onPress}>
      {icon === "tc" ? (
        <span className={styles.tcTileSm} aria-hidden="true">
          {t("card.tcTile")}
        </span>
      ) : (
        <span className={styles.icon}>
          <Icon name={icon} />
        </span>
      )}
      <span className={styles.text}>
        <span className={styles.subTitle}>{title}</span>
        {line && <span className={styles.line}>{line}</span>}
      </span>
      <span className={styles.chevron} aria-hidden="true">
        <Icon name="chevron_right" />
      </span>
    </button>
  );
}

export function TransitCenterRow({ tc, onOpen }: { tc: TransitCenterSummary; onOpen: () => void }) {
  const t = useT();
  return (
    <div className={styles.row}>
      <RowBody icon="tc" title={tc.name} lines={[t("search.tcLine", { count: tc.bayCount })]} onPress={onOpen} />
      <span className={styles.chevron} aria-hidden="true">
        <Icon name="chevron_right" />
      </span>
    </div>
  );
}

/** Past this the Walk pill is left out: the row already says how far away the stop is. */
const MAX_WALK_MIN = 20;

interface StopRowProps {
  result: SearchResult;
  /** The rider typed this stop's number: "Stop #82 · Monroe Park & Ride", so it isn't read as Route 82's stop. */
  idMatch?: boolean;
  /** False in pick mode, where the row only picks the stop. */
  walkable: boolean;
  onOpen: () => void;
  onWalk: (distanceM: number) => void;
}

export function StopRow(props: StopRowProps) {
  const { result } = props;
  // A stop result without its stop record can only be opened by id.
  if (!result.stop) return <SimpleRow icon="bus_stop" title={result.title} onPress={props.onOpen} />;
  return <StopRowBody {...props} stop={result.stop} />;
}

function StopRowBody({ result, stop, idMatch, walkable, onOpen, onWalk }: StopRowProps & { stop: StopSummary }) {
  const t = useT();
  const lang = useLang();
  const walk = useStopWalk(stop);
  const names = stop.routes.map((r) => r.name);
  const line = [
    sideLine(stop, { withCompass: true, lang }),
    names.length ? t("search.routeList", { count: names.length, list: names.join(", ") }) : "",
    result.distanceM !== undefined ? t("search.away", { distance: unbroken(formatDistance(result.distanceM, lang)) }) : "",
  ]
    .filter(Boolean)
    .join(SEP);
  return (
    <div className={`${styles.row} ${styles.stopRow}`}>
      <RowBody
        icon="bus_stop"
        title={idMatch ? t("search.stopNumber", { name: stop.name, id: stop.id }) : t("stopLine.title", { name: stop.name, id: stop.id })}
        lines={[line]}
        onPress={onOpen}
      />
      {walkable && walk && walk.minutes <= MAX_WALK_MIN && (
        <span className={styles.walk}>
          <Button
            variant="tonal"
            icon="directions_walk"
            label={t("search.walkMin", { count: walk.minutes })}
            ariaLabel={t("search.walkA11y", { id: stop.id })}
            onPress={() => onWalk(walk.distanceM)}
          />
        </span>
      )}
    </div>
  );
}

export function RouteRow({ result, onOpen }: { result: SearchResult; onOpen: (dir: 0 | 1) => void }) {
  const t = useT();
  const lang = useLang();
  const alerts = useAlerts();
  const { fix } = useLocation();
  const detail = useRoute(result.id);
  const ref = toRouteRef(result.route ?? { id: result.id, name: result.title, color: "#004080", textColor: "#FFFFFF" });
  const directions = detail.data?.directions ?? [];
  return (
    <div className={styles.row}>
      <button type="button" className={styles.body} onClick={() => onOpen(detail.data ? nearestDirection(detail.data, fix) : 0)}>
        {/* The title already names the route; the badge would repeat it ("Route 82 82 Westheimer"). */}
        <span className={styles.badge} aria-hidden="true">
          <RouteBadge route={ref} size="sm" />
        </span>
        <span className={`${styles.text} ${styles.routeTitle}`}>
          <span className={styles.title}>{result.title}</span>
        </span>
        <span className={styles.chevron} aria-hidden="true">
          <Icon name="chevron_right" />
        </span>
      </button>
      {directions.length > 0 && (
        // "Eastbound to DOWNTOWN": the destination tells the rider which one is theirs.
        <div className={`${styles.pills} ${styles.directionPills}`}>
          {directions.map((d) => {
            const to = t("route.to", { headsign: displayHeadsign(d.headsigns[0] ?? "") });
            const label = ref.mode === "rail" ? to : `${directionWord(d.label, lang)} ${to}`;
            return (
              <Button
                key={d.directionId}
                variant="tonal"
                label={label}
                ariaLabel={t("search.openRouteA11y", { route: result.title, direction: `${directionWord(d.label, lang)} ${t("route.to", { headsign: d.headsigns[0] ?? "" })}` })}
                onPress={() => onOpen(d.directionId)}
              />
            );
          })}
        </div>
      )}
      <div className={styles.alertLine}>
        <AlertStatusLine scope="route" name={t(ref.mode === "rail" ? "routeName.railA11y" : "routeName.a11y", { name: ref.name })} alerts={alerts.forRoute(result.id)} />
      </div>
    </div>
  );
}
