import { useLang, useT } from "../i18n/index.ts";
import { formatDistance } from "../lib/format.ts";
import { MAX_WALK_MINUTES, walkMinutes } from "../lib/walk.ts";
import { usePrefs } from "../state/prefs.ts";
import { Icon } from "./Icon.tsx";
import styles from "./WalkButton.module.css";
import type { WalkButtonProps } from "./types.ts";


/**
 * C.5a: the compact "🚶 1 min / walk" button at the top right of every stop card (one layout on
 * every card and width: it never takes a row of its own). Opens Walk (D8). From a place (D4) the
 * sub-label says where from, "walk from the museum" (`walkFrom.label`), so a visitor doesn't read it
 * as a walk from where they stand; the accessible name uses the full name.
 */
export function WalkButton({ stopId, tcName, walkDistanceM, walkFrom, onPress }: WalkButtonProps) {
  const t = useT();
  const lang = useLang();
  const { walkPace } = usePrefs();
  const min = walkMinutes(walkDistanceM, walkPace);
  const far = min > MAX_WALK_MINUTES;
  const value = far ? formatDistance(walkDistanceM, lang) : t("time.min", { n: min });
  let label: string;
  if (tcName) label = far ? t("card.walkToTcDistanceA11y", { name: tcName, distance: value }) : t("card.walkToTcA11y", { name: tcName, count: min });
  else if (far) label = t("card.walkDistanceA11y", { id: stopId, distance: value });
  else if (walkFrom) label = t("card.walkFromA11y", { from: walkFrom.name ?? walkFrom.label, id: stopId, count: min });
  else label = t("card.walkA11y", { id: stopId, count: min });
  return (
    <button type="button" className={styles.walk} aria-label={label} onClick={onPress}>
      <Icon name="directions_walk" size={20} />
      <span className={styles.text}>
        <span className={styles.value}>{value}</span>
        <span className={styles.sub}>{walkFrom ? t("card.walkFromSub", { from: walkFrom.label }) : t("card.walkSub")}</span>
      </span>
    </button>
  );
}
