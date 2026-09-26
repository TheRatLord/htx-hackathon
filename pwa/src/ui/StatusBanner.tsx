import { useT } from "../i18n/index.ts";
import styles from "./StatusBanner.module.css";
import type { OverlayItem } from "./types.ts";

/**
 * "Offline · times from 7:42 PM may be out of date" as a 16sp headline over a 14sp line, so the
 * banner stays one 48dp row at 360dp instead of wrapping to a taller one (C.12). Every locale's
 * banner string puts " · " between the two parts.
 */
function TwoLine({ text, dot }: { text: string; dot?: boolean }) {
  const cut = text.indexOf(" · ");
  const head = cut < 0 ? text : text.slice(0, cut);
  return (
    <span className={styles.lines}>
      <span className={styles.head}>{dot ? `● ${head}` : head}</span>
      {cut >= 0 && <span className={styles.tail}>{text.slice(cut + 3)}</span>}
    </span>
  );
}

/** C.12: the single item in the map overlay slot (ExploreLayout picks the highest priority). */
export function StatusBanner({ item }: { item: OverlayItem }) {
  const t = useT();
  switch (item.kind) {
    case "offline":
      return (
        <p className={`${styles.banner} ${styles.offline}`}>
          <TwoLine text={item.since ? t("banner.offline", { time: item.since }) : t("banner.offlineNoTime")} />
        </p>
      );
    case "trip-active":
      return (
        <div className={`${styles.banner} ${styles.trip}`}>
          <TwoLine text={t("banner.tripActive", { time: item.arriveAt })} dot />
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
