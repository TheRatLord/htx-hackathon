import { useT } from "../i18n/index.ts";
import { Icon } from "./Icon.tsx";
import styles from "./SearchField.module.css";
import type { SearchFieldProps } from "./types.ts";

/** C.8: the search input at the top of the Search sheet. */
export function SearchField({ value, onChange, onBack, onSubmit, label, placeholder, autoFocus = true }: SearchFieldProps) {
  const t = useT();
  return (
    <form
      className={styles.field}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      <button type="button" className={styles.text} onClick={onBack}>
        <Icon name="chevron_left" />
        {t("common.back")}
      </button>
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
    </form>
  );
}
