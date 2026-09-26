import { useLang, useT } from "../i18n/index.ts";
import { headsignLine, upcoming } from "../lib/format.ts";
import { walkMinutes } from "../lib/walk.ts";
import { useNow } from "../state/clock.ts";
import { usePrefs } from "../state/prefs.ts";
import styles from "./cards.module.css";
import { catchableDeps, DepTimes } from "./DepTimes.tsx";
import { Icon } from "./Icon.tsx";
import { RouteBadge } from "./RouteBadge.tsx";
import tcStyles from "./TransitCenterCard.module.css";
import type { TcDeparture, TransitCenterCardProps } from "./types.ts";
import { WalkButton } from "./WalkButton.tsx";

/** One row per route and direction (and bay): its next two departures, soonest row first. */
function groupRows(deps: TcDeparture[], now: number, walkMin: number): TcDeparture[][] {
  const groups = new Map<string, TcDeparture[]>();
  for (const d of upcoming(deps, now).sort((a, b) => Date.parse(a.departureTime) - Date.parse(b.departureTime))) {
    const key = `${d.route.id}|${d.directionLabel}|${d.bay ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), d]);
  }
  // Rows whose buses the rider can still reach come first (the same rule as DepTimes).
  const first = (g: TcDeparture[]) => Date.parse((catchableDeps(g, now, walkMin)[0] ?? g[0]).departureTime);
  return [...groups.values()].sort((a, b) => first(a) - first(b));
}

/**
 * C.5d: a transit center within 1,000 m, with its 2 soonest routes across bays. Each row reads like
 * a stop card's, with where to stand in bold on its own line between them:
 * "SOUTHBOUND to HIRAM CLARKE TC" / "Bay G" / "9 min · 39 min". The walk pill is the card's one distance.
 */
export function TransitCenterCard({ tc, nextDeps, onOpen, onWalk }: TransitCenterCardProps) {
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const { walkPace, textSize } = usePrefs();
  const xl = textSize === "xlarge";
  const walkMin = walkMinutes(tc.walkDistanceM, walkPace);
  const rows = groupRows(nextDeps, now, walkMin).slice(0, 2);
  return (
    <article className={styles.card}>
      <button type="button" className={styles.hit} aria-label={tc.name} onClick={onOpen} />
      <div className={styles.head}>
        <h2 className={`${styles.name} ${tcStyles.title}`}>
          <span className={tcStyles.tile} aria-hidden="true">
            {t("card.tcTile")}
          </span>
          {tc.name}
        </h2>
        <p className={styles.meta}>{t("card.bays", { count: tc.bayCount })}</p>
        <div className={styles.walkSlot}>
          <WalkButton stopId={tc.id} tcName={tc.name} walkDistanceM={tc.walkDistanceM} onPress={onWalk} />
        </div>
      </div>
      <hr className={styles.divider} />
      <ul className={styles.rows}>
        {rows.map((g) => {
          const [d] = g;
          return (
            <li key={`${d.route.id}|${d.directionLabel}|${d.bay ?? ""}`} className={styles.routeRow}>
              <RouteBadge route={d.route} size="sm" />
              <span className={styles.rowText}>
                <span className={styles.headsign}>{headsignLine(d.route, d.directionLabel, d.headsign, lang, { short: xl })}</span>
                {d.bay && <span className={styles.bayLine}>{t("stopLine.bay", { bay: d.bay })}</span>}
                <DepTimes deps={g} walkMin={walkMin} />
              </span>
            </li>
          );
        })}
      </ul>
      <button type="button" className={styles.link} onClick={onOpen}>
        {t("card.departuresByBay")}
        <Icon name="chevron_right" />
      </button>
    </article>
  );
}
