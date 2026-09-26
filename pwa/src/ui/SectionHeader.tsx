import { Button } from "./Button.tsx";
import styles from "./SectionHeader.module.css";
import type { SectionHeaderProps } from "./types.ts";

/** C.15: 16sp Medium caps; "blue" is the More list style. */
export function SectionHeader({ label, tone, action, note, id }: SectionHeaderProps) {
  return (
    <div className={styles.header} id={id}>
      <h2 className={`${styles.label} ${styles[tone]}`}>
        {label}
        {note && <span className={styles.note}>{note}</span>}
      </h2>
      {action && <Button variant="text" label={action.label} onPress={action.onPress} />}
    </div>
  );
}
