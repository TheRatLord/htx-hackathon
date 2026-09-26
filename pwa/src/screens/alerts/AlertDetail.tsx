// D15 Alert detail: the full text, dates, and the routes and stops it affects.

import { useNavigate, useParams } from "react-router";
import { useAlerts } from "../../api/alertsStore.ts";
import { usePageTitle } from "../../app/usePageTitle.ts";
import { useBack } from "../../app/useBack.ts";
import { useLang, useT } from "../../i18n/index.ts";
import { alertText, effectWord } from "../../lib/alerts.ts";
import { formatDateRange } from "../../lib/format.ts";
import { useRoutesLoaded } from "../../lib/routes.ts";
import { AlertStatusLine } from "../../ui/AlertStatusLine.tsx";
import { AppBar } from "../../ui/AppBar.tsx";
import { EmptyState } from "../../ui/EmptyState.tsx";
import { Icon } from "../../ui/Icon.tsx";
import { ListRow } from "../../ui/ListRow.tsx";
import { RouteBadge } from "../../ui/RouteBadge.tsx";
import { SectionHeader } from "../../ui/SectionHeader.tsx";
import styles from "./alerts.module.css";
import { alertRouteRefs } from "./routeRefs.ts";
import { useStops } from "../../lib/stops.ts";

export default function AlertDetail() {
  const t = useT();
  const lang = useLang();
  const navigate = useNavigate();
  const onBack = useBack();
  const { alertId = "" } = useParams();
  const store = useAlerts();
  useRoutesLoaded();
  const alert = store.alerts.find((a) => a.id === alertId);
  const routes = alert ? alertRouteRefs(alert) : [];
  const stops = useStops(Boolean(alert?.stopIds.length));
  // "Detour: Route 40 · RideMETRO", so tabs and history tell alerts apart.
  let title = t("alerts.detailTitle");
  if (alert) {
    const effect = effectWord(alert.effect, lang);
    const names = routes.map((r) => r.name).join(", ");
    title = routes.length ? t("alerts.detailPageTitle", { effect, routes: t("alerts.routes", { count: routes.length, names }) }) : effect;
  }
  usePageTitle(title);

  let content;
  // AlertStatusLine owns the loading and "can't be checked" states.
  if (store.status !== "ok" || store.source === "unavailable") {
    content = (
      <div className={styles.detail}>
        <AlertStatusLine scope="route" name={t("alerts.title")} alerts={[]} />
      </div>
    );
  } else if (!alert) {
    content = (
      <EmptyState
        icon="error"
        title={t("alerts.goneTitle")}
        body={t("alerts.gone")}
        action={{ label: `${t("alerts.allAlerts")} ›`, onPress: () => navigate("/more/alerts") }}
      />
    );
  } else {
    const header = alertText(alert, "header", lang);
    const description = alertText(alert, "description", lang);
    content = (
      <>
        <div className={styles.detail}>
          <p className={styles.effect}>
            <Icon name="warning" color="var(--c-alert-icon)" />
            {effectWord(alert.effect, lang)}
          </p>
          {store.source === "demo" && <p className={styles.demo}>{t("alerts.demoCaption")}</p>}
          <h2 className={styles.header}>{header.text}</h2>
          <p>{formatDateRange(alert.activeFrom, alert.activeUntil, lang, { withTime: true })}</p>
          {description.text && <p className={styles.description}>{description.text}</p>}
          {(header.englishOnly || description.englishOnly) && <p className={styles.caption}>{t("alert.englishOnly")}</p>}
        </div>
        {routes.length > 0 && (
          <section>
            <SectionHeader label={t("alerts.affectedRoutes")} tone="variant" />
            <div className={styles.chips}>
              {routes.map((r) => (
                <RouteBadge key={r.id} route={r} size="md" onPress={() => navigate(`/explore/route/${encodeURIComponent(r.id)}`)} />
              ))}
            </div>
          </section>
        )}
        {alert.stopIds.length > 0 && (
          <section>
            <SectionHeader label={t("alerts.affectedStops")} tone="variant" />
            {alert.stopIds.map((id) => {
              const name = stops?.get(id)?.name;
              const label = name ? t("stopLine.title", { name, id }) : t("card.stopNumber", { id });
              return <ListRow key={id} kind="internal" label={label} href={`/explore/stop/${encodeURIComponent(id)}`} />;
            })}
          </section>
        )}
        <p className={`${styles.caption} ${styles.footer}`}>{store.source === "demo" ? t("alerts.sourceDemo") : t("alerts.sourceMetro")}</p>
      </>
    );
  }

  return (
    <>
      <AppBar title={t("alerts.detailTitle")} onBack={onBack} />
      {content}
    </>
  );
}
