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
    case "ticket":
      return (
        <button type="button" className={styles.fab} aria-label={t("map.myTicket")} onClick={props.onPress}>
          <Icon name="qr_code" color="var(--c-accent-icon)" />
        </button>
      );
    case "planTrip":
      return (
        // At Extra large on a narrow phone the label goes under the icon in small type: the wide
        // button covered 40% of the map strip there, and an icon alone lost the word (46).
        <button type="button" className={`${styles.fab} ${styles.extended} ${styles.planTrip}`} onClick={props.onPress}>
          <Icon name="route_plan" />
          <span className={styles.label}>{t("map.planTrip")}</span>
        </button>
      );
    case "routeAlerts":
      return (
        // Red only for a service change; a route whose alerts are all advisories (an elevator out)
        // gets the navy (i), as in the Alerts list (lib/alerts.ts isAdvisory).
        <button type="button" className={`${styles.fab} ${styles.extended} ${props.advisory ? styles.advisory : styles.alert}`} onClick={props.onPress}>
          {props.advisory ? <Icon name="info" color="var(--c-brand-navy)" /> : <Icon name="warning" color="var(--c-alert-icon)" />}
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
