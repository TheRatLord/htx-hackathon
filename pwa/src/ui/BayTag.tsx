import { useT } from "../i18n/index.ts";
import styles from "./BayTag.module.css";
import type { BayTagProps } from "./types.ts";

/** C.5: "Bay M". */
export function BayTag({ bay }: BayTagProps) {
  const t = useT();
  return <span className={styles.tag}>{t("stopLine.bay", { bay })}</span>;
}
