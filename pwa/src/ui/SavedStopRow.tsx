import { useLang, useT } from "../i18n/index.ts";
import { headsignLine, stopTitle, upcoming } from "../lib/format.ts";
import { walkMinutes } from "../lib/walk.ts";
import { useNow } from "../state/clock.ts";
import { usePrefs } from "../state/prefs.ts";
import styles from "./cards.module.css";
import { DepTimes } from "./DepTimes.tsx";
import { Icon } from "./Icon.tsx";
import { WalkButton } from "./WalkButton.tsx";
import { RouteBadge } from "./RouteBadge.tsx";
import rowStyles from "./SavedStopRow.module.css";
import type { SavedStopRoute, SavedStopRowProps } from "./types.ts";

/** The preferred route first, otherwise the one with the soonest upcoming departure. */
function pickRoute(routes: SavedStopRoute[], preferredRouteId: string | undefined, now: number): SavedStopRoute | undefined {
  const preferred = routes.find((r) => r.route.id === preferredRouteId);
  if (preferred) return preferred;
  const first = (r: SavedStopRoute) => Date.parse(upcoming(r.deps, now)[0]?.departureTime ?? "9999-12-31");
  return [...routes].sort((a, b) => first(a) - first(b))[0];
}

/** C.5b: a saved stop's next buses, in the nearby card's layout with a star. It never waits on location. */
export function SavedStopRow({ stopId, name, preferredRouteId, routes, onOpen, moreSaved, side, walkDistanceM, onWalk }: SavedStopRowProps) {
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const { walkPace } = usePrefs();
  // As on every card: a bus that leaves before the rider can walk there isn't the answer.
  const walkMin = walkDistanceM !== undefined ? walkMinutes(walkDistanceM, walkPace) : undefined;
  const shown = pickRoute(routes, preferredRouteId, now);
  const extra = routes.length - 1;
  const title = stopTitle(name, stopId, lang);
  return (
    <article className={`${styles.card} ${rowStyles.row}`}>
      <button type="button" className={styles.hit} aria-label={title} onClick={onOpen} />
      <div className={styles.top}>
        <h2 className={`${styles.name} ${rowStyles.name}`}>
          <Icon name="star_filled" size={20} color="var(--c-accent-icon)" />
          {title}
        </h2>
        {moreSaved && (
          <button type="button" className={rowStyles.more} onClick={moreSaved.onPress}>
            {t("card.moreSaved", { count: moreSaved.count })} ›
          </button>
        )}
      </div>
      {(side || (walkDistanceM !== undefined && onWalk)) && (
        <div className={styles.metaRow}>
          <p className={styles.meta}>{side}</p>
          {walkDistanceM !== undefined && onWalk && <WalkButton stopId={stopId} walkDistanceM={walkDistanceM} onPress={onWalk} />}
        </div>
      )}
      <hr className={styles.divider} />
      {shown && (
        <div className={rowStyles.route}>
          <RouteBadge route={shown.route} size="sm" />
          <div className={styles.rowText}>
            <span className={styles.headsign}>
              {headsignLine(shown.route, shown.directionLabel, shown.headsign, lang)}
              {extra > 0 && <span className={rowStyles.extra}> {t("card.plusRoutes", { count: extra })}</span>}
            </span>
            {upcoming(shown.deps, now).length ? (
              <DepTimes deps={shown.deps} walkMin={walkMin} />
            ) : (
              <span className={styles.noService}>{t("strip.noBuses3h")}</span>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
