import type { Status } from "../api/types.ts";
import { useT } from "../i18n/index.ts";
import styles from "./StatusWord.module.css";
import type { StatusWordProps } from "./types.ts";

const KEYS: Record<Exclude<Status, "scheduled">, string> = { live: "status.live", simulated: "status.simulated", canceled: "status.canceled" };

/** C.2: "Live", "Live (demo)" or "Canceled". Scheduled is the unmarked default and renders nothing. */
export function StatusWord({ status }: StatusWordProps) {
  const t = useT();
  if (status === "scheduled") return null;
  return <span className={`${styles.word} ${styles[status]}`}>{t(KEYS[status])}</span>;
}
