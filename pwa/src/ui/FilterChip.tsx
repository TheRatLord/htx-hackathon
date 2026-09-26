import styles from "./FilterChip.module.css";
import { Icon } from "./Icon.tsx";
import type { FilterChipProps } from "./types.ts";

/** C.10: time, sort and alert-filter chips. */
export function FilterChip({ label, selected, onPress }: FilterChipProps) {
  return (
    <button type="button" className={styles.chip} aria-pressed={selected} onClick={onPress}>
      {selected && <Icon name="check" size={18} />}
      {label}
    </button>
  );
}
