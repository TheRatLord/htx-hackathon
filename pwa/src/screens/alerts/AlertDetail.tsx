// D15 Alert detail: the full text, dates, and the routes and stops it affects.

import { useNavigate, useParams } from "react-router";
import { useAlerts } from "../../api/alertsStore.ts";
import { useStop } from "../../api/hooks.ts";
import type { RouteRef } from "../../api/types.ts";
import { usePageTitle } from "../../app/usePageTitle.ts";
import { useBack } from "../../app/useBack.ts";
import { useLang, useT } from "../../i18n/index.ts";
import { alertText, effectWord } from "../../lib/alerts.ts";
import { formatDateRange } from "../../lib/format.ts";
import { routeRef, toRouteRef, useRoutesLoaded } from "../../lib/routes.ts";
import { compareRouteNames } from "../../lib/sortRoutes.ts";
import { AlertStatusLine } from "../../ui/AlertStatusLine.tsx";
import { AppBar } from "../../ui/AppBar.tsx";
import { EmptyState } from "../../ui/EmptyState.tsx";
import { Icon } from "../../ui/Icon.tsx";
import { ListRow } from "../../ui/ListRow.tsx";
import { RouteBadge } from "../../ui/RouteBadge.tsx";
import { SectionHeader } from "../../ui/SectionHeader.tsx";
import styles from "./alerts.module.css";

function AffectedStop({ id }: { id: string }) {
  const t = useT();
  const stop = useStop(id);
  const label = stop.data ? t("stopLine.title", { name: stop.data.stop.name, id }) : t("card.stopNumber", { id });
  return <ListRow kind="internal" label={label} href={`/explore/stop/${encodeURIComponent(id)}`} />;
}

export default function AlertDetail() {
  const t = useT();
  const lang = useLang();
  const navigate = useNavigate();
  const onBack = useBack();
  const { alertId = "" } = useParams();
  const store = useAlerts();
  useRoutesLoaded();
  usePageTitle(t("alerts.detailTitle"));

  const alert = store.alerts.find((a) => a.id === alertId);
  let content;
  // AlertStatusLine owns the loading and "can't be checked" states (and must stay mounted across them).
  if (store.status !== "ok" || store.source === "unavailable") {
    content = (
      <div className={styles.detail}>
        <AlertStatusLine scope="route" name={t("alerts.title")} alerts={[]} />
      </div>
    );
  } else if (!alert) {
    content = (
      <EmptyState
        icon="check_circle"
        title={t("alerts.goneTitle")}
        body={t("alerts.gone")}
        action={{ label: `${t("alerts.allAlerts")} ›`, onPress: () => navigate("/more/alerts") }}
      />
    );
  } else {
    const header = alertText(alert, "header", lang);
    const description = alertText(alert, "description", lang);
    const routes: RouteRef[] = alert.routes
      .map((r) => routeRef(r.routeId) ?? toRouteRef({ id: r.routeId, name: r.route, color: r.color, textColor: "#FFFFFF" }))
      .sort((a, b) => compareRouteNames(a.name, b.name));
    content = (
      <>
        <div className={styles.detail}>
          <p className={styles.effect}>
            <Icon name="warning" color="var(--c-alert-icon)" />
            {effectWord(alert.effect, lang)}
          </p>
          {store.source === "demo" && <span className={styles.tag}>{t("alert.demoTag")}</span>}
          <h2 className={styles.header}>{header.text}</h2>
          <p>{formatDateRange(alert.activeFrom, alert.activeUntil, lang)}</p>
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
            {alert.stopIds.map((id) => (
              <AffectedStop key={id} id={id} />
            ))}
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
