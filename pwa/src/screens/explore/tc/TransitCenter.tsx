// D10 Transit Center: which bay a route leaves from, a bay diagram, and departures by bay.

import { useLayoutEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { ApiError } from "../../../api/client.ts";
import { useArrivals, useTransitCenter } from "../../../api/hooks.ts";
import type { TransitCenterDetail } from "../../../api/types.ts";
import { useBack } from "../../../app/useBack.ts";
import { usePageTitle } from "../../../app/usePageTitle.ts";
import { useLang, useT, type Lang } from "../../../i18n/index.ts";
import { directionWord, formatClock, headsignLine, platformLabel } from "../../../lib/format.ts";
import { canonicalRouteId, useRoutesLoaded } from "../../../lib/routes.ts";
import { estimateWalk, MAX_WALK_MINUTES } from "../../../lib/walk.ts";
import { useNow } from "../../../state/clock.ts";
import { useOffline } from "../../../state/offline.ts";
import { useLocation } from "../../../state/location.tsx";
import { usePrefs } from "../../../state/prefs.ts";
import { AppBar } from "../../../ui/AppBar.tsx";
import { BayDiagram } from "../../../ui/BayDiagram.tsx";
import { Button } from "../../../ui/Button.tsx";
import { ChipRow } from "../../../ui/ChipRow.tsx";
import { DepTimes } from "../../../ui/DepTimes.tsx";
import { EmptyState } from "../../../ui/EmptyState.tsx";
import { ErrorState } from "../../../ui/ErrorState.tsx";
import { Icon } from "../../../ui/Icon.tsx";
import { LiveStrip } from "../../../ui/LiveStrip.tsx";
import { RouteBadge } from "../../../ui/RouteBadge.tsx";
import { ScheduleCaption } from "../../../ui/ScheduleCaption.tsx";
import { Skeleton } from "../../../ui/Skeleton.tsx";
import { UpdatedAgo } from "../../../ui/UpdatedAgo.tsx";
import { departureRows, foldQuietBays, platformsOf, servesRoute, tcRoutes, type Bay, type DepartureRow } from "./tcModel.ts";
import styles from "./TransitCenter.module.css";

const bayId = (bay: string) => `bay-${bay}`;
/** "12:05 AM" kept on one line. */
const clockAt = (iso: string, lang: Lang) => formatClock(iso, lang).replaceAll(" ", "\u00A0");

export default function TransitCenter() {
  const t = useT();
  const navigate = useNavigate();
  const { tcId = "" } = useParams();
  const tc = useTransitCenter(tcId);
  const onBack = useBack();
  usePageTitle(tc.data?.name ?? t("tc.title"));
  const notFound = tc.error instanceof ApiError && tc.error.code === "transit_center_not_found";
  return (
    <div className={styles.screen}>
      <AppBar title={tc.data?.name ?? t("tc.title")} onBack={onBack} />
      {tc.data ? (
        <TcBody tc={tc.data} updatedAt={tc.dataUpdatedAt} onRefresh={() => void tc.refetch()} />
      ) : notFound ? (
        <EmptyState
          icon="search"
          title={t("tc.notFound", { id: tcId })}
          body={t("tc.notFoundBody")}
          action={{
            label: t("tc.search"),
            onPress: () => navigate("/explore/search"),
          }}
        />
      ) : tc.isError ? (
        <ErrorState error={tc.error} context={{ id: tcId }} onRetry={() => void tc.refetch()} />
      ) : (
        <div className={styles.page}>
          <Skeleton variant="strip" />
          <Skeleton variant="row" />
          <Skeleton variant="row" />
          <Skeleton variant="row" />
        </div>
      )}
    </div>
  );
}

function TcBody({ tc, updatedAt, onRefresh }: { tc: TransitCenterDetail; updatedAt: number; onRefresh: () => void }) {
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const { fix } = useLocation();
  const { walkPace } = usePrefs();
  const [params, setParams] = useSearchParams();
  // A tapped bay tile whose group isn't on screen yet (the route filter is being cleared).
  const [pendingBay, setPendingBay] = useState<string>();
  // The bay map is folded away until asked for, so departures come first. With a route chosen, the
  // banner already names its bay and platform, so the map stays folded there too.
  const [mapOpen, setMapOpen] = useState(false);
  useRoutesLoaded();

  useLayoutEffect(() => {
    if (!pendingBay) return;
    const target = document.getElementById(bayId(pendingBay));
    if (!target) return;
    target.scrollIntoView({ block: "start" });
    setPendingBay(undefined);
  });

  const routeParam = params.get("route");
  const routes = tcRoutes(tc);
  const selected = routeParam ? routes.find((r) => r.id === canonicalRouteId(routeParam)) : undefined;
  const setRoute = (id?: string) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (id) next.set("route", id);
        else next.delete("route");
        return next;
      },
      { replace: true },
    );

  const names = new Map(tc.platforms.flatMap((p) => (p.name ? [[p.stopId, p.name] as const] : [])));
  const platforms = platformsOf(tc, names);
  const platformName = (stopId: string) => {
    const name = names.get(stopId);
    const label = name && platformLabel({ id: stopId, name }, lang);
    // "Platform 2" comes from METRO's English stop name.
    const n = label?.match(/^Platform (\S+)$/)?.[1];
    return n ? t("tc.platform", { n }) : label || t("card.stopNumber", { id: stopId });
  };
  const routeBays = selected ? tc.bays.filter((b) => servesRoute(b, selected.id)) : [];
  const offline = useOffline();
  // The chosen route's strip (one bay) reads live arrivals; this is the same query, shared with the banner.
  const stripBay = routeBays.length === 1 ? routeBays[0] : undefined;
  const strip = useArrivals(stripBay?.stopId ?? "", { route: selected?.id, limit: 4, enabled: Boolean(stripBay) });
  // Any live time on the page decides whether the footer needs "…unless marked Live".
  const hasLive =
    [...tc.bays.flatMap((b) => b.departures), ...tc.unassignedDepartures].some((d) => d.isRealtime) ||
    Boolean(stripBay && strip.data?.arrivals.some((d) => d.isRealtime));
  const shownBays = selected ? routeBays : platforms.flatMap((p) => p.bays);
  const unassigned = departureRows(tc.unassignedDepartures, now, selected?.id);
  const walk = fix ? estimateWalk(fix, tc, walkPace) : undefined;
  const walkBay = routeBays[0] ?? tc.bays.find((b) => b.stopId === tc.stopIds[0]);
  const walkStop = walkBay?.stopId ?? tc.stopIds[0];
  // D8 starts from the distance to the platform it routes to, not to the center.
  const walkSeed = fix && walkBay ? Math.round(estimateWalk(fix, walkBay, walkPace).distanceM) : undefined;

  const onBayPress = (bay: string) => {
    if (!shownBays.some((b) => b.bay === bay)) setRoute(undefined);
    setMapOpen(true);
    setPendingBay(bay);
  };

  const items = foldQuietBays(
    shownBays.map((bay) => ({
      bay,
      rows: departureRows(bay.departures, now, selected?.id),
    })),
  );
  // A chosen route's bays are all in its banner (strip and times), so the list below would only repeat them.
  const showList = !selected || !routeBays.length;
  // With a route chosen, the diagram shrinks to the platforms it leaves from, with its bay lit.
  const diagramPlatforms = selected && routeBays.length ? platforms.filter((p) => routeBays.some((b) => b.stopId === p.stopId)) : platforms;
  const diagramShown = mapOpen;
  const bayLetters = (bays: Bay[]) => (bays.length > 1 ? `${bays[0].bay}–${bays.at(-1)!.bay}` : (bays[0]?.bay ?? ""));
  return (
    <div className={styles.page}>
      {/* Just the Walk button: the bay count told the rider nothing they could act on. */}
      <div className={styles.metaRow}>
        <Button
          variant="tonal"
          icon="directions_walk"
          label={walk && walk.minutes <= MAX_WALK_MINUTES ? t("tc.walkHereMin", { min: walk.minutes }) : t("common.walkHere")}
          href={`/explore/stop/${encodeURIComponent(walkStop)}/walk?${new URLSearchParams({
            ...(selected && { route: selected.id }),
            ...(walkSeed !== undefined && { d: String(walkSeed) }),
          })}`}
        />
      </div>
      <div className={styles.bleed}>
        <ChipRow label={t("tc.findRoute")} ariaLabel={t("tc.findRoute")}>
          {routes.map((r) => (
            <RouteBadge key={r.id} route={r} size="md" selected={r.id === selected?.id} onPress={() => setRoute(r.id === selected?.id ? undefined : r.id)} />
          ))}
        </ChipRow>
      </div>
      {selected && <RouteBanner tc={tc} routeName={selected.name} routeId={selected.id} platformName={platformName} />}
      <button type="button" className={styles.mapToggle} aria-expanded={mapOpen} onClick={() => setMapOpen((o) => !o)}>
        <span>{t(mapOpen ? "tc.hideBayMap" : "tc.showBayMap")}</span>
        <Icon name={mapOpen ? "expand_less" : "expand_more"} />
      </button>
      {diagramShown && (
        <BayDiagram
          platforms={diagramPlatforms.map((p) => ({
            stopId: p.stopId,
            // "Platform 1 · Bays C–I": riders find a platform by its bay letters, not its stop number.
            label: t("tc.platformBays", {
              platform: platformName(p.stopId),
              bays: bayLetters(p.bays),
            }),
            spokenName: platformName(p.stopId),
            bays: p.bays.map((b) => b.bay),
            routesByBay: Object.fromEntries(p.bays.map((b) => [b.bay, [...new Set(b.routes.map((r) => r.route))]])),
          }))}
          highlight={routeBays.map((b) => ({ stopId: b.stopId, bay: b.bay }))}
          onBayPress={onBayPress}
        />
      )}
      {tc.source === "hand-authored-demo" && <p className={styles.note}>{t("bay.handAuthored")}</p>}
      {showList && (
        <div className={styles.list}>
          {items.map((item) =>
            item.kind === "bay" ? (
              <BayGroup
                key={`${item.bay.stopId}-${item.bay.bay}`}
                id={bayId(item.bay.bay)}
                title={t("tc.bayHeader", {
                  bay: item.bay.bay,
                  platform: platformName(item.bay.stopId),
                })}
                rows={item.rows}
                windowEnd={tc.windowEnd}
              />
            ) : (
              <QuietBays key={item.bays.map((b) => `${b.stopId}-${b.bay}`).join()} bays={item.bays} windowEnd={tc.windowEnd} />
            ),
          )}
          {unassigned.length > 0 && <BayGroup title={t("tc.bayNotPublished")} rows={unassigned} windowEnd={tc.windowEnd} />}
        </div>
      )}
      {/* One footer line, "Scheduled times · Updated just now · Refresh". The longer caption ("…unless
          marked Live") is kept for when a Live time or the offline note can be on the page. */}
      <div className={styles.footer}>
        {hasLive || offline ? (
          <>
            <UpdatedAgo at={new Date(updatedAt).toISOString()} onRefresh={onRefresh} />
            <ScheduleCaption />
          </>
        ) : (
          <p className={styles.footerLine}>
            <span>{t("tc.scheduledTimes")}</span>
            <span aria-hidden="true">·</span> <UpdatedAgo at={new Date(updatedAt).toISOString()} onRefresh={onRefresh} />
          </p>
        )}
      </div>
    </div>
  );
}

/** "Route 58 leaves from Bay M · Platform 2 (stop #79) · Next: 24 min · 84 min", one line per bay. */
function RouteBanner({
  tc,
  routeName,
  routeId,
  platformName,
}: {
  tc: TransitCenterDetail;
  routeName: string;
  routeId: string;
  platformName: (stopId: string) => string;
}) {
  const t = useT();
  const now = useNow();
  const lang = useLang();
  const bays = tc.bays.filter((b) => servesRoute(b, routeId));
  const depsOf = (deps: TransitCenterDetail["unassignedDepartures"]) => departureRows(deps, now, routeId).flatMap((r) => r.deps);
  if (!bays.length) {
    return (
      <div className={styles.banner}>
        <p className={styles.bannerTitle}>{t("tc.notPublished", { route: routeName })}</p>
        <NextLine deps={depsOf(tc.unassignedDepartures)} windowEnd={tc.windowEnd} />
      </div>
    );
  }
  const single = bays.length === 1;
  if (single)
    return <SingleBayBanner tc={tc} bay={bays[0]} routeName={routeName} routeId={routeId} platformName={platformName} fallback={depsOf(bays[0].departures)} />;
  return (
    <div className={styles.banner}>
      <p className={styles.bannerTitle}>
        {single
          ? t("tc.leavesFrom", { route: routeName, bay: bays[0].bay })
          : t("tc.leavesFromBays", {
              route: routeName,
              count: bays.length,
              bays: bays.map((b) => b.bay).join(", "),
            })}
      </p>
      {bays.map((b) => {
        const entries = b.routes.filter((r) => servesRoute({ routes: [r] }, routeId));
        const direction =
          `${directionWord(entries[0]?.directionLabel ?? "", lang)} ${t("route.to", { headsign: entries.map((r) => r.headsign).join(" / ") })}`.trim();
        return (
          <div key={`${b.stopId}-${b.bay}`} className={styles.bannerBay}>
            <p>
              {single
                ? t("card.platformLine", {
                    platform: platformName(b.stopId),
                    id: b.stopId,
                  })
                : t("tc.bayLine", { direction, bay: b.bay })}
            </p>
            <NextLine deps={depsOf(b.departures)} windowEnd={tc.windowEnd} />
          </div>
        );
      })}
    </div>
  );
}

/**
 * "Route 58 leaves from Bay M · Platform 2", then the familiar blue strip with up to 4 times for that
 * bay's stop and the stop sheet's actions (Full Schedule, Stop details).
 */
function SingleBayBanner({
  tc,
  bay,
  routeName,
  routeId,
  platformName,
  fallback,
}: {
  tc: TransitCenterDetail;
  bay: Bay;
  routeName: string;
  routeId: string;
  platformName: (stopId: string) => string;
  fallback: DepartureRow["deps"];
}) {
  const t = useT();
  const arrivals = useArrivals(bay.stopId, { route: routeId, limit: 4 });
  const now = useNow();
  // A scheduled bus whose time has passed is gone; it would show as a clock time next to minutes.
  const ahead = (list: DepartureRow["deps"]) => list.filter((d) => d.isRealtime || Date.parse(d.departureTime) > now);
  const live = arrivals.data && ahead(arrivals.data.arrivals);
  const deps = live && live.length ? live : ahead(fallback);
  const stop = encodeURIComponent(bay.stopId);
  const route = encodeURIComponent(routeId);
  return (
    <div className={styles.banner}>
      <div>
        <p className={styles.bannerTitle}>{t("tc.leavesFrom", { route: routeName, bay: bay.bay })}</p>
        <p>
          {t("card.platformLine", {
            platform: platformName(bay.stopId),
            id: bay.stopId,
          })}
        </p>
      </div>
      {deps.length || arrivals.isPending ? (
        <LiveStrip deps={deps} loading={arrivals.isPending && !fallback.length} />
      ) : (
        <NoDepartures windowEnd={tc.windowEnd} />
      )}
      <div className={styles.bannerActions}>
        <Button variant="tonal" icon="calendar_month" label={t("tc.schedule")} href={`/explore/stop/${stop}/schedule?route=${route}`} />
        <Button variant="tonal" icon="bus_stop" label={`${t("route.stopDetails")} ›`} href={`/explore/stop/${stop}?route=${route}`} />
      </div>
    </div>
  );
}

function NextLine({ deps, windowEnd }: { deps: DepartureRow["deps"]; windowEnd: string | null }) {
  const t = useT();
  if (!deps.length) return <NoDepartures windowEnd={windowEnd} />;
  return (
    <p className={styles.next}>
      <span className={styles.nextLabel}>{t("tc.next")}</span> <DepTimes deps={deps} />
    </p>
  );
}

/** The claim covers exactly the window the server looked at (`windowEnd`). */
function NoDepartures({ windowEnd }: { windowEnd: string | null }) {
  const t = useT();
  const lang = useLang();
  return <p className={styles.empty}>{windowEnd ? t("tc.noDepartures", { time: clockAt(windowEnd, lang) }) : t("tc.noDeparturesYet")}</p>;
}

/** "Bays I, K, L: no departures before 11:43 PM", instead of one identical group per quiet bay. */
function QuietBays({ bays, windowEnd }: { bays: Bay[]; windowEnd: string | null }) {
  const t = useT();
  const lang = useLang();
  const list = bays.map((b) => b.bay).join(", ");
  return (
    <section className={styles.bay}>
      {/* Bay tiles scroll to their group; these bays share this one. */}
      {bays.map((b) => (
        <span key={b.bay} id={bayId(b.bay)} className={styles.anchor} />
      ))}
      <p className={styles.empty}>{windowEnd ? t("tc.quietBays", { bays: list, time: clockAt(windowEnd, lang) }) : t("tc.quietBaysYet", { bays: list })}</p>
    </section>
  );
}

function BayGroup({ id, title, rows, windowEnd }: { id?: string; title: string; rows: DepartureRow[]; windowEnd: string | null }) {
  const lang = useLang();
  return (
    <section id={id} className={styles.bay}>
      <h3 className={styles.bayTitle}>{title}</h3>
      {rows.length ? (
        <ul>
          {rows.map((r) => (
            <li key={`${r.route.id}-${r.directionLabel}-${r.headsign}`} className={styles.row}>
              <RouteBadge route={r.route} size="sm" />
              <span className={styles.rowText}>
                <span className={styles.headsign}>{headsignLine(r.route, r.directionLabel, r.headsign, lang)}</span>
                <DepTimes deps={r.deps} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <NoDepartures windowEnd={windowEnd} />
      )}
    </section>
  );
}
