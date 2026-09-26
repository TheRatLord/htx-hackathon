import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./Toast.module.css";
import type { ToastOptions } from "./types.ts";

const DEFAULT_MS = 4000;
/** Undo toasts stay long enough to find the button (C.15). */
const UNDO_MS = 10_000;

const ToastContext = createContext<(t: ToastOptions) => void>(() => {});

/** C.15: one toast at a time, above the nav, `role="status"`. It pauses while focused. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastOptions & { id: number }) | null>(null);
  const [paused, setPaused] = useState(false);
  const nextId = useRef(0);
  const show = useCallback((t: ToastOptions) => setToast({ ...t, id: ++nextId.current }), []);

  useEffect(() => {
    if (!toast || paused) return;
    const ms = toast.durationMs ?? (toast.action ? UNDO_MS : DEFAULT_MS);
    const timer = setTimeout(() => setToast(null), ms);
    return () => clearTimeout(timer);
  }, [toast, paused]);

  return (
    <ToastContext value={show}>
      {children}
      <div className={styles.host} role="status" onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
        {toast && (
          <div key={toast.id} className={styles.toast}>
            <span>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  toast.action!.onPress();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext>
  );
}

export function useToast(): (t: ToastOptions) => void {
  return useContext(ToastContext);
}
