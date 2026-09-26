import { useLang, useT } from "../i18n/index.ts";
import { headsignLine, sideLine } from "../lib/format.ts";
import { BayTag } from "./BayTag.tsx";
import styles from "./cards.module.css";
import { DepTimes } from "./DepTimes.tsx";
import { RouteBadge } from "./RouteBadge.tsx";
import type { RouteDirectionCardProps } from "./types.ts";
import { WalkButton } from "./WalkButton.tsx";
import { walkMinutes } from "../lib/walk.ts";
import { usePrefs } from "../state/prefs.ts";

/** "Northwest Transit Center - Platform 2" → "Platform 2", else "Stop #79". */
const platformName = (stop: { id: string; name: string }, t: (k: string, v?: Record<string, string>) => string) =>
  stop.name.split(" - ")[1] ?? t("card.stopNumber", { id: stop.id });

/** C.5c: one direction of a route near you (D3); with `bay`/`tcName`, the transit-center variant. */
export function RouteDirectionCard({ route, directionLabel, headsign, stop, walkDistanceM, deps, bay, tcName, onOpen, onWalk }: RouteDirectionCardProps) {
  const t = useT();
  const lang = useLang();
  const { walkPace } = usePrefs();
  const walkMin = walkDistanceM !== undefined ? walkMinutes(walkDistanceM, walkPace) : undefined;
  const headline = headsignLine(route, directionLabel, headsign, lang);
  const place = tcName ?? t("stopLine.title", { name: stop.name, id: stop.id });
  const platform = platformName(stop, t);
  return (
    <article className={styles.card}>
      <button type="button" className={styles.hit} aria-label={`${t("routeName.a11y", { name: route.name })} ${headline}, ${place}`} onClick={onOpen} />
      <div className={styles.route}>
        <RouteBadge route={route} size="sm" />
        <span className={styles.headsign}>{headline}</span>
      </div>
      <div className={styles.top}>
        <h2 className={styles.name}>
          {tcName ? (
            <span className={styles.inline}>
              {tcName}
              {bay && <BayTag bay={bay} />}
            </span>
          ) : (
            place
          )}
        </h2>
        {walkDistanceM !== undefined && <WalkButton stopId={stop.id} walkDistanceM={walkDistanceM} onPress={onWalk} />}
      </div>
      <p className={styles.meta}>
        {tcName ? t("card.platformLine", { platform, id: stop.id }) : sideLine(stop, { withCompass: false, lang })}
      </p>
      <DepTimes deps={deps} walkMin={walkMin} />
    </article>
  );
}
