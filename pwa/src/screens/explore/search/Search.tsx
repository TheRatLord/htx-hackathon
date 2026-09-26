// D5 Search, a full sheet over the map. Also the planner's pick mode (?pick=from|to&returnTo=).

import { useEffect, useLayoutEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useSearch, useTransitCenters } from "../../../api/hooks.ts";
import type { SearchResult, TransitCenterSummary } from "../../../api/types.ts";
import { ExploreSheet, useExploreChrome, useSheet } from "../../../app/layouts/ExploreChrome.tsx";
import { useBack } from "../../../app/useBack.ts";
import { usePageTitle } from "../../../app/usePageTitle.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { formatLatLon } from "../../../lib/geo.ts";
import { encodePick, planUrl } from "../../../lib/planQuery.ts";
import { useLocation } from "../../../state/location.tsx";
import { recentsActions } from "../../../state/recents.ts";
import type { SavedStop } from "../../../state/saved.ts";
import { Button } from "../../../ui/Button.tsx";
import { ErrorState } from "../../../ui/ErrorState.tsx";
import { SearchField } from "../../../ui/SearchField.tsx";
import { SectionHeader } from "../../../ui/SectionHeader.tsx";
import { Skeleton } from "../../../ui/Skeleton.tsx";
import type { RouteStop } from "../route/routeGeo.ts";
import { EmptyQuery } from "./EmptyQuery.tsx";
import { groupResults, parseRouteStopQuery, type SearchSection } from "./groupResults.ts";
import { PlaceRow, RouteRow, SimpleRow, StopRow, TransitCenterRow } from "./ResultRows.tsx";
import { RouteStopShortcut } from "./RouteStopShortcut.tsx";
import styles from "./Search.module.css";

const DEBOUNCE_MS = 250;
/**
 * OpenStreetMap places shown before "More places". Curated landmarks always show, and when one
 * matched it is the answer, so the places wait behind the link and the stops stay in view.
 */
const MAX_PLACES = 3;
/** Server warnings (English) the client can say in the rider's language; others show in English only. */
const KNOWN_WARNINGS: [RegExp, string][] = [[/^Address search is unavailable/, "search.addressUnavailable"]];

const SECTION_LABEL: Record<SearchSection["kind"], string> = {
  places: "search.places",
  transitCenters: "search.transitCenters",
  stops: "search.stops",
  routes: "search.routes",
};

const atUrl = (r: { lat?: number; lon?: number; title: string }) =>
  `/explore?at=${formatLatLon({ lat: r.lat!, lon: r.lon! })}&label=${encodeURIComponent(r.title)}`;

export default function Search() {
  const t = useT();
  const lang = useLang();
  const navigate = useNavigate();
  const onBack = useBack();
  const { fix } = useLocation();
  const { setSnap } = useSheet();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const pickField = params.get("pick");
  const pick = pickField === "from" || pickField === "to" ? pickField : undefined;
  const returnTo = params.get("returnTo") ?? planUrl({});
  const [text, setText] = useState(q);
  // "More places" opens the rest for this query only.
  const [allPlacesFor, setAllPlacesFor] = useState<string>();

  usePageTitle(t("search.title"));
  useExploreChrome({ hideSearchBar: true, fabs: [] });
  useLayoutEffect(() => setSnap("full"), [setSnap]);

  // The URL follows the typing (debounced, replace), so Back leaves the search in one press.
  useEffect(() => {
    const next = text.trim();
    if (next === q) return;
    const timer = setTimeout(
      () =>
        setParams(
          (p) => {
            const out = new URLSearchParams(p);
            if (next) out.set("q", next);
            else out.delete("q");
            return out;
          },
          { replace: true },
        ),
      DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [text, q, setParams]);

  const query = text.trim() ? q : "";
  const search = useSearch(query, fix);
  const tcs = useTransitCenters();

  /** Every result tap is remembered as a recent search (C.17). */
  const go = (url: string) => {
    recentsActions.addSearch(query);
    navigate(url);
  };
  const choose = (result: Parameters<typeof encodePick>[2]) => {
    if (query) recentsActions.addSearch(query);
    navigate(encodePick(returnTo, pick!, result), { replace: true });
  };
  const stopResult = (id: string, title: string): SearchResult => ({ type: "stop", id, title, subtitle: "" });
  const openSaved = (s: SavedStop) =>
    pick ? choose(stopResult(s.id, s.name)) : navigate(`/explore/stop/${encodeURIComponent(s.id)}${s.preferredRouteId ? `?route=${encodeURIComponent(s.preferredRouteId)}` : ""}`);
  const openRouteStop = (routeId: string, dir: 0 | 1, s: RouteStop) =>
    pick ? choose(stopResult(s.id, s.name)) : go(`/explore/route/${encodeURIComponent(routeId)}?dir=${dir}&stop=${encodeURIComponent(s.id)}`);

  const shortcut = query ? parseRouteStopQuery(query) : undefined;
  const sections = search.data && query ? groupResults(search.data.results, tcs.data?.transitCenters ?? [], query) : [];
  const shownSections = pick ? sections.filter((s) => s.kind !== "routes") : sections;
  const warnings = (search.data && query ? search.data.warnings : []).flatMap((w) => {
    const known = KNOWN_WARNINGS.find(([pattern]) => pattern.test(w));
    return known ? [t(known[1])] : lang === "en" ? [w] : [];
  });

  const renderSection = (section: SearchSection) => {
    switch (section.kind) {
      case "places": {
        const landmarks = section.items.filter((r) => r.type === "landmark");
        const places = section.items.filter((r) => r.type === "place");
        const hidden = allPlacesFor === query ? 0 : Math.max(0, places.length - (landmarks.length ? 0 : MAX_PLACES));
        const rows = [...landmarks, ...places.slice(0, places.length - hidden)].map((r, i) =>
          pick ? (
            <SimpleRow key={r.id} icon="place" title={r.title} lines={[r.subtitle]} onPress={() => choose(r)} />
          ) : (
            <PlaceRow
              key={r.id}
              result={r}
              actions={r.type === "landmark" || i === 0}
              onNear={() => go(atUrl(r))}
              onDirections={() =>
                go(planUrl({ to: r.type === "landmark" ? `landmark:${r.id}` : formatLatLon({ lat: r.lat!, lon: r.lon! }), toName: r.title }))
              }
            />
          ),
        );
        return (
          <>
            {rows}
            {hidden > 0 && (
              <div className={styles.more}>
                <Button variant="text" label={t("search.morePlaces", { count: hidden })} onPress={() => setAllPlacesFor(query)} />
              </div>
            )}
          </>
        );
      }
      case "transitCenters":
        return section.items.map((tc: TransitCenterSummary) => (
          <TransitCenterRow
            key={tc.id}
            tc={tc}
            onOpen={() => (pick ? choose(stopResult(tc.stopIds[0], tc.name)) : go(`/explore/tc/${encodeURIComponent(tc.id)}`))}
          />
        ));
      case "stops":
        return section.items.map((r) => (
          <StopRow
            key={r.id}
            result={r}
            walkable={!pick}
            onOpen={() => (pick ? choose(r) : go(`/explore/stop/${encodeURIComponent(r.id)}`))}
            onWalk={(d) => go(`/explore/stop/${encodeURIComponent(r.id)}/walk?d=${Math.round(d)}`)}
          />
        ));
      case "routes":
        return section.items.map((r) => (
          <RouteRow key={r.id} result={r} onOpen={(dir) => go(`/explore/route/${encodeURIComponent(r.id)}?dir=${dir}`)} />
        ));
    }
  };

  let body;
  if (!query) {
    body = <EmptyQuery pick={Boolean(pick)} onOpenStop={openSaved} onRecent={setText} />;
  } else if (search.isError && !search.data) {
    body = <ErrorState error={search.error} onRetry={() => void search.refetch()} />;
  } else if (!search.data) {
    body = (
      <div className={styles.loading}>
        <Skeleton variant="row" />
        <Skeleton variant="row" />
        <Skeleton variant="row" />
      </div>
    );
  } else {
    body = (
      <>
        {shortcut && <RouteStopShortcut route={shortcut.route} stop={shortcut.stop} onPick={openRouteStop} />}
        {shownSections.map((section) => (
          <section key={section.kind} className={styles.section}>
            <SectionHeader tone="variant" label={t(SECTION_LABEL[section.kind])} />
            {renderSection(section)}
          </section>
        ))}
        {!shownSections.length && !shortcut && (
          <div className={styles.noResults}>
            <p className={styles.noResultsTitle}>{t("search.noMatches", { q: query })}</p>
            <p>{t("search.noMatchesBody")}</p>
          </div>
        )}
        {warnings.map((w) => (
          <p key={w} className={styles.warning}>
            {w}
          </p>
        ))}
      </>
    );
  }

  const label = pick === "from" ? t("search.pickFrom") : pick === "to" ? t("search.pickTo") : t("search.label");
  return (
    <ExploreSheet
      ariaLabel={t("search.title")}
      header={
        <div className={styles.header}>
          {/* Not focusable on purpose: the input keeps the autofocus and the keyboard stays open.
              In pick mode it is shown, so the rider sees which field of the planner is being filled. */}
          <h1 className={pick ? styles.pickTitle : "visually-hidden"}>{label}</h1>
          <SearchField value={text} onChange={setText} onBack={onBack} label={label} placeholder={t("map.searchPlaceholder")} />
        </div>
      }
    >
      <div className={styles.content}>
        {pick && fix && <SimpleRow icon="my_location" title={t("common.myLocation")} onPress={() => choose({ kind: "my-location", point: fix })} />}
        {body}
      </div>
    </ExploreSheet>
  );
}
