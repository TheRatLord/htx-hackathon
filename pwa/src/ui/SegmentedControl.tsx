import styles from "./SegmentedControl.module.css";
import { Icon } from "./Icon.tsx";
import type { SegmentedControlProps } from "./types.ts";

/** C.10: 2–3 exclusive options (direction, language, text size). */
export function SegmentedControl<V extends string>({ options, value, onChange, ariaLabel }: SegmentedControlProps<V>) {
  return (
    <div className={styles.group} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={styles.option}
          onClick={() => onChange(o.value)}
        >
          <span className={`${styles.label} ${o.labelSize ? styles[o.labelSize] : ""}`}>
            {o.value === value && <Icon name="check" size={18} />}
            {o.label}
          </span>
          {o.sub && <span className={styles.sub}>{o.sub}</span>}
        </button>
      ))}
    </div>
  );
}
