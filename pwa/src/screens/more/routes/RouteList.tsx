// D20 Route Schedules: every route, rail first, then buses by number; each opens the Route page.

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { ClientRoute } from "../../../api/types.ts";
import { useBack } from "../../../app/useBack.ts";
import { usePageTitle } from "../../../app/usePageTitle.ts";
import { useT } from "../../../i18n/index.ts";
import { compareRouteNames } from "../../../lib/sortRoutes.ts";
import { AppBar } from "../../../ui/AppBar.tsx";
import { EmptyState } from "../../../ui/EmptyState.tsx";
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
  // The static file the service worker precaches; the same one src/lib/routes.ts reads.
  const routes = useQuery({
    queryKey: ["static", "routes.json"],
    queryFn: () => fetch("/data/routes.json").then((r) => r.json() as Promise<ClientRoute[]>),
    staleTime: Infinity,
  });
  const shown = (routes.data ?? []).filter((r) => matches(r, query)).sort(byRailThenNumber);

  return (
    <>
      <AppBar title={t("route.listTitle")} onBack={useBack()} />
      <div className={styles.find}>
        <FindInput value={query} onChange={setQuery} label={t("route.findRoute")} />
      </div>
      {routes.isPending ? (
        <div className={styles.find}>
          <Skeleton variant="row" />
          <Skeleton variant="row" />
        </div>
      ) : shown.length ? (
        <ul>
          {shown.map((r) => (
            <li key={r.id}>
              <ListRow
                kind="internal"
                label={routeTitle(r)}
                href={`/explore/route/${encodeURIComponent(r.id)}`}
                leading={<RouteBadge route={{ id: r.id, name: r.displayName, color: r.color, textColor: r.textColor, mode: r.type }} size="sm" />}
              />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon="search" title={t("route.noRouteMatch", { q: query })} body={t("route.noRouteMatchBody")} />
      )}
    </>
  );
}
