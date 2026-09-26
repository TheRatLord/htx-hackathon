import { useT } from "../i18n/index.ts";
import styles from "./Fab.module.css";
import { Icon } from "./Icon.tsx";
import type { FabProps } from "./types.ts";

/** C.9: the map FABs. ExploreLayout renders them; screens choose them via useExploreChrome. */
export function Fab(props: FabProps) {
  const t = useT();
  switch (props.kind) {
    case "locate":
      return (
        <button type="button" className={styles.fab} aria-label={t("map.locate")} onClick={props.onPress}>
          <Icon name="my_location" color="var(--c-accent-icon)" />
        </button>
      );
    case "planTrip":
      return (
        <button type="button" className={`${styles.fab} ${styles.extended}`} onClick={props.onPress}>
          <Icon name="route_plan" />
          {t("map.planTrip")}
        </button>
      );
    case "routeAlerts":
      return (
        <button type="button" className={`${styles.fab} ${styles.extended} ${styles.alert}`} onClick={props.onPress}>
          <Icon name="warning" color="var(--c-alert-icon)" />
          {t("map.routeAlerts", { count: props.count })}
        </button>
      );
    case "myTrip":
      return (
        <button type="button" className={`${styles.fab} ${styles.extended}`} onClick={props.onPress}>
          <Icon name="notifications_active" color="var(--c-live-icon)" />
          {t("map.myTrip")}
        </button>
      );
  }
}
