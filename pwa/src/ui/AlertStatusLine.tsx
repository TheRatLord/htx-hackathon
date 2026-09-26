import { useNavigate } from "react-router";
import { useAlerts } from "../api/alertsStore.ts";
import { useLang, useT } from "../i18n/index.ts";
import { AlertBox } from "./AlertBox.tsx";
import styles from "./AlertStatusLine.module.css";
import { Button } from "./Button.tsx";
import { Icon } from "./Icon.tsx";
import { Skeleton } from "./Skeleton.tsx";
import type { AlertStatusLineProps } from "./types.ts";

/**
 * C.11: the only way a screen says whether there is an alert. "No alerts" appears only when the
 * live METRO feed answered; a failed feed says so; demo data with no alert here says nothing
 * (unless `demoNote`), since the demo is announced where alerts are listed.
 */
export function AlertStatusLine({ scope, name, alerts, demoNote }: AlertStatusLineProps) {
  const t = useT();
  const lang = useLang();
  const navigate = useNavigate();
  const store = useAlerts();

  if (store.status === "loading") return <Skeleton variant="row" />;
  if (store.status === "error" || store.source === "unavailable") {
    return (
      <div className={`${styles.line} ${styles.unknown}`}>
        <Icon name="error" color="var(--c-text-variant)" />
        <span className={styles.text}>{t("alert.unknown")}</span>
        <Button variant="text" label={t("common.tryAgain")} onPress={store.retry} />
      </div>
    );
  }
  if (alerts.length > 0) {
    const [first] = alerts;
    const routeId = scope === "route" ? first.routes[0]?.routeId : undefined;
    return (
      <div className={styles.stack}>
        <AlertBox alert={first} lang={lang} compact demo={store.source === "demo"} onOpen={() => navigate(`/more/alerts/${encodeURIComponent(first.id)}`)} />
        {alerts.length > 1 && (
          <Button
            variant="text"
            label={`${t("alert.more", { count: alerts.length - 1 })} ›`}
            onPress={() => navigate(routeId ? `/more/alerts?route=${encodeURIComponent(routeId)}` : "/more/alerts")}
          />
        )}
      </div>
    );
  }
  // With demo alerts and none here there is nothing to qualify: the note would be the loudest
  // thing on a stop sheet. Only the Alerts screens ask for it.
  if (store.source === "demo") return demoNote ? <p className={`${styles.line} ${styles.demo}`}>{t("alert.demoOnly")}</p> : null;
  return (
    <p className={`${styles.line} ${styles.ok}`}>
      <Icon name="check_circle" />
      {t("alert.none", { name })}
    </p>
  );
}
