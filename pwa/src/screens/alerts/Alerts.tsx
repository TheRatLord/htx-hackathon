// D14 Service Alerts. "No alerts" is said only when the live METRO feed answered (C.11).

import { useNavigate, useSearchParams } from "react-router";
import { useAlerts } from "../../api/alertsStore.ts";
import type { Alert, RouteRef } from "../../api/types.ts";
import { usePageTitle } from "../../app/usePageTitle.ts";
import { useBack } from "../../app/useBack.ts";
import { useLang, useT } from "../../i18n/index.ts";
import { alertsForRoute } from "../../lib/alerts.ts";
import { routeRef, useRoutesLoaded } from "../../lib/routes.ts";
import { compareRouteNames } from "../../lib/sortRoutes.ts";
import { AlertBox } from "../../ui/AlertBox.tsx";
import { AlertStatusLine } from "../../ui/AlertStatusLine.tsx";
import { AppBar } from "../../ui/AppBar.tsx";
import { Button } from "../../ui/Button.tsx";
import { FilterChip } from "../../ui/FilterChip.tsx";
import { Icon } from "../../ui/Icon.tsx";
import { UpdatedAgo } from "../../ui/UpdatedAgo.tsx";
import styles from "./alerts.module.css";
import { alertRouteRefs } from "./routeRefs.ts";
import { useMyRoutes } from "./useMyRoutes.ts";

const firstRouteName = (a: Alert) => a.routes.map((r) => r.route).sort(compareRouteNames)[0] ?? "~";

/** No per-card "Demo" tag: the one banner above the list says every alert is a demo. */
function AlertItem({ alert }: { alert: Alert }) {
  const lang = useLang();
  const navigate = useNavigate();
  return (
    <li>
      <AlertBox
        alert={alert}
        lang={lang}
        compact="list"
        routes={alertRouteRefs(alert)}
        onOpen={() => navigate(`/more/alerts/${encodeURIComponent(alert.id)}`)}
      />
    </li>
  );
}

function OkLine({ text }: { text: string }) {
  return (
    <p className={styles.ok}>
      <Icon name="check_circle" />
      {text}
    </p>
  );
}

const names = (routes: RouteRef[]) => routes.map((r) => r.name).join(", ");

export default function Alerts() {
  const t = useT();
  const onBack = useBack();
  const navigate = useNavigate();
  const store = useAlerts();
  const myRoutes = useMyRoutes();
  const [params, setParams] = useSearchParams();
  useRoutesLoaded();

  const routeParam = params.get("route");
  const route = routeParam ? (routeRef(routeParam)?.name ?? routeParam) : undefined;
  const title = route ? t("alerts.titleRoute", { route }) : t("alerts.title");
  usePageTitle(title);

  // With no ?filter=, riders without routes see all alerts; wait for My routes so the choice doesn't flip.
  const filter = params.get("filter") === "all" || (!params.get("filter") && myRoutes?.length === 0) ? "all" : "mine";
  const setFilter = (f: "mine" | "all") =>
    setParams(
      (p) => {
        p.set("filter", f);
        return p;
      },
      { replace: true },
    );

  const demo = store.source === "demo";
  const isMine = (a: Alert) => (myRoutes ?? []).some((r) => alertsForRoute([a], r.id).length > 0);
  const shown = (routeParam ? alertsForRoute(store.alerts, routeParam) : filter === "mine" ? store.alerts.filter(isMine) : store.alerts)
    .slice()
    .sort((a, b) => compareRouteNames(firstRouteName(a), firstRouteName(b)));
  const mineWithout = (myRoutes ?? []).filter((r) => alertsForRoute(store.alerts, r.id).length === 0);
  const updatedAt = store.updatedAt;

  let body;
  // AlertStatusLine owns the loading and "can't be checked" states.
  if (store.status !== "ok" || store.source === "unavailable") {
    body = <AlertStatusLine scope="route" name={t("alerts.title")} alerts={[]} />;
  } else if (routeParam && shown.length === 0) {
    body = <AlertStatusLine scope="route" name={t("alerts.routeName", { route: route ?? routeParam })} alerts={[]} />;
  } else if (!routeParam && filter === "mine" && !myRoutes) {
    body = null;
  } else {
    const live = store.source === "metro";
    body = (
      <>
        {demo && <p className={styles.demo}>{t("alerts.sourceDemo")}</p>}
        {shown.length > 0 && (
          <ul className={styles.list}>
            {shown.map((a) => (
              <AlertItem key={a.id} alert={a} />
            ))}
          </ul>
        )}
        {live && !routeParam && filter === "all" && shown.length === 0 && <OkLine text={t("alerts.noneAll")} />}
        {live && !routeParam && filter === "mine" && myRoutes?.length === 0 && <p className={styles.note}>{t("alerts.noMyRoutes")}</p>}
        {live && !routeParam && filter === "mine" && myRoutes?.length && shown.length === 0 ? (
          <OkLine text={t("alerts.noneMine", { routes: names(myRoutes) })} />
        ) : null}
        {live && !routeParam && filter === "mine" && shown.length > 0 && mineWithout.length > 0 && (
          <OkLine text={t("alerts.noneOther", { routes: names(mineWithout) })} />
        )}
      </>
    );
  }

  return (
    <>
      <AppBar title={title} onBack={onBack} />
      {!routeParam && (
        <div className={styles.filters} role="group" aria-label={t("alerts.filterLabel")}>
          <FilterChip label={t("alerts.mine")} selected={filter === "mine"} onPress={() => setFilter("mine")} />
          <FilterChip label={t("alerts.all")} selected={filter === "all"} onPress={() => setFilter("all")} />
        </div>
      )}
      <div className={styles.body}>
        {body}
        {routeParam && (
          <div className={styles.more}>
            <Button variant="text" label={`${t("alerts.seeAll")} ›`} onPress={() => navigate("/more/alerts")} />
          </div>
        )}
      </div>
      {store.status === "ok" && store.source !== "unavailable" && (
        <footer className={styles.footer}>
          {/* The demo banner above already names the source. */}
          {!demo && <span>{t("alerts.sourceMetro")}</span>}
          {updatedAt ? (
            <>
              {!demo && <span aria-hidden="true">·</span>}
              <UpdatedAgo at={new Date(updatedAt).toISOString()} onRefresh={store.retry} />
            </>
          ) : null}
        </footer>
      )}
    </>
  );
}
