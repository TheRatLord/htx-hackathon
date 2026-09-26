import { Button } from "./Button.tsx";
import styles from "./EmptyState.module.css";
import { Icon } from "./Icon.tsx";
import type { EmptyStateProps } from "./types.ts";

/** C.15 */
export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  return (
    <div className={styles.state}>
      <Icon name={icon} size={40} color="var(--c-text-variant)" />
      <p className={styles.title}>{title}</p>
      <p>{body}</p>
      {action && <Button variant={action.variant ?? "tonal"} label={action.label} onPress={action.onPress} />}
    </div>
  );
}
