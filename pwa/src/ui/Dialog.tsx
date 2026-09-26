import { useEffect, useId, useRef } from "react";
import styles from "./Dialog.module.css";
import type { DialogProps } from "./types.ts";

/**
 * C.15: only for destructive confirmations and the METRO handoff. The native dialog traps focus
 * and closes on Esc; an extra history entry makes the browser/Android back button close it too.
 */
export function Dialog({ open, onClose, title, body, actions }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // Survives effect re-runs (StrictMode), so a pending history cleanup can tell it was reopened.
  const shown = useRef(false);

  useEffect(() => {
    const d = ref.current;
    if (open && d && !d.open) d.showModal();
    if (!open && d?.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    shown.current = true;
    if (history.state?.dialog !== id) history.pushState({ ...history.state, dialog: id }, "");
    const onPop = () => onCloseRef.current();
    window.addEventListener("popstate", onPop);
    return () => {
      shown.current = false;
      window.removeEventListener("popstate", onPop);
      // Closed by a button or Esc: drop our history entry, unless the action already navigated
      // away (checked after the router's own history update) or the dialog is open again.
      setTimeout(() => {
        if (!shown.current && history.state?.dialog === id) history.back();
      }, 0);
    };
  }, [open, id]);

  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby={`${id}-title`} onClose={onClose}>
      <h2 id={`${id}-title`} className={styles.title}>
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
