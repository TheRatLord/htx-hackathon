import { useLang, useT } from "../i18n/index.ts";
import { headsignLine, upcoming } from "../lib/format.ts";
import { useNow } from "../state/clock.ts";
import styles from "./cards.module.css";
import { DepTimes } from "./DepTimes.tsx";
import { Icon } from "./Icon.tsx";
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

/** C.5b: a saved stop's next buses. It never waits on location. */
export function SavedStopRow({ stopId, name, preferredRouteId, routes, onOpen, moreSaved }: SavedStopRowProps) {
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const shown = pickRoute(routes, preferredRouteId, now);
  const extra = routes.length - 1;
  const title = t("stopLine.title", { name, id: stopId });
  return (
    <article className={`${styles.card} ${rowStyles.row}`}>
      <button type="button" className={styles.hit} aria-label={title} onClick={onOpen} />
      <div className={styles.top}>
        <h2 className={`${styles.name} ${rowStyles.name}`}>
          <Icon name="star_filled" size={20} color="var(--c-accent-icon)" />
          {title}
        </h2>
        {moreSaved ? (
          <button type="button" className={rowStyles.more} onClick={moreSaved.onPress}>
            {t("card.moreSaved", { count: moreSaved.count })} ›
          </button>
        ) : (
          <Icon name="chevron_right" />
        )}
      </div>
      {shown && (
        <div className={rowStyles.route}>
          <RouteBadge route={shown.route} size="sm" />
          <div className={styles.rowText}>
            <span className={styles.headsign}>
              {headsignLine(shown.route, shown.directionLabel, shown.headsign, lang)}
              {extra > 0 && <span className={rowStyles.extra}> {t("card.plusRoutes", { count: extra })}</span>}
            </span>
            {upcoming(shown.deps, now).length ? (
              <DepTimes deps={shown.deps} />
            ) : (
              <span className={styles.noService}>{t("strip.noBuses3h")}</span>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
