import { useEffect, useRef } from "react";
import styles from "./Dialog.module.css";
import type { DialogProps } from "./types.ts";

/** C.15: only for destructive confirmations and the METRO handoff. The native dialog traps focus and closes on Esc. */
export function Dialog({ open, onClose, title, body, actions }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby="dialog-title" onClose={onClose}>
      <h2 id="dialog-title" className={styles.title}>
        {title}
      </h2>
      <div className={styles.body}>{body}</div>
      <div className={styles.actions}>
        {actions.map((a) => (
          <button key={a.label} type="button" className={`${styles.action} ${a.variant === "danger-text" ? styles.danger : ""}`} onClick={a.onPress}>
            {a.label}
          </button>
        ))}
      </div>
    </dialog>
  );
}
