import { useT } from "../i18n/index.ts";
import { Icon } from "./Icon.tsx";
import styles from "./MapSearchBar.module.css";
import { MetroMark } from "./MetroMark.tsx";
import type { MapSearchBarProps } from "./types.ts";

/** C.8: the white pill over the map; the whole pill opens Search. */
export function MapSearchBar({ onPress }: MapSearchBarProps) {
  const t = useT();
  return (
    <button type="button" className={styles.bar} aria-label={t("map.searchLabel")} onClick={onPress}>
      <span aria-hidden="true">
        <MetroMark height={24} />
      </span>
      <span className={styles.placeholder}>{t("map.searchPlaceholder")}</span>
      <Icon name="search" color="var(--c-text-variant)" />
    </button>
  );
}
