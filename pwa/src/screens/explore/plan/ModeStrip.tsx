import { Fragment } from "react";
import type { Itinerary } from "../../../api/types.ts";
import { isEmptyWalk } from "../../../features/trip/steps.ts";
import { useT } from "../../../i18n/index.ts";
import { toRouteRef } from "../../../lib/routes.ts";
import { walkMinutes } from "../../../lib/walk.ts";
import { usePrefs } from "../../../state/prefs.ts";
import { Icon } from "../../../ui/Icon.tsx";
import { RouteBadge } from "../../../ui/RouteBadge.tsx";
import styles from "./plan.module.css";

/** Today's mode strip: 🚶6 › [80] › 🚶2 › [73], with each ride's minutes under its badge. */
export function ModeStrip({ it }: { it: Itinerary }) {
  const t = useT();
  const { walkPace } = usePrefs();
  const parts = it.legs
    .filter((l) => !isEmptyWalk(l))
    .map((l) => {
      if (l.type === "transit")
        return { min: l.durationMin, route: toRouteRef(l.route), label: t("plan.mode.ride", { route: l.route.name, min: l.durationMin }) };
      const min = walkMinutes(l.distanceM, walkPace);
      return { min, label: t("plan.mode.walk", { min }) };
    });
  return (
    <span className={styles.modes} role="img" aria-label={parts.map((p) => p.label).join(", ")}>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && <span className={styles.modeSep}>›</span>}
          {p.route ? (
            <span className={styles.modeRide}>
              <RouteBadge route={p.route} size="sm" />
              <span className={styles.modeMin}>{t("time.min", { n: p.min })}</span>
            </span>
          ) : (
            <span className={styles.modeWalk}>
              <Icon name="directions_walk" size={20} />
              {p.min}
            </span>
          )}
        </Fragment>
      ))}
    </span>
  );
}
