import { useRef } from "react";
import { useT } from "../../../i18n/index.ts";
import { Icon } from "../../../ui/Icon.tsx";
import styles from "./FindInput.module.css";

/** The 48dp filter field on the Route page (D9) and the Route Schedules list (D20), with a Clear button like SearchField's. */
export function FindInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className={styles.field}>
      <Icon name="search" color="var(--c-text-variant)" />
      <input
        ref={input}
        className={styles.input}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        aria-label={label}
        autoComplete="off"
        enterKeyHint="search"
      />
      {value && (
        <button
          type="button"
          className={styles.clear}
          onClick={() => {
            onChange("");
            input.current?.focus();
          }}
        >
          {t("common.clear")}
        </button>
      )}
    </div>
  );
}
