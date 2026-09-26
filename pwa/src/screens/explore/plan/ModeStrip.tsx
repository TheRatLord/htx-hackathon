import type { Itinerary } from "../../../api/types.ts";
import { isEmptyWalk } from "../../../features/trip/steps.ts";
import { useT } from "../../../i18n/index.ts";
import { toRouteRef } from "../../../lib/routes.ts";
import { walkMinutes } from "../../../lib/walk.ts";
import { usePrefs } from "../../../state/prefs.ts";
import { Icon } from "../../../ui/Icon.tsx";
import { RouteBadge } from "../../../ui/RouteBadge.tsx";
import styles from "./plan.module.css";

/**
 * Today's mode strip: 🚶 › [80] › 🚶 › [73] › 🚶, with each leg's minutes under its icon or badge
 * ("5 min"). It always ends with the walk from the last bus to the place, as v2.71 does (22): when
 * the planner ends the trip at the place's own stop (Hobby Airport is its terminal curb stop, so the
 * planned walk is 0 m), that walk is still there, from the curb to the door, and shows as the
 * shortest walk, 1 min. A trip to a stop ends with its bus.
 */
export function ModeStrip({ it, toPlace = false }: { it: Itinerary; toPlace?: boolean }) {
  const t = useT();
  const { walkPace } = usePrefs();
  // Every transfer shows between its two buses: the walk to the next stop, or, at the same stop,
  // the wait (🕒 2 min), so a 1 min walk and a same-stop change look alike (22).
  const parts: { min: number; label: string; route?: ReturnType<typeof toRouteRef>; icon?: "directions_walk" | "schedule" }[] = [];
  const last = it.legs.at(-1);
  it.legs.forEach((l, i) => {
    const finalWalk = toPlace && l === last && l.type === "walk" && i > 0;
    if (isEmptyWalk(l) && !finalWalk) return;
    if (l.type === "transit") {
      if (l.transfer?.sameStop) parts.push({ min: l.transfer.waitMin, icon: "schedule", label: t("plan.mode.wait", { min: l.transfer.waitMin }) });
      parts.push({ min: l.durationMin, route: toRouteRef(l.route), label: t("plan.mode.ride", { route: l.route.name, min: l.durationMin }) });
      return;
    }
    const min = walkMinutes(l.distanceM, walkPace);
    parts.push({ min, icon: "directions_walk", label: t("plan.mode.walk", { min }) });
  });
  // Each leg carries its "›" in front of it, and a "›" that starts a line is clipped (.modesClip),
  // so a strip that must wrap (Extra large at 360dp) never leaves a "›" dangling at a line's end;
  // the two lines are balanced, so no leg sits alone on the second (22-xlarge-360).
  return (
    <span className={styles.modesClip} role="img" aria-label={parts.map((p) => p.label).join(", ")}>
      <span className={styles.modes}>
        {parts.map((p, i) => (
          <span key={i} className={styles.modeStep}>
            <span className={styles.modeSep}>›</span>
            <span className={styles.modeRide}>
              {p.route ? (
                <RouteBadge route={p.route} size="sm" />
              ) : (
                <span className={styles.modeWalk}>
                  <Icon name={p.icon ?? "directions_walk"} size={24} />
                </span>
              )}
              <span className={styles.modeMin}>{t("time.min", { n: p.min })}</span>
            </span>
          </span>
        ))}
      </span>
    </span>
  );
}
