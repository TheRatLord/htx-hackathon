// D12 My Itinerary: the timeline of one planned trip, every row tappable, with "▶ Start trip"
// pinned in the sheet footer so it is never below the fold (rule P2).

import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { useAlerts } from "../../../api/hooks.ts";
import type { Alert, Itinerary as Trip, LatLon } from "../../../api/types.ts";
import { ExploreSheet, useExploreChrome, useSheet } from "../../../app/layouts/ExploreChrome.tsx";
import { useBack } from "../../../app/useBack.ts";
import { usePageTitle } from "../../../app/usePageTitle.ts";
import { fromIsRider, fromLabel } from "../../../features/trip/origin.ts";
import { itineraryScene } from "../../../features/trip/scene.ts";
import { itineraryTimeline, type TimelineRow } from "../../../features/trip/timeline.ts";
import { useLang, useT, type Lang } from "../../../i18n/index.ts";
import { alertsForItinerary, alertText, effectWord } from "../../../lib/alerts.ts";
import { formatClock } from "../../../lib/format.ts";
import { parsePlanQuery, planUrl } from "../../../lib/planQuery.ts";
import { useMapScene } from "../../../map/scene.ts";
import { usePrefs } from "../../../state/prefs.ts";
import { walkMinutes } from "../../../lib/walk.ts";
import { AlertStatusLine } from "../../../ui/AlertStatusLine.tsx";
import { Button } from "../../../ui/Button.tsx";
import { EmptyState } from "../../../ui/EmptyState.tsx";
import { ErrorState } from "../../../ui/ErrorState.tsx";
import { ScheduleCaption } from "../../../ui/ScheduleCaption.tsx";
import { SheetHeader } from "../../../ui/SheetHeader.tsx";
import { Skeleton } from "../../../ui/Skeleton.tsx";
import { StepList } from "../../../ui/StepList.tsx";
import type { TimelineStep } from "../../../ui/types.ts";
import { FareLine } from "./ItineraryCard.tsx";
import styles from "./plan.module.css";
import { usePlanResponse } from "./usePlanResponse.ts";
import { useStartTrip } from "./useStartTrip.ts";

/** Close enough to see the streets around the destination. */
const PLACE_ZOOM = 16;

/**
 * C.13: the trip's alerts as timeline rows, each under the boarding row of the first ride it
 * touches (its route, or its board or get-off stop).
 */
function withAlertRows(it: Trip, rows: TimelineRow[], alerts: Alert[], demo: boolean, lang: Lang): { step: TimelineStep; href?: string }[] {
  const placed = new Set<string>();
  return rows.flatMap((row) => {
    const leg = it.legs[row.legIndex];
    if (row.role !== "board" || leg?.type !== "transit") return [row];
    const own = alertsForItinerary(alerts, { ...it, legs: [leg] }).filter((a) => !placed.has(a.id));
    own.forEach((a) => placed.add(a.id));
    return [
      row,
      ...own.map((a) => ({
        step: { kind: "ride" as const, title: `${effectWord(a.effect, lang)}: ${alertText(a, "header", lang).text}`, lines: [], alert: a, demo, legColor: leg.route.color },
        href: `/more/alerts/${encodeURIComponent(a.id)}`,
      })),
    ];
  });
}

function Timeline({ it, rows, onShowPlace }: { it: Trip; rows: TimelineRow[]; onShowPlace: (p: LatLon) => void }) {
  const t = useT();
  const lang = useLang();
  const navigate = useNavigate();
  const { setSnap } = useSheet();
  const alerts = useAlerts();
  const tripAlerts = alerts.source === "unavailable" ? [] : alerts.forItinerary(it);
  const items = withAlertRows(it, rows, tripAlerts, alerts.source === "demo", lang);
  const last = it.legs.at(-1);
  return (
    <>
      <StepList
        steps={items.map((r) => r.step)}
        onStepPress={(_, i) => {
          const href = items[i].href;
          if (href) return navigate(href);
          // The final walk and the arrival have no screen of their own: show the place on the map.
          if (last) onShowPlace(last.type === "walk" ? last.to : last.alight);
          setSnap("peek");
        }}
      />
      {!tripAlerts.length && <AlertStatusLine scope="trip" name={t("plan.thisTrip")} alerts={[]} />}
    </>
  );
}

/** The peek's second line: what to do first, "Walk 5 min · 80 leaves 12:15 PM" (the clock never breaks). */
export function FirstAction({ it }: { it: Trip }) {
  const t = useT();
  const lang = useLang();
  const { walkPace } = usePrefs();
  const i = it.legs.findIndex((l) => l.type === "transit");
  const ride = it.legs[i];
  if (ride?.type !== "transit") return null;
  const walkM = it.legs.slice(0, i).reduce((m, l) => m + (l.type === "walk" ? l.distanceM : 0), 0);
  const leaves = t("plan.firstRide", { route: ride.route.name });
  const clock = formatClock(ride.departureTime, lang);
  return (
    <span className={styles.peekLine}>
      {walkM >= 5 ? `${t("plan.firstWalk", { min: walkMinutes(walkM, walkPace) })} · ${leaves} ` : `${leaves} `}
      <span className={styles.nowrap}>{clock}</span>
    </span>
  );
}

export default function Itinerary() {
  const t = useT();
  const lang = useLang();
  const navigate = useNavigate();
  const { walkPace } = usePrefs();
  const [place, setPlace] = useState<LatLon>();
  const onBack = useBack();
  const { index } = useParams();
  const { search } = useLocation();
  const query = parsePlanQuery(new URLSearchParams(search));
  const title = t("plan.detailTitle");
  usePageTitle(title);
  // The trip is chosen: no search field over its map.
  useExploreChrome({ fabs: ["locate"], hideSearchBar: true });

  const plan = usePlanResponse(query, { reuse: true });
  const it = plan.response?.itineraries[Number(index)];
  const scene = it ? itineraryScene(it, lang) : {};
  useMapScene(place ? { ...scene, focus: { kind: "point", point: place, zoom: PLACE_ZOOM } } : scene, [it, lang, place]);

  const startTrip = useStartTrip(plan.response);
  const start = () => it && startTrip(it);

  let body;
  if (plan.error) body = <ErrorState error={plan.error} onRetry={plan.retry} />;
  else if (!plan.response) body = <Skeleton variant="stop-card" />;
  else if (!it)
    body = (
      <EmptyState
        icon="route_plan"
        title={t("plan.gone")}
        body={t("plan.goneBody")}
        action={{ label: `${t("plan.seeCurrent")} ›`, onPress: () => navigate(planUrl(query), { replace: true }) }}
      />
    );
  else {
    // "My location" (short), so the first row's title doesn't wrap beside its time at 360dp.
    const fromName = fromIsRider(query) ? t("plan.myLocationShort") : fromLabel(query, lang) || plan.response.from.name;
    const rows = itineraryTimeline(it, { fromName, toName: query.toName ?? plan.response.to.name, pace: walkPace, lang });
    body = (
      <>
        <p className={styles.arrive}>{t("plan.arrive", { time: formatClock(it.endTime, lang), min: it.durationMin })}</p>
        <Timeline it={it} rows={rows} onShowPlace={setPlace} />
        <FareLine it={it} />
        <ScheduleCaption />
        {plan.response.source === "offline-fixture" && <p className={styles.caption}>{t("plan.fixtureNote")}</p>}
      </>
    );
  }

  return (
    <ExploreSheet
      ariaLabel={title}
      onBack={onBack}
      header={<SheetHeader title={title} />}
      peek={
        it && (
          <div className={styles.peek}>
            <p>
              {t("plan.detailPeek", { min: it.durationMin })}
              <FirstAction it={it} />
            </p>
            <Button variant="primary" label={t("plan.start")} ariaLabel={t("plan.startA11y")} onPress={start} />
          </div>
        )
      }
      footer={it && <Button variant="primary" fullWidth label={t("plan.startTrip")} onPress={start} />}
    >
      <div className={styles.body}>{body}</div>
    </ExploreSheet>
  );
}
