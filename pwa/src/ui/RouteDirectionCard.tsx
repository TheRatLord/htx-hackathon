import { useLang, useT } from "../i18n/index.ts";
import { headsignLine, platformLabel, sideLine, upcoming } from "../lib/format.ts";
import { walkMinutes } from "../lib/walk.ts";
import { useNow } from "../state/clock.ts";
import { usePrefs } from "../state/prefs.ts";
import { BayTag } from "./BayTag.tsx";
import styles from "./cards.module.css";
import { DepTimes } from "./DepTimes.tsx";
import { RouteBadge } from "./RouteBadge.tsx";
import type { RouteDirectionCardProps } from "./types.ts";
import { WalkButton } from "./WalkButton.tsx";

/** C.5c: one direction of a route near you (D3); with `bay`/`tcName`, the transit-center variant. */
export function RouteDirectionCard({ route, directionLabel, headsign, stop, walkDistanceM, deps, bay, tcName, noServiceText, onOpen, onWalk }: RouteDirectionCardProps) {
  const t = useT();
  const now = useNow();
  const lang = useLang();
  const { walkPace } = usePrefs();
  const walkMin = walkDistanceM !== undefined ? walkMinutes(walkDistanceM, walkPace) : undefined;
  const headline = headsignLine(route, directionLabel, headsign, lang);
  const place = tcName ?? t("stopLine.title", { name: stop.name, id: stop.id });
  return (
    <article className={styles.card}>
      <button type="button" className={styles.hit} aria-label={`${t("routeName.a11y", { name: route.name })} ${headline}, ${place}`} onClick={onOpen} />
      <div className={styles.route}>
        <RouteBadge route={route} size="sm" />
        <span className={styles.headsign}>{headline}</span>
      </div>
      <div className={styles.top}>
        <h2 className={styles.name}>
          {place}
          {tcName && bay && (
            <>
              <span className={styles.sep} aria-hidden="true">
                ·
              </span>
              <BayTag bay={bay} />
            </>
          )}
        </h2>
        {walkDistanceM !== undefined && <WalkButton stopId={stop.id} walkDistanceM={walkDistanceM} onPress={onWalk} />}
      </div>
      <p className={styles.meta}>
        {tcName ? t("card.platformLine", { platform: platformLabel(stop, lang), id: stop.id }) : sideLine(stop, { withCompass: false, lang })}
      </p>
      {noServiceText && !upcoming(deps, now).length ? <p className={styles.noService}>{noServiceText}</p> : <DepTimes deps={deps} walkMin={walkMin} />}
    </article>
  );
}
