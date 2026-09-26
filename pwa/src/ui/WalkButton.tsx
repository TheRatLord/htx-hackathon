import { useLang, useT } from "../i18n/index.ts";
import { formatDistance } from "../lib/format.ts";
import { walkMinutes } from "../lib/walk.ts";
import { usePrefs } from "../state/prefs.ts";
import { Icon } from "./Icon.tsx";
import styles from "./WalkButton.module.css";
import type { WalkButtonProps } from "./types.ts";

/** Beyond this, minutes are less useful than the distance. */
const MAX_MINUTES = 20;

/** C.5a: "🚶 1 min / walk", top right of a stop card. Opens Walk (D8). */
export function WalkButton({ stopId, walkDistanceM, walkFrom, onPress }: WalkButtonProps) {
  const t = useT();
  const lang = useLang();
  const { walkPace } = usePrefs();
  const min = walkMinutes(walkDistanceM, walkPace);
  const far = min > MAX_MINUTES;
  const value = far ? formatDistance(walkDistanceM, lang) : t("time.min", { n: min });
  const label = far
    ? t("card.walkDistanceA11y", { id: stopId, distance: value })
    : walkFrom
      ? t("card.walkFromA11y", { from: walkFrom.name ?? walkFrom.label, id: stopId, count: min })
      : t("card.walkA11y", { id: stopId, count: min });
  return (
    <button type="button" className={styles.walk} aria-label={label} onClick={onPress}>
      <span className={styles.top}>
        <Icon name="directions_walk" size={20} />
        <span className={styles.value}>{value}</span>
      </span>
      <span className={styles.sub}>{walkFrom ? t("card.walkFrom", { from: walkFrom.label }) : t("card.walk")}</span>
    </button>
  );
}
