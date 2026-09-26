import { useT } from "../i18n/index.ts";
import styles from "./BayDiagram.module.css";
import type { BayDiagramProps } from "./types.ts";

/**
 * C.14: a schematic of bays per platform. Not a map: the data cannot place bays. Bays are round
 * letters on a grey platform bar, so they never read as square route chips.
 */
export function BayDiagram({ platforms, highlight, onBayPress, handAuthored }: BayDiagramProps) {
  const t = useT();
  return (
    <div className={styles.diagram}>
      {platforms.map((p) => (
        <section key={p.stopId} className={styles.platform} aria-label={p.label}>
          <p className={styles.label}>{p.label}</p>
          <div className={styles.bays}>
            {p.bays.map((bay) => (
              <button
                key={bay}
                type="button"
                className={styles.bay}
                aria-pressed={highlight?.some((h) => h.stopId === p.stopId && h.bay === bay) ?? false}
                aria-label={t("bay.tileA11y", { bay, platform: p.spokenName ?? p.label, routes: (p.routesByBay?.[bay] ?? []).join(", ") })}
                onClick={() => onBayPress(bay)}
              >
                {bay}
              </button>
            ))}
          </div>
        </section>
      ))}
      {handAuthored && <p className={styles.caption}>{t("bay.handAuthored")}</p>}
    </div>
  );
}
