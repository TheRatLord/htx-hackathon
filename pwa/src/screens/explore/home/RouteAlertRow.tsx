import { useNavigate } from "react-router";
import { useAlerts } from "../../../api/alertsStore.ts";
import type { Alert } from "../../../api/types.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { alertText, effectWord, isAdvisory } from "../../../lib/alerts.ts";
import { DemoTag } from "../../../ui/DemoTag.tsx";
import { Icon } from "../../../ui/Icon.tsx";
import styles from "./RouteAlertRow.module.css";

/**
 * D3 (F1): a route-wide alert as ONE line above the cards, "⚠ Detour: Main St closed betwe… ›",
 * so the nearest stop of each direction stays above the fold at 412x800 (a two-line alert box
 * pushed the NORTHBOUND card under the nav). The full text is one tap away (the alert, or the
 * route's alert list when there are several), and the accessible name reads it all.
 */
export function RouteAlertRow({ alerts, routeId }: { alerts: Alert[]; routeId: string }) {
  const t = useT();
  const lang = useLang();
  const navigate = useNavigate();
  const store = useAlerts();
  // A service change (red) outranks an advisory (navy), as in AlertStatusLine.
  const first = alerts.find((a) => !isAdvisory(a.effect)) ?? alerts[0];
  if (!first) return null;
  const advisory = isAdvisory(first.effect);
  const header = alertText(first, "header", lang).text;
  const effect = effectWord(first.effect, lang);
  const more = alerts.length - 1;
  const open = () => navigate(more > 0 ? `/more/alerts?route=${encodeURIComponent(routeId)}` : `/more/alerts/${encodeURIComponent(first.id)}`);
  const moreText = more > 0 ? t("alert.more", { count: more }) : "";
  return (
    <button type="button" className={`${styles.row} ${advisory ? styles.advisory : ""}`} aria-label={[`${effect}: ${header}`, moreText].filter(Boolean).join(". ")} onClick={open}>
      {advisory ? <Icon name="info" size={20} color="var(--c-brand-navy)" /> : <Icon name="warning" size={20} color="var(--c-alert-icon)" />}
      <span className={styles.text}>
        <strong>{effect}:</strong> {header}
      </span>
      {more > 0 && <span className={styles.more}>+{more}</span>}
      {store.source === "demo" && <DemoTag />}
      <Icon name="chevron_right" />
    </button>
  );
}
