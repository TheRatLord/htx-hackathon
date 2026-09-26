import { Icon } from "../../../ui/Icon.tsx";
import styles from "./FindInput.module.css";

/** The 48dp filter field on the Route page (D9) and the Route Schedules list (D20). */
export function FindInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className={styles.field}>
      <Icon name="search" color="var(--c-text-variant)" />
      <input
        className={styles.input}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        aria-label={label}
        autoComplete="off"
        enterKeyHint="search"
      />
    </label>
  );
}
