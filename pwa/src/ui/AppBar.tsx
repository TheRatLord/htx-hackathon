import { useT } from "../i18n/index.ts";
import styles from "./AppBar.module.css";
import { Icon } from "./Icon.tsx";
import type { AppBarProps } from "./types.ts";

/** C.7: the pushed-page bar. The title is the screen's <h1>, focused after navigation. */
export function AppBar({ title, onBack, right }: AppBarProps) {
  const t = useT();
  return (
    <header className={styles.bar}>
      <div className={styles.row}>
        <button type="button" className={styles.back} onClick={onBack}>
          <Icon name="chevron_left" />
          {t("common.back")}
        </button>
        {right}
      </div>
      <h1 tabIndex={-1} className={styles.title}>
        {title}
      </h1>
    </header>
  );
}
