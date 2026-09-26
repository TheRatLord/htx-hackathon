import { useT } from "../i18n/index.ts";
import styles from "./DemoTag.module.css";

/** The "Demo" tag on anything built from demo data (C.11), in the BayTag style. */
export function DemoTag() {
  const t = useT();
  return <span className={styles.tag}>{t("alert.demoTag")}</span>;
}
