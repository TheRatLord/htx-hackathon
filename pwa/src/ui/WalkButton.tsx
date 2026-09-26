import { useLang, useT } from "../i18n/index.ts";
import { formatDistance } from "../lib/format.ts";
import { walkMinutes } from "../lib/walk.ts";
import { usePrefs } from "../state/prefs.ts";
import { Icon } from "./Icon.tsx";
import styles from "./WalkButton.module.css";
import type { WalkButtonProps } from "./types.ts";

/** Beyond this, minutes are less useful than the distance. */
const MAX_MINUTES = 20;

/**
 * C.5a: "🚶 1 min walk" on one line, at the end of a stop card's side-of-street line. Opens Walk
 * (D8). From a place (D4) the visible text stays "4 min walk" (the title says where from); the
 * accessible name says it.
 */
export function WalkButton({ stopId, tcName, walkDistanceM, walkFrom, onPress }: WalkButtonProps) {
  const t = useT();
  const lang = useLang();
  const { walkPace } = usePrefs();
  const min = walkMinutes(walkDistanceM, walkPace);
  const far = min > MAX_MINUTES;
  const value = far ? formatDistance(walkDistanceM, lang) : t("time.min", { n: min });
  let label: string;
  if (tcName) label = far ? t("card.walkToTcDistanceA11y", { name: tcName, distance: value }) : t("card.walkToTcA11y", { name: tcName, count: min });
  else if (far) label = t("card.walkDistanceA11y", { id: stopId, distance: value });
  else if (walkFrom) label = t("card.walkFromA11y", { from: walkFrom.name ?? walkFrom.label, id: stopId, count: min });
  else label = t("card.walkA11y", { id: stopId, count: min });
  return (
    <button type="button" className={styles.walk} aria-label={label} onClick={onPress}>
      <Icon name="directions_walk" size={20} />
      <span className={styles.value}>{t("card.walkPill", { value })}</span>
    </button>
  );
}
