// D10 Transit Center: which bay a route leaves from, a bay diagram, and departures by bay.

import { useParams, useSearchParams } from "react-router";
import { useTransitCenter } from "../../../api/hooks.ts";
import type { TransitCenterDetail } from "../../../api/types.ts";
import { useBack } from "../../../app/useBack.ts";
import { usePageTitle } from "../../../app/usePageTitle.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { formatClock, formatDistance, headsignLine, platformLabel } from "../../../lib/format.ts";
import { canonicalRouteId, useRoutesLoaded } from "../../../lib/routes.ts";
import { estimateWalk } from "../../../lib/walk.ts";
import { useLocation } from "../../../state/location.tsx";
import { usePrefs } from "../../../state/prefs.ts";
import { AppBar } from "../../../ui/AppBar.tsx";
import { BayDiagram } from "../../../ui/BayDiagram.tsx";
import { Button } from "../../../ui/Button.tsx";
import { ChipRow } from "../../../ui/ChipRow.tsx";
import { DepTimes } from "../../../ui/DepTimes.tsx";
import { ErrorState } from "../../../ui/ErrorState.tsx";
import { RouteBadge } from "../../../ui/RouteBadge.tsx";
import { ScheduleCaption } from "../../../ui/ScheduleCaption.tsx";
import { SectionHeader } from "../../../ui/SectionHeader.tsx";
import { Skeleton } from "../../../ui/Skeleton.tsx";
import { UpdatedAgo } from "../../../ui/UpdatedAgo.tsx";
import { useDirectionWord } from "../route/useDirectionWord.ts";
import { departureRows, platformsOf, servesRoute, tcRoutes, type DepartureRow } from "./tcModel.ts";
import styles from "./TransitCenter.module.css";
import { usePlatformNames } from "./usePlatformNames.ts";

const bayId = (bay: string) => `bay-${bay}`;

export default function TransitCenter() {
  const t = useT();
  const { tcId = "" } = useParams();
  const tc = useTransitCenter(tcId);
  const onBack = useBack();
  usePageTitle(tc.data?.name ?? t("tc.title"));
  return (
    <>
      <AppBar title={tc.data?.name ?? t("tc.title")} onBack={onBack} />
      {tc.data ? (
        <TcBody tc={tc.data} updatedAt={tc.dataUpdatedAt} onRefresh={() => void tc.refetch()} />
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
    </>
  );
}

function TcBody({ tc, updatedAt, onRefresh }: { tc: TransitCenterDetail; updatedAt: number; onRefresh: () => void }) {
  const t = useT();
  const lang = useLang();
  const { fix } = useLocation();
  const { walkPace } = usePrefs();
  const names = usePlatformNames();
  const [params, setParams] = useSearchParams();
  useRoutesLoaded();

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

  const platforms = platformsOf(tc, names);
  const platformName = (stopId: string) => {
    const name = names.get(stopId);
    return name ? platformLabel({ id: stopId, name }, lang) : t("card.stopNumber", { id: stopId });
  };
  const routeBays = selected ? tc.bays.filter((b) => servesRoute(b, selected.id)) : [];
  const shownBays = selected ? routeBays : platforms.flatMap((p) => p.bays);
  const unassigned = departureRows(tc.unassignedDepartures, selected?.id);
  const walk = fix ? estimateWalk(fix, tc, walkPace) : undefined;
  const walkStop = routeBays[0]?.stopId ?? tc.stopIds[0];

  const onBayPress = (bay: string) => {
    if (!shownBays.some((b) => b.bay === bay)) setRoute(undefined);
    requestAnimationFrame(() => document.getElementById(bayId(bay))?.scrollIntoView({ block: "start" }));
  };

  const meta = [walk && t("tc.walkMin", { min: walk.minutes }), walk && formatDistance(walk.distanceM, lang), t("tc.bays", { count: tc.bays.length })];
  return (
    <div className={styles.page}>
      <p className={styles.meta}>{meta.filter(Boolean).join(" · ")}</p>
      <div>
        <Button
          variant="tonal"
          icon="directions_walk"
          label={t("common.walkHere")}
          href={`/explore/stop/${encodeURIComponent(walkStop)}/walk?${new URLSearchParams({
            ...(selected && { route: selected.id }),
            ...(walk && { d: String(walk.distanceM) }),
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
      <BayDiagram
        platforms={platforms.map((p) => ({
          stopId: p.stopId,
          label: t("tc.platformLabel", { platform: platformName(p.stopId), id: p.stopId }),
          bays: p.bays.map((b) => b.bay),
          routesByBay: Object.fromEntries(p.bays.map((b) => [b.bay, [...new Set(b.routes.map((r) => r.route))]])),
        }))}
        highlight={routeBays[0]?.bay}
        onBayPress={onBayPress}
      />
      {tc.source === "hand-authored-demo" && <p className={styles.note}>{tc.sourceNote ?? t("bay.handAuthored")}</p>}
      <div className={styles.list}>
        <SectionHeader tone="variant" label={t("tc.byBay")} />
        {shownBays.map((b) => (
          <BayGroup
            key={`${b.stopId}-${b.bay}`}
            id={bayId(b.bay)}
            title={t("tc.bayHeader", { bay: b.bay, platform: platformName(b.stopId) })}
            rows={departureRows(b.departures, selected?.id)}
            windowEnd={tc.windowEnd}
          />
        ))}
        {unassigned.length > 0 && <BayGroup title={t("tc.bayNotPublished")} rows={unassigned} windowEnd={tc.windowEnd} />}
      </div>
      <div className={styles.footer}>
        <UpdatedAgo at={new Date(updatedAt).toISOString()} onRefresh={onRefresh} />
        <ScheduleCaption />
        <p className={styles.source}>{tc.source === "hand-authored-demo" ? t("tc.sourceDemo") : t("tc.source")}</p>
      </div>
    </div>
  );
}

/** "Route 58 leaves from Bay M · Platform 2 (stop #79) · Next: 24 min · 84 min", one line per bay. */
function RouteBanner({ tc, routeName, routeId, platformName }: { tc: TransitCenterDetail; routeName: string; routeId: string; platformName: (stopId: string) => string }) {
  const t = useT();
  const dirWord = useDirectionWord();
  const bays = tc.bays.filter((b) => servesRoute(b, routeId));
  if (!bays.length) {
    const deps = departureRows(tc.unassignedDepartures, routeId).flatMap((r) => r.deps);
    return (
      <div className={styles.banner}>
        <p className={styles.bannerTitle}>{t("tc.notPublished", { route: routeName })}</p>
        <NextLine deps={deps} windowEnd={tc.windowEnd} />
      </div>
    );
  }
  const single = bays.length === 1;
  return (
    <div className={styles.banner}>
      <p className={styles.bannerTitle}>
        {single ? t("tc.leavesFrom", { route: routeName, bay: bays[0].bay }) : t("tc.leavesFromBays", { route: routeName, count: bays.length })}
      </p>
      {bays.map((b) => {
        const entries = b.routes.filter((r) => servesRoute({ routes: [r] }, routeId));
        const direction = `${dirWord(entries[0]?.directionLabel ?? "")} ${t("route.to", { headsign: entries.map((r) => r.headsign).join(" / ") })}`.trim();
        const deps = departureRows(b.departures, routeId).flatMap((r) => r.deps);
        return (
          <div key={`${b.stopId}-${b.bay}`} className={styles.bannerBay}>
            <p>{single ? t("card.platformLine", { platform: platformName(b.stopId), id: b.stopId }) : t("tc.bayLine", { direction, bay: b.bay })}</p>
            <NextLine deps={deps} windowEnd={tc.windowEnd} />
          </div>
        );
      })}
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
  return <p className={styles.empty}>{windowEnd ? t("tc.noDepartures", { time: formatClock(windowEnd, lang) }) : t("tc.noDeparturesYet")}</p>;
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
