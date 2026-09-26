import { useLang, useT } from "../i18n/index.ts";
import { formatDistance, headsignLine, upcoming } from "../lib/format.ts";
import { useNow } from "../state/clock.ts";
import { BayTag } from "./BayTag.tsx";
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
      <div className={styles.top}>
        <h2 className={`${styles.name} ${tcStyles.title}`}>
          <span className={tcStyles.tile} aria-hidden="true">
            {t("card.tcTile")}
          </span>
          {tc.name}
        </h2>
        <WalkButton stopId={tc.id} walkDistanceM={tc.walkDistanceM} onPress={onWalk} />
      </div>
      <p className={styles.meta}>{t("card.transitCenterLine", { bays: tc.bayCount, distance: formatDistance(tc.walkDistanceM, lang) })}</p>
      <ul className={styles.rows}>
        {soonest.map((d) => (
          <li key={`${d.tripId}-${d.departureTime}`} className={tcStyles.dep}>
            {d.bay && <BayTag bay={d.bay} />}
            <RouteBadge route={d.route} size="sm" />
            <span className={styles.rowText}>
              <span className={styles.headsign}>{headsignLine(d.route, d.directionLabel, d.headsign, lang)}</span>
              <DepTimes deps={[d]} max={1} />
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
