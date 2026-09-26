import { useLang, useT } from "../i18n/index.ts";
import { headsignLine, upcoming } from "../lib/format.ts";
import { useNow } from "../state/clock.ts";
import styles from "./cards.module.css";
import { DepTimes } from "./DepTimes.tsx";
import { Icon } from "./Icon.tsx";
import { RouteBadge } from "./RouteBadge.tsx";
import tcStyles from "./TransitCenterCard.module.css";
import type { TransitCenterCardProps } from "./types.ts";
import { WalkButton } from "./WalkButton.tsx";

/** C.5d: a transit center within 1,000 m, with its 2 soonest departures across bays. */
export function TransitCenterCard({ tc, nextDeps, onOpen, onWalk }: TransitCenterCardProps) {
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const soonest = upcoming(nextDeps, now)
    .sort((a, b) => Date.parse(a.departureTime) - Date.parse(b.departureTime))
    .slice(0, 2);
  return (
    <article className={styles.card}>
      <button type="button" className={styles.hit} aria-label={tc.name} onClick={onOpen} />
      <h2 className={`${styles.name} ${tcStyles.title}`}>
        <span className={tcStyles.tile} aria-hidden="true">
          {t("card.tcTile")}
        </span>
        {tc.name}
      </h2>
      <div className={styles.metaRow}>
        <p className={styles.meta}>{t("card.bays", { count: tc.bayCount })}</p>
        <WalkButton stopId={tc.id} tcName={tc.name} walkDistanceM={tc.walkDistanceM} onPress={onWalk} />
      </div>
      <hr className={styles.divider} />
      <ul className={styles.rows}>
        {soonest.map((d) => (
          <li key={`${d.tripId}-${d.departureTime}`} className={tcStyles.dep}>
            <RouteBadge route={d.route} size="sm" />
            <span className={styles.rowText}>
              <span className={styles.headsign}>{headsignLine(d.route, d.directionLabel, d.headsign, lang)}</span>
              {/* "Bay G · 9 min": the bay is plain bold text by the time, not a second chip beside the route's. */}
              <span className={tcStyles.bayLine}>
                {d.bay && (
                  <>
                    <strong className={tcStyles.bay}>{t("stopLine.bay", { bay: d.bay })}</strong>
                    <span className={styles.sep} aria-hidden="true">
                      ·
                    </span>
                  </>
                )}
                <DepTimes deps={[d]} max={1} />
              </span>
            </span>
          </li>
        ))}
      </ul>
      <button type="button" className={styles.link} onClick={onOpen}>
        {t("card.departuresByBay")}
        <Icon name="chevron_right" />
      </button>
    </article>
  );
}
