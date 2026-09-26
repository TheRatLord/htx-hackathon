// D11 Plan Your Trip + Select Itinerary: the familiar form while a field is missing (or `edit=1`),
// then the results with the form collapsed to one summary row, opened at half so the selected
// option's route shows on the map above the list.

import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router";
import type { Itinerary, TransitLeg } from "../../../api/types.ts";
import { ExploreSheet, useExploreChrome, useSheet, useSheetElement } from "../../../app/layouts/ExploreChrome.tsx";
import { useBack } from "../../../app/useBack.ts";
import { usePageTitle } from "../../../app/usePageTitle.ts";
import { fromIsRider, fromLabel } from "../../../features/trip/origin.ts";
import { planScene } from "../../../features/trip/scene.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { formatClock } from "../../../lib/format.ts";
import { formatLatLon, parseLatLon } from "../../../lib/geo.ts";
import { parsePlanQuery, planUrl, type PlanQuery, type PlanSort } from "../../../lib/planQuery.ts";
import { useMapScene, type MapScene } from "../../../map/scene.ts";
import { isOff, useLocation as useRider } from "../../../state/location.tsx";
import { Button } from "../../../ui/Button.tsx";
import { ChipRow } from "../../../ui/ChipRow.tsx";
import { ErrorState } from "../../../ui/ErrorState.tsx";
import { FilterChip } from "../../../ui/FilterChip.tsx";
import { Icon } from "../../../ui/Icon.tsx";
import { ScheduleCaption } from "../../../ui/ScheduleCaption.tsx";
import { Skeleton } from "../../../ui/Skeleton.tsx";
import { ItineraryCard, SharedAlerts, useSharedAlerts } from "./ItineraryCard.tsx";
import { FromToBox, PlacePicks, usePlacePicks, useWhenText, WhenRow, type FromView } from "./PlanForm.tsx";
import { noSearchBarCap } from "../home/fold.ts";
import { useHalfUpTo } from "../home/useHalfUpTo.ts";
import { PlanHeader } from "./PlanHeader.tsx";
import styles from "./plan.module.css";
import { foldRepeats, sortItineraries } from "./sortItineraries.ts";
import { isReady, planKey, usePlanResponse } from "./usePlanResponse.ts";
import { useStartTrip } from "./useStartTrip.ts";

const LATER_MS = 30 * 60_000;

/** "landmark:…" or "lat,lon": the trip ends at a place, and the rider walks from the last bus to it. */
const toPlace = (q: PlanQuery) => Boolean(q.to && (q.to.startsWith("landmark:") || q.to.includes(",")));

/**
 * v2.71's three sort chips (22). The default, "Arrives first" (v2.71 said "Fastest"), comes first: the
 * cards show the arrival in bold and are sorted by it, so the label says what the order is. The chosen one
 * is never behind "More ›" at 360dp.
 */
const CHIP_ORDER: PlanSort[] = ["soonest", "transfers", "walk"];

function SortChips({ sort, onChange }: { sort: PlanSort; onChange: (s: PlanSort) => void }) {
  const t = useT();
  return (
    <div className={styles.sortChips}>
      <ChipRow ariaLabel={t("plan.sort.label")}>
        {CHIP_ORDER.map((s) => (
          <FilterChip key={s} label={t(`plan.sort.${s}`)} selected={sort === s} onPress={() => onChange(s)} />
        ))}
      </ChipRow>
    </div>
  );
}

/**
 * "● My location → 📍 Hobby Airport" / "Leave now · Edit ›". The card edits on a tap anywhere; its
 * one focusable button is "Edit ›".
 */
function Summary({ query, onEdit }: { query: PlanQuery; onEdit: () => void }) {
  const t = useT();
  const lang = useLang();
  const when = useWhenText(query);
  const rider = fromIsRider(query);
  const from = rider ? t("plan.myLocationShort") : fromLabel(query, lang);
  const to = query.toName ?? query.to ?? "";
  return (
    // Mouse and touch convenience only: the "Edit ›" button below is the accessible control.
    // On a short screen it is one row, and "My location →" (the default start) is left out.
    <div className={rider ? `${styles.summary} ${styles.summaryFromRider}` : styles.summary} onClick={onEdit}>
      <span className={styles.summaryPlaces}>
        <span className={styles.summaryFrom}>
          <span className={styles.smallDot} />
          {from}
        </span>
        <span className={styles.summaryTo}>
          <span className={styles.summaryFrom}>→</span> <Icon name="place" size={20} color="var(--c-dest-pin)" />
          <span className={styles.summaryToName}>{to}</span>
        </span>
      </span>
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
      </span>
    </div>
  );
}

interface ResultsProps {
  query: PlanQuery;
  plan: ReturnType<typeof usePlanResponse>;
  selectedId: string | undefined;
  onSelect: (it: Itinerary) => void;
  onChange: (q: PlanQuery, edit?: boolean) => void;
  onPickFrom: () => void;
}

function Results({ query, plan, selectedId, onSelect, onChange, onPickFrom }: ResultsProps) {
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
        {foldRepeats(sortItineraries(response.itineraries, query.sort)).map(({ first: { it, index }, later }) => (
          <ItineraryCard
            key={it.id}
            it={it}
            href={planUrl(query, { index })}
            selected={it.id === selectedId}
            onSelect={() => onSelect(it)}
            sharedAlerts={shared.ids}
            toPlace={toPlace(query)}
            later={later.map((l) => ({ it: l.it, href: planUrl(query, { index: l.index }) }))}
          />
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
  const { snap, setSnap } = useSheet();
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
    if (resultKey) setSnap("half");
  }, [resultKey, setSnap]);
  // The form opens with the sheet up, so the places to tap show above the nav, not an empty map (21).
  const form = !results;
  useEffect(() => {
    if (form) setSnap("full");
  }, [form, setSnap]);

  // The option drawn on the map: the one the rider tapped, else the top card. A new plan or a new sort
  // order starts again from the top card.
  const sorted = response ? sortItineraries(response.itineraries, query.sort) : [];
  const [picked, setPicked] = useState<{ key: string; id: string }>();
  const orderKey = `${resultKey}|${query.sort ?? ""}`;
  const selected = (picked?.key === orderKey && sorted.find((x) => x.it.id === picked.id)?.it) || sorted[0]?.it;
  const select = (it: Itinerary) => {
    setPicked({ key: orderKey, id: it.id });
    // A tap from the full list drops it to half, so the route it just drew is in view.
    if (snap === "full") setSnap("half");
  };
  useMapScene(selected ? planScene(selected, sorted.map((x) => x.it), lang) : endpointsScene(query), [selected, response, query.from, query.to, lang]);
  // The half sheet grows until card 1 shows whole, down to its Board line and "Details ›", and never
  // so far that the map strip above it goes.
  const sheet = useSheetElement();
  useHalfUpTo(() => (results ? sheet?.querySelector<HTMLElement>("article") : null), noSearchBarCap, `${orderKey}|${sorted.length}`);

  // Only denied and unavailable are "off"; a location not asked for yet is still being found (C.17).
  const fromView: FromView = query.from ? { kind: "place", name: fromLabel(query, lang) } : isOff(rider.status) ? { kind: "off" } : { kind: "finding" };

  const swap = () =>
    change({ ...query, from: query.to, fromName: query.toName, to: query.from, toName: query.from ? query.fromName : undefined });

  const start = useStartTrip(response);
  const picks = usePlacePicks(query);

  const resultsList = ready && (
    <Results query={query} plan={plan} selectedId={selected?.id} onSelect={select} onChange={change} onPickFrom={() => pick("from")} />
  );

  return (
    <ExploreSheet
      ariaLabel={title}
      onBack={onBack}
      header={<PlanHeader title={title} />}
      peek={selected && <Peek it={selected} toName={query.toName ?? ""} onStart={() => start(selected)} />}
    >
      <div className={styles.body}>
        {results ? (
          <>
            <Summary query={query} onEdit={() => change(query, true)} />
            {/* Nothing to sort while loading, empty or with one trip. */}
            {(response?.itineraries.length ?? 0) > 1 && (
              <SortChips sort={query.sort ?? "soonest"} onChange={(s) => change({ ...query, sort: s === "soonest" ? undefined : s })} />
            )}
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
