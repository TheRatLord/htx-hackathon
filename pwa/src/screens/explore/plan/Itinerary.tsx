// D12 My Itinerary: the timeline of one planned trip, every row tappable, with "▶ Start trip"
// pinned in the sheet footer so it is never below the fold (rule P2).

import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { useAlerts } from "../../../api/hooks.ts";
import type { Itinerary as Trip, LatLon } from "../../../api/types.ts";
import { ExploreSheet, useExploreChrome, useSheet } from "../../../app/layouts/ExploreChrome.tsx";
import { useBack } from "../../../app/useBack.ts";
import { usePageTitle } from "../../../app/usePageTitle.ts";
import { fromLabel } from "../../../features/trip/origin.ts";
import { itineraryScene, useSettledSheetHeight } from "../../../features/trip/scene.ts";
import { itineraryTimeline, type TimelineRow } from "../../../features/trip/timeline.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { formatClock } from "../../../lib/format.ts";
import { parsePlanQuery, planUrl } from "../../../lib/planQuery.ts";
import { useMapScene } from "../../../map/scene.ts";
import { usePrefs } from "../../../state/prefs.ts";
import { AlertBox } from "../../../ui/AlertBox.tsx";
import { AlertStatusLine } from "../../../ui/AlertStatusLine.tsx";
import { Button } from "../../../ui/Button.tsx";
import { EmptyState } from "../../../ui/EmptyState.tsx";
import { ErrorState } from "../../../ui/ErrorState.tsx";
import { ScheduleCaption } from "../../../ui/ScheduleCaption.tsx";
import { SheetBanner } from "../../../ui/SheetBanner.tsx";
import { SheetHeader } from "../../../ui/SheetHeader.tsx";
import { Skeleton } from "../../../ui/Skeleton.tsx";
import { StepList } from "../../../ui/StepList.tsx";
import { FareLine } from "./ItineraryCard.tsx";
import styles from "./plan.module.css";
import { usePlanResponse } from "./usePlanResponse.ts";
import { useStartTrip } from "./useStartTrip.ts";

/** Close enough to see the streets around the destination. */
const PLACE_ZOOM = 16;

function Timeline({ it, rows, onShowPlace }: { it: Trip; rows: TimelineRow[]; onShowPlace: (p: LatLon) => void }) {
  const t = useT();
  const lang = useLang();
  const navigate = useNavigate();
  const { setSnap } = useSheet();
  const alerts = useAlerts();
  const tripAlerts = alerts.source === "unavailable" ? [] : alerts.forItinerary(it);
  const last = it.legs.at(-1);
  return (
    <>
      <StepList
        steps={rows.map((r) => r.step)}
        onStepPress={(_, i) => {
          const href = rows[i].href;
          if (href) return navigate(href);
          // The final walk and the arrival have no screen of their own: show the place on the map.
          if (last) onShowPlace(last.type === "walk" ? last.to : last.alight);
          setSnap("peek");
        }}
      />
      {tripAlerts.length ? (
        tripAlerts.map((a) => (
          <AlertBox key={a.id} alert={a} lang={lang} compact demo={alerts.source === "demo"} onOpen={() => navigate(`/more/alerts/${encodeURIComponent(a.id)}`)} />
        ))
      ) : (
        <AlertStatusLine scope="trip" name={t("plan.thisTrip")} alerts={[]} />
      )}
    </>
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
  useExploreChrome({ fabs: ["locate"] });

  const plan = usePlanResponse(query, { reuse: true });
  const it = plan.response?.itineraries[Number(index)];
  const sheetH = useSettledSheetHeight();
  const scene = it ? itineraryScene(it, lang) : {};
  useMapScene(place ? { ...scene, focus: { kind: "point", point: place, zoom: PLACE_ZOOM } } : scene, [it, lang, sheetH, place]);

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
    const rows = itineraryTimeline(it, { fromName: fromLabel(query, lang) || plan.response.from.name, toName: query.toName ?? plan.response.to.name, pace: walkPace, lang });
    body = (
      <>
        {plan.response.source === "offline-fixture" && <SheetBanner kind="demo" text={t("plan.fixtureBanner")} />}
        <p className={styles.arrive}>{t("plan.arrive", { time: formatClock(it.endTime, lang), min: it.durationMin })}</p>
        <Timeline it={it} rows={rows} onShowPlace={setPlace} />
        <FareLine it={it} />
        <ScheduleCaption />
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
            <p>{t("plan.detailPeek", { min: it.durationMin })}</p>
            <Button variant="tonal" label={t("plan.start")} ariaLabel={t("plan.startA11y")} onPress={start} />
          </div>
        )
      }
      footer={it && <Button variant="primary" fullWidth label={t("plan.startTrip")} onPress={start} />}
    >
      <div className={styles.body}>{body}</div>
    </ExploreSheet>
  );
}
