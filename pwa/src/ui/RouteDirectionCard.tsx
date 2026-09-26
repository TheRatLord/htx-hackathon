import { useLang, useT } from "../i18n/index.ts";
import { headsignLine, platformLabel, sideLine, upcoming } from "../lib/format.ts";
import { walkMinutes } from "../lib/walk.ts";
import { useNow } from "../state/clock.ts";
import { usePrefs } from "../state/prefs.ts";
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
  const { walkPace, textSize } = usePrefs();
  const xl = textSize === "xlarge";
  const walkMin = walkDistanceM !== undefined ? walkMinutes(walkDistanceM, walkPace) : undefined;
  const headline = headsignLine(route, directionLabel, headsign, lang);
  const shortHeadline = headsignLine(route, directionLabel, headsign, lang, { short: xl });
  const place = tcName ?? t("stopLine.title", { name: stop.name, id: stop.id });
  // Same grammar as the nearby card (C.5a): the place and its walk pill first, the route row under it.
  // At a transit center the bay is where to stand: bold, on its own line under the headsign
  // ("Bay M · Platform 2"), not a grey line under the name the rider reads past.
  const meta = tcName ? "" : sideLine(stop, { withCompass: false, lang });
  const bayLine = tcName ? [bay && t("stopLine.bay", { bay }), platformLabel(stop, lang)].filter(Boolean).join(" · ") : "";
  return (
    <article className={styles.card}>
      <button type="button" className={styles.hit} aria-label={`${t("routeName.a11y", { name: route.name })} ${headline}, ${place}${meta ? `, ${meta}` : ""}${bayLine ? `, ${bayLine}` : ""}`} onClick={onOpen} />
      <div className={styles.head}>
        <h2 className={styles.name}>{place}</h2>
        {meta && <p className={styles.meta}>{meta}</p>}
        {walkDistanceM !== undefined && (
          <div className={styles.walkSlot}>
            <WalkButton stopId={stop.id} tcName={tcName} walkDistanceM={walkDistanceM} onPress={onWalk} />
          </div>
        )}
      </div>
      <hr className={styles.divider} />
      <div className={styles.routeRow}>
        <RouteBadge route={route} size="sm" />
        <span className={styles.rowText}>
          <span className={styles.headsign}>{shortHeadline}</span>
          {bayLine && <span className={styles.bayLine}>{bayLine}</span>}
          {noServiceText && !upcoming(deps, now).length ? <span className={styles.noService}>{noServiceText}</span> : <DepTimes deps={deps} walkMin={walkMin} />}
        </span>
      </div>
    </article>
  );
}
