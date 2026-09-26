// D22 Unknown URL.

import { usePageTitle } from "../../app/usePageTitle.ts";
import { useT } from "../../i18n/index.ts";
import { Button } from "../../ui/Button.tsx";
import { Icon } from "../../ui/Icon.tsx";
import styles from "./more.module.css";

export default function NotFound() {
  const t = useT();
  usePageTitle(t("notFound.title"));
  return (
    <div className={styles.center}>
      <Icon name="map_pin" size={40} color="var(--c-text-variant)" />
      <h1 tabIndex={-1} className={styles.centerTitle}>
        {t("notFound.title")}
      </h1>
      <Button variant="primary" label={t("notFound.goExplore")} href="/explore" />
    </div>
  );
}
