// D20 Route Schedules: every route, rail first, then buses by number; each opens the Route page.

import { useState } from "react";
import type { ClientRoute } from "../../../api/types.ts";
import { useBack } from "../../../app/useBack.ts";
import { usePageTitle } from "../../../app/usePageTitle.ts";
import { useT } from "../../../i18n/index.ts";
import { routeRef, useAllRoutes } from "../../../lib/routes.ts";
import { compareRouteNames } from "../../../lib/sortRoutes.ts";
import { AppBar } from "../../../ui/AppBar.tsx";
import { EmptyState } from "../../../ui/EmptyState.tsx";
import { ErrorState } from "../../../ui/ErrorState.tsx";
import { ListRow } from "../../../ui/ListRow.tsx";
import { RouteBadge } from "../../../ui/RouteBadge.tsx";
import { Skeleton } from "../../../ui/Skeleton.tsx";
import { FindInput } from "../../explore/route/FindInput.tsx";
import { routeTitle } from "../../explore/route/routeGeo.ts";
import { stopMatches } from "../../explore/route/stopMatch.ts";
import styles from "./RouteList.module.css";

const byRailThenNumber = (a: ClientRoute, b: ClientRoute) =>
  Number(b.type === "rail") - Number(a.type === "rail") || compareRouteNames(a.displayName, b.displayName);

/** "82" finds route 82 (not 182); words match the route's name. */
const matches = (r: ClientRoute, q: string) => (/^\d+$/.test(q.trim()) ? r.displayName === q.trim() : stopMatches({ id: "", name: routeTitle(r) }, q));

export default function RouteList() {
  const t = useT();
  const [query, setQuery] = useState("");
  usePageTitle(t("route.listTitle"));
  const { routes, error, retry } = useAllRoutes();
  const shown = routes.filter((r) => matches(r, query)).sort(byRailThenNumber);

  let body;
  if (error) {
    body = <ErrorState error={error} onRetry={retry} />;
  } else if (!routes.length) {
    body = (
      <div className={styles.find}>
        <Skeleton variant="row" />
        <Skeleton variant="row" />
      </div>
    );
  } else if (!shown.length) {
    body = <EmptyState icon="search" title={t("route.noRouteMatch", { q: query })} body={t("route.noRouteMatchBody")} />;
  } else {
    body = (
      <ul>
        {shown.map((r) => {
          const ref = routeRef(r.id);
          return (
            <li key={r.id}>
              <ListRow
                kind="internal"
                label={routeTitle(r)}
                href={`/explore/route/${encodeURIComponent(r.id)}`}
                leading={<span className={styles.badge}>{ref && <RouteBadge route={ref} size="sm" />}</span>}
              />
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className={styles.screen}>
      <AppBar title={t("route.listTitle")} onBack={useBack()} />
      <div className={styles.find}>
        <FindInput value={query} onChange={setQuery} label={t("route.findRoute")} />
      </div>
      {body}
    </div>
  );
}
