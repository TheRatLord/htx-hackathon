// D11 Plan Your Trip + Select Itinerary: the familiar form while a field is missing (or `edit=1`),
// then the results with the form collapsed to one summary row, opened at full.

import { useEffect, useRef, type ReactNode } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router";
import { useSearch } from "../../../api/hooks.ts";
import type { Itinerary, TransitLeg } from "../../../api/types.ts";
import { ExploreSheet, useExploreChrome, useSheet } from "../../../app/layouts/ExploreChrome.tsx";
import { useBack } from "../../../app/useBack.ts";
import { usePageTitle } from "../../../app/usePageTitle.ts";
import { fromIsRider, fromLabel } from "../../../features/trip/origin.ts";
import { itineraryScene } from "../../../features/trip/scene.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { formatClock } from "../../../lib/format.ts";
import { formatLatLon, parseLatLon } from "../../../lib/geo.ts";
import { parsePlanQuery, PLAN_SORTS, planUrl, type PlanQuery, type PlanSort } from "../../../lib/planQuery.ts";
import { useMapScene, type MapScene } from "../../../map/scene.ts";
import { isOff, useLocation as useRider } from "../../../state/location.tsx";
import { Button } from "../../../ui/Button.tsx";
import { ErrorState } from "../../../ui/ErrorState.tsx";
import { Icon } from "../../../ui/Icon.tsx";
import { ScheduleCaption } from "../../../ui/ScheduleCaption.tsx";
import { SheetHeader } from "../../../ui/SheetHeader.tsx";
import { Skeleton } from "../../../ui/Skeleton.tsx";
import { ItineraryCard, SharedAlerts, useSharedAlerts } from "./ItineraryCard.tsx";
import { FromToBox, PlacePicks, usePlacePicks, useWhenText, WhenRow, type FromView } from "./PlanForm.tsx";
import styles from "./plan.module.css";
import { sortItineraries } from "./sortItineraries.ts";
import { isReady, planKey, usePlanResponse } from "./usePlanResponse.ts";
import { useStartTrip } from "./useStartTrip.ts";

const LATER_MS = 30 * 60_000;

/** The landmark's own bus stop ("bus stop #10567"), when the destination is a landmark with one. */
function useLandmarkStop(query: PlanQuery): string | undefined {
  const id = query.to?.startsWith("landmark:") ? query.to.slice("landmark:".length) : undefined;
  const search = useSearch(id ? (query.toName ?? "") : "");
  const landmark = search.data?.results.find((r) => r.type === "landmark" && r.id === id);
  return landmark?.nearbyStops?.[0]?.id;
}

/** The sort as a small "Arrives first ▾" on the summary's last row: no row of its own (22-360). */
function SortPicker({ sort, onChange }: { sort: PlanSort; onChange: (s: PlanSort) => void }) {
  const t = useT();
  return (
    <select
      className={styles.sort}
      value={sort}
      onChange={(e) => onChange(e.target.value as PlanSort)}
      onClick={(e) => e.stopPropagation()}
      aria-label={t("plan.sort.label")}
    >
      {PLAN_SORTS.map((s) => (
        <option key={s} value={s}>
          {t(`plan.sort.${s}`)}
        </option>
      ))}
    </select>
  );
}

/**
 * "● My location → 📍 Hobby Airport" / "Bus stop #10567 is at Hobby Airport" / "Leave now · Edit ›"
 * with the sort at the right of that row. The card edits on a tap anywhere but the sort; its one
 * focusable button is "Edit ›".
 */
function Summary({ query, onEdit, sort }: { query: PlanQuery; onEdit: () => void; sort?: ReactNode }) {
  const t = useT();
  const lang = useLang();
  const when = useWhenText(query);
  const stopId = useLandmarkStop(query);
  const from = fromIsRider(query) ? t("plan.myLocationShort") : fromLabel(query, lang);
  const to = query.toName ?? query.to ?? "";
  return (
    // Mouse and touch convenience only: the "Edit ›" button below is the accessible control.
    <div className={styles.summary} onClick={onEdit}>
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
      {/* J2.3: the trip ends at the landmark's own bus stop, which is at its door (the last walk is 0 m). */}
      {stopId && <span className={styles.variant}>{t("plan.landmarkStop", { id: stopId, place: to })}</span>}
      <span className={styles.summaryWhen}>
        <button
          type="button"
          className={styles.summaryEdit}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          aria-label={t("plan.summaryA11y", { from, to, when })}
        >
          <span>{when}</span>
          <span className={styles.editLink}>{t("common.edit")} ›</span>
        </button>
        {sort}
      </span>
    </div>
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
  const shared = useSharedAlerts(response?.itineraries ?? []);
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
    list = (
      <>
        <SharedAlerts list={shared.list} unavailable={shared.unavailable} />
        {sortItineraries(response.itineraries, query.sort).map(({ it, index }) => (
          <ItineraryCard key={it.id} it={it} href={planUrl(query, { index })} sharedAlerts={shared.ids} />
        ))}
      </>
    );
  return (
    <>
      {list}
      {response?.itineraries.length ? (
        <>
          <ScheduleCaption />
          <p className={styles.caption}>{t("plan.fareNote")}</p>
          {/* Sample (offline) trips are said once, in small print at the end, not above the answer. */}
          {sample && <p className={styles.caption}>{t("plan.fixtureNote")}</p>}
        </>
      ) : null}
    </>
  );
}

/** The collapsed sheet: card 1 in one line with ( ▶ Start ), so Start is there while looking at the map. */
function Peek({ it, toName, onStart }: { it: Itinerary; toName: string; onStart: () => void }) {
  const t = useT();
  const lang = useLang();
  // "leaves" means the bus here, as on the card, never the start of the walk.
  const ride = it.legs.find((l): l is TransitLeg => l.type === "transit");
  return (
    <div className={styles.peek}>
      <p>
        {t("plan.peek", { place: toName, min: it.durationMin })}
        {ride && (
          <span className={styles.peekLine}>
            {t("plan.peekLeaves", { route: ride.route.name })} <span className={styles.nowrap}>{formatClock(ride.departureTime, lang)}</span>
          </span>
        )}
      </p>
      <Button variant="primary" label={t("plan.start")} ariaLabel={t("plan.startA11y")} onPress={onStart} />
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
  // The planner has its own From / To fields: a second search field on the map would compete.
  useExploreChrome({ fabs: ["locate"], hideSearchBar: true });

  const change = (q: PlanQuery, toEdit = edit) => navigate(planUrl(q, { edit: toEdit }), { replace: true });
  const pick = (field: "from" | "to") => navigate(`/explore/search?pick=${field}&returnTo=${encodeURIComponent(planUrl(query))}`);

  // From defaults to the rider's location, frozen at the first fix, so the plan runs as soon as it
  // arrives. It has no name in the URL: it is shown as "My current location" in the current language.
  const fix = rider.fix;
  const needsFrom = !query.from;
  useEffect(() => {
    if (needsFrom && fix) change({ ...query, from: formatLatLon(fix), fromName: undefined });
    // `query` and `change` are rebuilt from the URL each render; the fix arriving is the trigger.
  }, [needsFrom, fix]);

  // The planner starts from the rider, so it asks (once) for a location nobody has asked for yet.
  const askedFix = useRef(false);
  useEffect(() => {
    if (askedFix.current || !needsFrom || rider.status !== "prompt" || rider.requested) return;
    askedFix.current = true;
    rider.request();
  }, [needsFrom, rider.status, rider.requested, rider.request]);

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
  useMapScene(first ? itineraryScene(first, lang) : endpointsScene(query), [first, query.from, query.to, lang]);

  // Only denied and unavailable are "off"; a location not asked for yet is still being found (C.17).
  const fromView: FromView = query.from ? { kind: "place", name: fromLabel(query, lang) } : isOff(rider.status) ? { kind: "off" } : { kind: "finding" };

  const swap = () =>
    change({ ...query, from: query.to, fromName: query.toName, to: query.from, toName: query.from ? query.fromName : undefined });

  const start = useStartTrip(response);
  const picks = usePlacePicks(query);

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
        {results ? (
          <>
            <Summary
              query={query}
              onEdit={() => change(query, true)}
              sort={
                // Nothing to sort while loading, empty or with one trip.
                (response?.itineraries.length ?? 0) > 1 && (
                  <SortPicker sort={query.sort ?? "soonest"} onChange={(s) => change({ ...query, sort: s === "soonest" ? undefined : s })} />
                )
              }
            />
            {resultsList}
          </>
        ) : (
          <>
            <FromToBox query={query} from={fromView} onPick={pick} onSwap={swap} onClearTo={() => change({ ...query, to: undefined, toName: undefined })} />
            <WhenRow query={query} onChange={(q) => change(q)} />
            {!query.to && <PlacePicks picks={picks} onPick={(p) => change({ ...query, to: p.to, toName: p.toName }, false)} />}
            {fromView.kind === "off" && (
              <>
                {rider.status === "unavailable" && <Button variant="text" icon="my_location" label={t("banner.turnOnLocation")} onPress={rider.request} />}
                <Button variant="primary" fullWidth disabled label={t("plan.planMyTrip")} disabledReason={t("plan.chooseStartFirst")} />
              </>
            )}
            {/* Editing a planned trip: the list steps aside, and one button brings it back (chips re-plan as they are tapped). */}
            {ready && <Button variant="primary" fullWidth label={t("plan.showTrips")} onPress={() => change(query, false)} />}
          </>
        )}
      </div>
    </ExploreSheet>
  );
}
