import { useContext, useLayoutEffect } from "react";
import { useT } from "../i18n/index.ts";
import { Icon } from "./Icon.tsx";
import { SheetChromeContext } from "./sheetChrome.ts";
import styles from "./SearchField.module.css";
import type { SearchFieldProps } from "./types.ts";

/**
 * C.8: the search input at the top of the Search sheet, with "‹ Back" beside the pill (not inside
 * it, where it read as typed text). In a sheet it stands in for the sheet's own button row: the
 * search sheet needs no "Show map".
 */
export function SearchField({ value, onChange, onBack, onSubmit, label, placeholder, autoFocus = true }: SearchFieldProps) {
  const t = useT();
  const host = useContext(SheetChromeContext)?.host;
  useLayoutEffect(() => host?.(), [host]);
  return (
    <form
      className={`${styles.form} ${host ? styles.inSheet : ""}`}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      <button type="button" className={`${styles.text} ${styles.back}`} onClick={onBack}>
        <Icon name="chevron_left" />
        {t("common.back")}
      </button>
      <div className={styles.field}>
        <input
          className={styles.input}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          enterKeyHint="search"
        />
        {value && (
          <button type="button" className={styles.text} onClick={() => onChange("")}>
            {t("common.clear")}
          </button>
        )}
      </div>
    </form>
  );
}
