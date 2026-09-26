// Explore home (G.3 `/explore`): Nearby (D2), Route near you (D3, `?route=`) and Stops near a
// place (D4, `?at=&label=`). One sheet: title row, one banner, the route chips, then the list.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useNearby, useTransitCenter } from "../../../api/hooks.ts";
import type { LatLon, NearbyResponse, TransitCenterDetail } from "../../../api/types.ts";
import { ExploreSheet, useExploreChrome } from "../../../app/layouts/ExploreChrome.tsx";
import { useBack } from "../../../app/useBack.ts";
import { usePageTitle } from "../../../app/usePageTitle.ts";
import { hasKey, useLang, useT } from "../../../i18n/index.ts";
import { formatClock } from "../../../lib/format.ts";
import { DOWNTOWN, haversineM } from "../../../lib/geo.ts";
import { planUrl } from "../../../lib/planQuery.ts";
import { canonicalRouteId, routeRef, useRoutesLoaded } from "../../../lib/routes.ts";
import { useMapCenter, useMapScene } from "../../../map/scene.ts";
import { useNow } from "../../../state/clock.ts";
import { usePrefs } from "../../../state/prefs.ts";
import { useSaved } from "../../../state/saved.ts";
import { useTrip } from "../../../state/trip.ts";
import { ScheduleCaption } from "../../../ui/ScheduleCaption.tsx";
import { SheetBanner } from "../../../ui/SheetBanner.tsx";
import { SheetHeader } from "../../../ui/SheetHeader.tsx";
import type { SheetBannerProps } from "../../../ui/types.ts";
import { UpdatedAgo } from "../../../ui/UpdatedAgo.tsx";
import { foldCap } from "./fold.ts";
import { placeQuery, useHomeAnchor, type HomeAnchor, type Place } from "./anchor.ts";
import { homeChips } from "./chips.ts";
import styles from "./Home.module.css";
import { LoadingCards, NearbyList } from "./NearbyList.tsx";
import { RouteChips } from "./RouteChips.tsx";
import { RouteNearYou } from "./RouteNearYou.tsx";
import { SavedRow } from "./SavedRow.tsx";
import { useHalfUpTo } from "./useHalfUpTo.ts";

/** Panning further than this from the list's anchor offers "Search this area" (C.16). */
const SEARCH_AREA_M = 300;
const HOME_ZOOM = 16;
/**
 * Location off: the map shows downtown from a point about 60px (125 m) north of DOWNTOWN, so the
 * Theater District rail stations sit in open map below the "Showing Downtown Houston" pill instead
 * of under it (36, 37).
 */
const DOWNTOWN_VIEW = { lat: DOWNTOWN.lat + 0.0011, lon: DOWNTOWN.lon };
/** Below this viewport height (with Extra large text) the chips go after card #1. */
const SHORT_SCREEN = 700;

/** C.12 sheet banner row: trip planned > location off > demo data. */
function useSheetBanner(anchor: HomeAnchor, nearby?: NearbyResponse): SheetBannerProps | undefined {
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const navigate = useNavigate();
  const trip = useTrip();
  const planned = trip.planned;
  const it = planned && !trip.active ? planned.response.itineraries[planned.chosen ?? 0] : undefined;
  if (planned && it && Date.parse(it.startTime) > now - 60_000)
    return {
      kind: "trip-planned",
      place: planned.query.toName ?? planned.response.to.name,
      leaveAt: formatClock(it.startTime, lang),
      onOpen: () => navigate(planUrl(planned.query, planned.chosen !== null ? { index: planned.chosen } : {})),
      onClear: () => trip.setPlanned(undefined),
    };
  if (anchor.kind === "off")
    return { kind: "location-off", reason: anchor.reason, blocked: anchor.blocked, onTurnOn: anchor.onTurnOn, onSearch: () => navigate("/explore/search") };
  if (nearby?.stops.some((s) => s.realtimeSources.includes("simulated"))) return { kind: "demo", text: t("banner.demoData") };
  return undefined;
}

/**
 * How many of the list's stops the map tags (besides the saved stop): the cards a rider sees at the
 * half sheet and the next one. Four put tags on stops far down the list (3425, 3426 on 03).
 */
const TAGGED = 3;
/** D4 frames the place with its nearest stop when the two fit one screen at HOME_ZOOM. */
const PLACE_FRAME_M = 400;
/** What a listed stop's pin, pointer and tag take above its point, clear of the search bar. */
const LABEL_ROOM_PX = 64;
/** The map camera's right margin (MapView's padding), and the room kept left of the FAB column. */
const CAMERA_RIGHT_PX = 72;
const FAB_GAP_PX = 16;

/** Degrees of latitude that `px` screen pixels span at `zoom` (MapLibre's 512px tiles). */
function degForPx(px: number, lat: number, zoom: number): number {
  const mPerPx = (40_075_016 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom);
  return (px * mPerPx) / 111_320;
}

/**
 * The FAB column's width, kept current (fonts loading, a language or text-size change) by a
 * ResizeObserver instead of read from the DOM during render. Rounded to 8px so a sub-pixel change
 * doesn't move the camera.
 */
const fabColumn = () => document.querySelector<HTMLElement>("[data-map-fabs]");
const fabWidth = (el: HTMLElement | null) => Math.round((el?.offsetWidth ?? 0) / 8) * 8;

function useFabColumnWidth(enabled: boolean): number {
  // The first frame's camera already clears the column (07's tag on the first frame).
  const [w, setW] = useState(() => (enabled ? fabWidth(fabColumn()) : 0));
  useEffect(() => {
    const el = enabled ? fabColumn() : null;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(fabWidth(el)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [enabled]);
  return w;
}

function HomeScene({ anchor, data }: { anchor: HomeAnchor; data?: NearbyResponse }) {
  const saved = useSaved();
  const at = anchor.kind === "place" ? anchor.point : undefined;
  const savedId = anchor.kind === "place" ? undefined : saved.stops[0]?.id;
  const listed = data?.stops.slice(0, TAGGED).map((s) => s.stop) ?? [];
  // The saved stop first (it is what the rider opened the app for, 03), then the cards' stops.
  const tagStopIds = [...new Set([...(savedId ? [savedId] : []), ...listed.map((s) => s.id)])];
  // D4: centred between the place and its nearest stop at the usual zoom (where stop IDs show), so
  // the rider sees the stop and which way to walk (07). A bounds fit zoomed out past the ID chips.
  const near = at && listed[0] && haversineM(at.lat, at.lon, listed[0].lat, listed[0].lon) < PLACE_FRAME_M ? listed[0] : undefined;
  // Raised by half the room a stop's tag (or the place's pin) takes above its point, so the pair's
  // whole drawing is centred on the map strip: centred on the points alone, the stop's tag met the
  // search bar and was dropped (688 · 2504 untagged, 07).
  // And moved right by half the width the FAB column takes past the camera's 72px right margin
  // ("Plan Trip" is ~150px wide): centred on the camera, the museum pin sat under Plan Trip and the
  // map's own nudge moved it out only after a moment.
  const fabW = useFabColumnWidth(Boolean(at));
  const fabExtra = Math.max(0, fabW + FAB_GAP_PX - CAMERA_RIGHT_PX);
  const placeCenter =
    at &&
    (near
      ? {
          lat: (at.lat + near.lat) / 2 + degForPx(LABEL_ROOM_PX / 2, at.lat, HOME_ZOOM),
          lon: (at.lon + near.lon) / 2 + degForPx(fabExtra / 2, at.lat, HOME_ZOOM) / Math.cos((at.lat * Math.PI) / 180),
        }
      : at);
  useMapScene(
    {
      tagStopIds,
      ...(anchor.kind === "user"
        ? { focus: { kind: "user", zoom: HOME_ZOOM } }
        : at
          ? {
              focus: { kind: "point", point: placeCenter ?? at, zoom: HOME_ZOOM },
              markers: [{ id: "place", point: at, kind: "place", label: anchor.kind === "place" ? anchor.label : undefined }],
            }
          : { focus: { kind: "point", point: DOWNTOWN_VIEW, zoom: HOME_ZOOM - 1 } }),
    },
    [anchor.kind, at?.lat, at?.lon, tagStopIds.join(), placeCenter?.lat, placeCenter?.lon],
  );
  return null;
}

interface NearbyBodyProps {
  anchor: HomeAnchor;
  origin?: LatLon;
  place?: Place;
  nearby: ReturnType<typeof useNearby>;
  data?: NearbyResponse;
  tc?: TransitCenterDetail;
  /** The chips, when they go after card #1 instead of above it. */
  chipsAfterFirst?: ReactNode;
  /** Location off: the prompt goes after the saved stop, which is what the rider opened the app for. */
  afterSaved?: ReactNode;
}

/** D2 / D4 below the chips: the saved row (D2), the stop cards and the footer. */
function NearbyBody({ anchor, origin, place, nearby, data, tc, chipsAfterFirst, afterSaved }: NearbyBodyProps) {
  const t = useT();
  const saved = useSaved();
  const firstRow = useRef<HTMLLIElement>(null);
  // "After card #1": with a saved stop that card is the saved one (03-xlarge-360: after the first
  // nearby card, the chips were two cards down).
  const savedFirst = !place && saved.stops.length > 0;
  const ids = data?.stops.map((s) => s.stop.id).join() ?? "";
  // M2/M3: grow to card #1's first route row.
  useHalfUpTo(() => firstRow.current, foldCap, `${anchor.kind}|${ids}`);
  return (
    <>
      <HomeScene anchor={anchor} data={data} />
      {!place && <SavedRow origin={anchor.kind === "user" ? anchor.point : undefined} />}
      {savedFirst && chipsAfterFirst}
      {afterSaved}
      {origin ? (
        <NearbyList nearby={nearby} data={data} origin={origin} place={place} tcDetail={tc} firstRow={firstRow} afterFirst={savedFirst ? undefined : chipsAfterFirst} />
      ) : (
        anchor.kind === "finding" && <LoadingCards />
      )}
      {data && (
        <div className={styles.footer}>
          <ScheduleCaption />
          <p className={styles.caption}>{t("home.footerPace")}</p>
        </div>
      )}
    </>
  );
}

export default function Home() {
  const t = useT();
  const navigate = useNavigate();
  const back = useBack();
  const [params] = useSearchParams();
  const anchor = useHomeAnchor();
  const { walkPace, textSize } = usePrefs();
  const center = useMapCenter();
  const saved = useSaved();
  useRoutesLoaded();

  const routeParam = params.get("route");
  const routeId = routeParam ? canonicalRouteId(routeParam) : undefined;
  const origin = anchor.kind === "place" || anchor.kind === "user" ? anchor.point : undefined;
  const fromKey = anchor.kind === "place" && anchor.category ? `home.walkFromKind.${anchor.category}` : "";
  const short = fromKey && hasKey(fromKey) ? t(fromKey) : t("home.walkFromThere");
  const place: Place | undefined = anchor.kind === "place" ? { param: anchor.param, name: anchor.label, short } : undefined;
  const nearby = useNearby(origin, { precise: true });
  const data = origin ? nearby.data : undefined;
  const banner = useSheetBanner(anchor, data);
  const tcId = data?.transitCenters[0]?.id;
  const tc = useTransitCenter(tcId ?? "", { enabled: Boolean(tcId) }).data;

  const panned = Boolean(!routeId && origin && center && haversineM(origin.lat, origin.lon, center.lat, center.lon) > SEARCH_AREA_M);
  // D3 keeps the usual FABs in place: its alerts are a line in the sheet, not a third FAB that pushed Locate out.
  useExploreChrome(routeId ? { fabs: ["locate", "planTrip"] } : { banner: panned ? "search-this-area" : null });

  let title: string;
  if (routeId) title = t("home.route.title", { name: routeRef(routeId)?.name ?? routeParam! });
  else if (place) title = t("home.nearPlace", { place: place.name });
  else if (anchor.kind === "off") title = t("home.titleOff");
  else title = anchor.kind === "finding" ? t("home.finding") : t("home.title");
  usePageTitle(title);

  const extra = placeQuery(anchor);
  const onChip = (id: string) => {
    if (id === routeId) navigate(`/explore${extra ? `?${extra}` : ""}`, { replace: true });
    else navigate(`/explore?route=${encodeURIComponent(id)}${extra ? `&${extra}` : ""}`, { replace: Boolean(routeId) });
  };
  const chips = data && (
    <div className={styles.bleed}>
      <RouteChips routes={homeChips(data, tc, walkPace, routeId)} selectedId={routeId} onPress={(r) => onChip(r.id)} />
    </div>
  );
  // Extra large text on a short screen: above card #1 the chips would push every bus time below the
  // fold, so D2's chips follow the first card there (the first departure is the one job of Home).
  const chipsLater = !routeId && textSize === "xlarge" && window.innerHeight < SHORT_SCREEN && Boolean(data?.stops.length);
  // Location off with a saved stop: the saved stop first, then the prompt (37).
  const offFirst = !routeId && banner?.kind === "location-off" && saved.stops.length > 0;
  // Location off and nothing saved: the prompt is all there is, so no "Show list" chevron (36).
  const noList = !routeId && anchor.kind === "off" && saved.stops.length === 0;
  // D4 says once where the walk times start ("Walk times from the museum"): the pills say only
  // "4 min walk". "Just now · Refresh" took that row on its own (07); the list refreshes itself.
  // Extra large on a short screen keeps it, as "Just now / ↻ Refresh" so "Nearby stops" stays on
  // one line beside it: without it the rider couldn't see how fresh the times were (03-xlarge-360).
  const updated =
    place && !routeId ? (
      <span className={styles.walkFrom}>{t("home.walkTimesFrom", { from: short })}</span>
    ) : (
      !routeId &&
      nearby.data && <UpdatedAgo compact short={chipsLater} at={new Date(nearby.dataUpdatedAt).toISOString()} onRefresh={() => void nearby.refetch()} />
    );

  return (
    // D4 has one way back, "✕ My location" at the end of the overline row (no row of its own);
    // D3 keeps the sheet's "‹ Back".
    <ExploreSheet ariaLabel={title} noList={noList} header={
        <SheetHeader
          title={place && !routeId ? place.name : title}
          overline={place && !routeId ? t("home.stopsNear") : undefined}
          overlineAction={
            place && !routeId
              ? { label: t("home.myLocation"), ariaLabel: t("home.backToMe"), icon: "close", onPress: () => navigate("/explore") }
              : undefined
          }
          sub={updated}
        />
      } onBack={routeId ? back : undefined}>
      <div className={styles.body}>
        {banner && !place && !offFirst && <SheetBanner {...banner} />}
        {data && !chipsLater && chips}
        {routeId ? (
          <RouteNearYou routeId={routeId} origin={origin} finding={anchor.kind === "finding"} place={place} nearby={data} tc={tc} />
        ) : (
          <NearbyBody
            anchor={anchor}
            origin={origin}
            place={place}
            nearby={nearby}
            data={data}
            tc={tc}
            chipsAfterFirst={data && chipsLater ? chips : undefined}
            afterSaved={banner?.kind === "location-off" && offFirst ? <SheetBanner {...banner} compact /> : undefined}
          />
        )}
      </div>
    </ExploreSheet>
  );
}
