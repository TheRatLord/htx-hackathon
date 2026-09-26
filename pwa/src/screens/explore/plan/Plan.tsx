// D11 Plan Your Trip + Select Itinerary: the familiar form while a field is missing (or `edit=1`),
// then the results with the form collapsed to one summary row, opened at full.

import { useEffect, useRef } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router";
import { useSearch } from "../../../api/hooks.ts";
import type { Itinerary } from "../../../api/types.ts";
import { ExploreSheet, useExploreChrome, useSheet } from "../../../app/layouts/ExploreChrome.tsx";
import { useBack } from "../../../app/useBack.ts";
import { usePageTitle } from "../../../app/usePageTitle.ts";
import { itineraryScene, useSettledSheetHeight } from "../../../features/trip/scene.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { formatClock } from "../../../lib/format.ts";
import { formatLatLon, parseLatLon } from "../../../lib/geo.ts";
import { parsePlanQuery, planUrl, type PlanQuery, type PlanSort } from "../../../lib/planQuery.ts";
import { useMapScene, type MapScene } from "../../../map/scene.ts";
import { isOff, useLocation as useRider } from "../../../state/location.tsx";
import { tripActions } from "../../../state/trip.ts";
import { Button } from "../../../ui/Button.tsx";
import { ErrorState } from "../../../ui/ErrorState.tsx";
import { FilterChip } from "../../../ui/FilterChip.tsx";
import { Icon } from "../../../ui/Icon.tsx";
import { ScheduleCaption } from "../../../ui/ScheduleCaption.tsx";
import { SheetBanner } from "../../../ui/SheetBanner.tsx";
import { SheetHeader } from "../../../ui/SheetHeader.tsx";
import { Skeleton } from "../../../ui/Skeleton.tsx";
import { ItineraryCard } from "./ItineraryCard.tsx";
import { FromToBox, TimeChips, useWhenText, type FromView } from "./PlanForm.tsx";
import styles from "./plan.module.css";
import { sortItineraries } from "./sortItineraries.ts";
import { isReady, planKey, usePlanResponse } from "./usePlanResponse.ts";

const SORTS: PlanSort[] = ["soonest", "transfers", "walk"];
const LATER_MS = 30 * 60_000;

/** "To the bus stop at Hobby Airport (#10567)." when the destination is a landmark with its own stop. */
function LandmarkNote({ query }: { query: PlanQuery }) {
  const t = useT();
  const id = query.to?.startsWith("landmark:") ? query.to.slice("landmark:".length) : undefined;
  const search = useSearch(id ? (query.toName ?? "") : "");
  const landmark = search.data?.results.find((r) => r.type === "landmark" && r.id === id);
  const stop = landmark?.nearbyStops?.[0];
  if (!landmark || !stop) return null;
  return <p className={styles.variant}>{t("plan.landmarkNote", { place: landmark.title, id: stop.id })}</p>;
}

function Summary({ query, onEdit }: { query: PlanQuery; onEdit: () => void }) {
  const t = useT();
  const when = useWhenText(query);
  const from = query.fromName === t("common.myLocation") ? t("plan.myLocationShort") : (query.fromName ?? query.from ?? "");
  const to = query.toName ?? query.to ?? "";
  return (
    <button type="button" className={styles.summary} onClick={onEdit} aria-label={t("plan.summaryA11y", { from, to, when })}>
      <span className={styles.summaryPlaces}>
        <span>
          <span className={styles.smallDot} />
          {from}
        </span>
        <span>
          → <Icon name="place" size={20} color="var(--c-dest-pin)" />
          {to}
        </span>
      </span>
      <span className={styles.summaryWhen}>
        <span>{when}</span>
        <span>{t("common.edit")} ›</span>
      </span>
    </button>
  );
}

interface ResultsProps {
  query: PlanQuery;
  plan: ReturnType<typeof usePlanResponse>;
  onChange: (q: PlanQuery, edit?: boolean) => void;
  onPickFrom: () => void;
}

function Results({ query, plan, onChange, onPickFrom }: ResultsProps) {
  const t = useT();
  const lang = useLang();
  const { response } = plan;
  const sample = response?.source === "offline-fixture";
  let list;
  if (plan.error) list = <ErrorState error={plan.error} onRetry={plan.retry} />;
  else if (!response)
    list = (
      <>
        <p className={styles.status} role="status">
          {t("plan.finding")}
        </p>
        <Skeleton variant="stop-card" />
        <Skeleton variant="stop-card" />
      </>
    );
  else if (!response.itineraries.length)
    list = (
      <>
        <p className={styles.status}>{t("plan.none")}</p>
        {lang === "en" && response.message && <p className={styles.variant}>{response.message}</p>}
        <div className={styles.stack}>
          <Button
            variant="tonal"
            label={t("plan.later")}
            onPress={() => onChange({ ...query, time: new Date((query.time ? Date.parse(query.time) : Date.now()) + LATER_MS).toISOString() })}
          />
          <Button variant="tonal" label={t("plan.nearbyStop")} onPress={onPickFrom} />
          <Button variant="tonal" label={t("plan.editTrip")} onPress={() => onChange(query, true)} />
        </div>
      </>
    );
  else
    list = sortItineraries(response.itineraries, query.sort).map(({ it, index }) => (
      <ItineraryCard key={it.id} it={it} sample={sample} href={planUrl(query, { index })} />
    ));
  return (
    <>
      <div className={styles.chipsScroll} role="group" aria-label={t("plan.sort.label")}>
        {SORTS.map((s) => (
          <FilterChip
            key={s}
            label={t(`plan.sort.${s}`)}
            selected={(query.sort ?? "soonest") === s}
            onPress={() => onChange({ ...query, sort: s === "soonest" ? undefined : s })}
          />
        ))}
      </div>
      {list}
      {response?.itineraries.length ? (
        <>
          <ScheduleCaption />
          <p className={styles.caption}>{t("plan.fareNote")}</p>
        </>
      ) : null}
    </>
  );
}

/** The collapsed sheet: card 1 in one line with ( ▶ Start ), so Start is there while looking at the map. */
function Peek({ it, toName, onStart }: { it: Itinerary; toName: string; onStart: () => void }) {
  const t = useT();
  const lang = useLang();
  return (
    <div className={styles.peek}>
      <p>{t("plan.peek", { place: toName, min: it.durationMin, time: formatClock(it.startTime, lang) })}</p>
      <Button variant="tonal" label={t("plan.start")} ariaLabel={t("plan.startA11y")} onPress={onStart} />
    </div>
  );
}

function endpointsScene(query: PlanQuery): MapScene {
  const from = parseLatLon(query.from);
  const to = parseLatLon(query.to);
  const markers: NonNullable<MapScene["markers"]> = [
    ...(from ? [{ id: "origin", point: from, kind: "origin" as const }] : []),
    ...(to ? [{ id: "destination", point: to, kind: "destination" as const }] : []),
  ];
  if (from && to) return { markers, focus: { kind: "bounds", bounds: [from, to] } };
  const one = from ?? to;
  return one ? { markers, focus: { kind: "point", point: one } } : {};
}

export default function Plan() {
  const t = useT();
  const lang = useLang();
  const navigate = useNavigate();
  const navType = useNavigationType();
  const { search } = useLocation();
  const rider = useRider();
  const { setSnap } = useSheet();
  const onBack = useBack();
  const params = new URLSearchParams(search);
  const query = parsePlanQuery(params);
  const edit = params.get("edit") === "1";
  const ready = isReady(query);
  const results = ready && !edit;
  const title = t(results ? "plan.resultsTitle" : "plan.title");
  usePageTitle(title);
  useExploreChrome({ fabs: ["locate"] });

  const change = (q: PlanQuery, toEdit = edit) => navigate(planUrl(q, { edit: toEdit }), { replace: true });
  const pick = (field: "from" | "to") => navigate(`/explore/search?pick=${field}&returnTo=${encodeURIComponent(planUrl(query))}`);

  // From defaults to the rider's location, frozen at the first fix, so the plan runs as soon as it arrives.
  const fix = rider.fix;
  const needsFrom = !query.from;
  useEffect(() => {
    if (needsFrom && fix) change({ ...query, from: formatLatLon(fix), fromName: t("common.myLocation") });
    // `query` and `change` are rebuilt from the URL each render; the fix arriving is the trigger.
  }, [needsFrom, fix]);

  // The Plan Trip FAB opens the planner with no destination: go straight to choosing one.
  const askedTo = useRef(false);
  useEffect(() => {
    if (askedTo.current || query.to || navType !== "PUSH") return;
    askedTo.current = true;
    pick("to");
    // Mount only: coming back from search (POP) must not reopen it.
  }, []);

  const plan = usePlanResponse(query);
  const { response } = plan;
  const resultKey = results && response ? JSON.stringify(planKey(query)) : "";
  useEffect(() => {
    if (resultKey) setSnap("full");
  }, [resultKey, setSnap]);

  const first = response ? sortItineraries(response.itineraries, query.sort)[0]?.it : undefined;
  const sheetH = useSettledSheetHeight();
  useMapScene(first ? itineraryScene(first, lang) : endpointsScene(query), [first, query.from, query.to, lang, sheetH]);

  const fromView: FromView = query.from
    ? { kind: "place", name: query.fromName ?? query.from }
    : isOff(rider.status) || (rider.status === "prompt" && !rider.requested)
      ? { kind: "off" }
      : { kind: "finding" };

  const swap = () =>
    change({ ...query, from: query.to, fromName: query.toName, to: query.from, toName: query.from ? query.fromName : undefined });

  const start = (it: Itinerary) => {
    tripActions.start(it);
    navigate("/explore/trip");
  };

  const resultsList = ready && (
    <Results query={query} plan={plan} onChange={change} onPickFrom={() => pick("from")} />
  );

  return (
    <ExploreSheet
      ariaLabel={title}
      onBack={onBack}
      header={<SheetHeader title={title} />}
      peek={first && <Peek it={first} toName={query.toName ?? ""} onStart={() => start(first)} />}
    >
      <div className={styles.body}>
        {response?.source === "offline-fixture" && <SheetBanner kind="demo" text={t("plan.fixtureBanner")} />}
        {results ? (
          <>
            <Summary query={query} onEdit={() => change(query, true)} />
            <LandmarkNote query={query} />
          </>
        ) : (
          <>
            <FromToBox query={query} from={fromView} onPick={pick} onSwap={swap} />
            <TimeChips query={query} onChange={(q) => change(q)} />
            {fromView.kind === "off" && (
              <>
                {!rider.requested && <Button variant="text" icon="my_location" label={t("banner.turnOnLocation")} onPress={rider.request} />}
                <Button variant="primary" fullWidth disabled label={t("plan.planMyTrip")} disabledReason={t("plan.chooseStartFirst")} />
              </>
            )}
          </>
        )}
        {resultsList}
      </div>
    </ExploreSheet>
  );
}
