import { useT } from "../i18n/index.ts";
import styles from "./StatusBanner.module.css";
import type { OverlayItem } from "./types.ts";

/** C.12: the single item in the map overlay slot (ExploreLayout picks the highest priority). */
export function StatusBanner({ item }: { item: OverlayItem }) {
  const t = useT();
  switch (item.kind) {
    case "offline":
      return (
        <p className={`${styles.banner} ${styles.offline}`}>
          {item.since ? t("banner.offline", { time: item.since }) : t("banner.offlineNoTime")}
        </p>
      );
    case "trip-active":
      return (
        <div className={`${styles.banner} ${styles.trip}`}>
          <span>● {t("banner.tripActive", { time: item.arriveAt })}</span>
          {item.onOpen && (
            <button type="button" className={styles.open} onClick={item.onOpen}>
              {t("common.open")} ›
            </button>
          )}
        </div>
      );
    case "search-this-area":
      return (
        <button type="button" className={styles.pill} onClick={item.onPress}>
          {t("map.searchThisArea")}
        </button>
      );
    case "downtown-fallback":
      return <p className={styles.chip}>{t("banner.downtown")}</p>;
    case "demo-location":
      return <p className={styles.chip}>{t("banner.demoLocation")}</p>;
  }
}
