import { useT } from "../i18n/index.ts";
import { Icon } from "./Icon.tsx";
import styles from "./StatusBanner.module.css";
import type { OverlayItem } from "./types.ts";

/**
 * "Offline · times from 7:42 PM may be out of date" as a 16sp headline over a 14sp line, so the
 * banner stays one 48dp row at 360dp instead of wrapping to a taller one (C.12). Every locale's
 * banner string puts " · " between the two parts.
 */
function TwoLine({ text, mark }: { text: string; mark?: string }) {
  const cut = text.indexOf(" · ");
  const head = cut < 0 ? text : text.slice(0, cut);
  return (
    <span className={styles.lines}>
      <span className={styles.head}>{mark ? `${mark} ${head}` : head}</span>
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
          {item.complete ? (
            <TwoLine text={t("banner.tripComplete", { time: item.arriveAt })} mark="✓" />
          ) : (
            <TwoLine text={t("banner.tripActive", { time: item.arriveAt })} mark="●" />
          )}
          {item.onOpen && (
            <button type="button" className={styles.open} onClick={item.onOpen}>
              {t("common.open")} ›
            </button>
          )}
          {item.onEnd && (
            <button type="button" className={styles.end} aria-label={t("banner.endTrip")} onClick={item.onEnd}>
              <Icon name="close" size={20} />
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
