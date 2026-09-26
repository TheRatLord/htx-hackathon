import { useT } from "../i18n/index.ts";
import styles from "./Skeleton.module.css";
import type { SkeletonProps } from "./types.ts";

/** C.15: loading placeholders; never a blank sheet. */
export function Skeleton({ variant }: SkeletonProps) {
  const t = useT();
  return (
    <div className={`${styles.skeleton} ${styles[variant]}`} role="status" aria-label={t("common.loading")}>
      {variant === "stop-card" && (
        <>
          <span className={styles.line} style={{ width: "70%" }} />
          <span className={styles.line} style={{ width: "50%" }} />
          <span className={styles.line} style={{ width: "85%" }} />
        </>
      )}
    </div>
  );
}
