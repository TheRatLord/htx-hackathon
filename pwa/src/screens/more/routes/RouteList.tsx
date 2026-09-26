// D20 Route Schedules: every route, rail first, then buses by number; each opens the Route page.

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { ClientRoute } from "../../../api/types.ts";
import { useBack } from "../../../app/useBack.ts";
import { usePageTitle } from "../../../app/usePageTitle.ts";
import { useT } from "../../../i18n/index.ts";
import { routeRef, useRoutesLoaded } from "../../../lib/routes.ts";
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

/** The static file the service worker precaches. TODO(requests.md): list it through src/lib/routes.ts (`useAllRoutes()`). */
async function fetchRoutes(): Promise<ClientRoute[]> {
  const res = await fetch("/data/routes.json");
  if (!res.ok) throw new Error(`Request failed (HTTP ${res.status}).`);
  return (await res.json()) as ClientRoute[];
}

export default function RouteList() {
  const t = useT();
  const [query, setQuery] = useState("");
  usePageTitle(t("route.listTitle"));
  // Badges use the same RouteRefs as every other screen.
  useRoutesLoaded();
  const routes = useQuery({ queryKey: ["static", "routes.json"], queryFn: fetchRoutes, staleTime: Infinity });
  const shown = (routes.data ?? []).filter((r) => matches(r, query)).sort(byRailThenNumber);

  let body;
  if (routes.isError) {
    body = <ErrorState error={routes.error} onRetry={() => void routes.refetch()} />;
  } else if (routes.isPending) {
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
