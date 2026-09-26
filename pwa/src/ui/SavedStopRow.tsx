import { useLang, useT } from "../i18n/index.ts";
import { departureView, directionWord, formatDistance, headsignLine, stopTitle, upcoming } from "../lib/format.ts";
import { walkMinutes } from "../lib/walk.ts";
import { useNow } from "../state/clock.ts";
import { useOffline } from "../state/offline.ts";
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

/**
 * C.5b: a saved stop's next buses, in the nearby card's layout with a star. It never waits on location.
 * The grey line reads like a nearby card's: "Eastbound · South side of Westheimer Rd".
 * `compact` (the stop is over a mile away): one short row, "★ Westheimer Rd @ Montrose Blvd (2958)"
 * over "[82] Eastbound · 1 min · 9 min · 2.4 mi", so a stop the rider can't walk to doesn't push
 * the stops around them below the fold, and no "Leaves before you get there" for a walk nobody takes.
 */
export function SavedStopRow({ stopId, name, preferredRouteId, routes, onOpen, moreSaved, side, walkDistanceM, onWalk, compact }: SavedStopRowProps & { compact?: boolean }) {
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const { walkPace, textSize } = usePrefs();
  const xl = textSize === "xlarge";
  const offline = useOffline();
  // As on every card: a bus that leaves before the rider can walk there isn't the answer.
  const walkMin = walkDistanceM !== undefined ? walkMinutes(walkDistanceM, walkPace) : undefined;
  const shown = pickRoute(routes, preferredRouteId, now);
  const extra = routes.length - 1;
  const title = stopTitle(name, stopId, lang, { xl });
  const dir = shown?.directionLabel && shown.route.mode !== "rail" ? directionWord(shown.directionLabel, lang) : "";
  if (compact) {
    const next = shown ? upcoming(shown.deps, now).filter((d) => !d.canceled).slice(0, 2) : [];
    const times = next.map((d) => departureView(d, now, { offline, lang }).text);
    const far = walkDistanceM !== undefined ? formatDistance(walkDistanceM, lang) : "";
    const line = [dir, times.join(" · ") || t("strip.noBuses3h"), far].filter(Boolean);
    return (
      <article className={`${styles.card} ${rowStyles.compact}`}>
        <button type="button" className={styles.hit} aria-label={[title, shown && t("routeName.a11y", { name: shown.route.name }), ...line].filter(Boolean).join(", ")} onClick={onOpen} />
        <div className={rowStyles.compactMain}>
          <h2 className={`${styles.name} ${rowStyles.name} ${rowStyles.compactName}`}>
            <Icon name="star_filled" size={20} color="var(--c-accent-icon)" />
            {title}
          </h2>
          <p className={rowStyles.compactLine}>
            {shown && <RouteBadge route={shown.route} size="xs" />}
            <span>{line.join(" · ")}</span>
          </p>
        </div>
        <Icon name="chevron_right" color="var(--c-link-text)" />
      </article>
    );
  }
  // Extra large: only the side of the street ("South side of Westheimer Rd"), since the headsign
  // already says "EASTBOUND", and it goes last in the card: under the name it pushed the times and
  // "The 1 min bus leaves before you get there" under the tab bar (03-xlarge-360).
  const fullSide = side ? [xl ? "" : dir, side].filter(Boolean).join(" · ") : undefined;
  const sideLine = fullSide && <p className={`${styles.meta} ${xl ? rowStyles.sideLast : ""}`}>{fullSide}</p>;
  return (
    <article className={`${styles.card} ${rowStyles.row}`}>
      <button type="button" className={styles.hit} aria-label={title} onClick={onOpen} />
      <div className={styles.head}>
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
        {!xl && sideLine}
        {walkDistanceM !== undefined && onWalk && (
          <div className={styles.walkSlot}>
            <WalkButton stopId={stopId} walkDistanceM={walkDistanceM} onPress={onWalk} />
          </div>
        )}
      </div>
      <hr className={styles.divider} />
      {shown && (
        <div className={rowStyles.route}>
          <RouteBadge route={shown.route} size="sm" />
          <div className={styles.rowText}>
            <span className={styles.headsign}>
              {headsignLine(shown.route, shown.directionLabel, shown.headsign, lang, { short: xl })}
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
      {xl && sideLine}
    </article>
  );
}
