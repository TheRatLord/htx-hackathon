// Explore home (G.3 `/explore`): Nearby (D2), Route near you (D3, `?route=`) and Stops near a
// place (D4, `?at=&label=`). One sheet: title row, one banner, the route chips, then the list.

import { useRef, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useNearby, useTransitCenter } from "../../../api/hooks.ts";
import type { LatLon, NearbyResponse, TransitCenterDetail } from "../../../api/types.ts";
import { ExploreSheet, useExploreChrome } from "../../../app/layouts/ExploreChrome.tsx";
import { useBack } from "../../../app/useBack.ts";
import { usePageTitle } from "../../../app/usePageTitle.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { formatClock } from "../../../lib/format.ts";
import { DOWNTOWN, haversineM } from "../../../lib/geo.ts";
import { planUrl } from "../../../lib/planQuery.ts";
import { canonicalRouteId, routeRef, useRoutesLoaded } from "../../../lib/routes.ts";
import { useMapCenter, useMapScene } from "../../../map/scene.ts";
import { useNow } from "../../../state/clock.ts";
import { usePrefs } from "../../../state/prefs.ts";
import { useSaved } from "../../../state/saved.ts";
import { useTrip } from "../../../state/trip.ts";
import { Button } from "../../../ui/Button.tsx";
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

function HomeScene({ anchor }: { anchor: HomeAnchor }) {
  const at = anchor.kind === "place" ? anchor.point : undefined;
  useMapScene(
    anchor.kind === "user"
      ? { focus: { kind: "user", zoom: HOME_ZOOM } }
      : at
        ? {
            focus: { kind: "point", point: at, zoom: HOME_ZOOM },
            markers: [{ id: "place", point: at, kind: "place", label: anchor.kind === "place" ? anchor.label : undefined }],
          }
        : { focus: { kind: "point", point: DOWNTOWN, zoom: HOME_ZOOM - 1 } },
    [anchor.kind, at?.lat, at?.lon],
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
  const firstRow = useRef<HTMLLIElement>(null);
  const ids = data?.stops.map((s) => s.stop.id).join() ?? "";
  // M2/M3: grow to card #1's first route row.
  useHalfUpTo(() => firstRow.current, foldCap, `${anchor.kind}|${ids}`);
  return (
    <>
      <HomeScene anchor={anchor} />
      {!place && <SavedRow origin={anchor.kind === "user" ? anchor.point : undefined} />}
      {afterSaved}
      {origin ? (
        <NearbyList nearby={nearby} data={data} origin={origin} place={place} tcDetail={tc} firstRow={firstRow} afterFirst={chipsAfterFirst} />
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
  const place: Place | undefined = anchor.kind === "place" ? { param: anchor.param, name: anchor.label, short: t("home.walkFromThere") } : undefined;
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
      <RouteChips routes={homeChips(data, tc, walkPace)} selectedId={routeId} place={Boolean(place)} onPress={(r) => onChip(r.id)} />
    </div>
  );
  // Extra large text on a short screen: above card #1 the chips would push every bus time below the
  // fold, so D2's chips follow the first card there (the first departure is the one job of Home).
  const chipsLater = !routeId && textSize === "xlarge" && window.innerHeight < SHORT_SCREEN && Boolean(data?.stops.length);
  // Location off with a saved stop: the saved stop first, then the prompt (37).
  const offFirst = !routeId && banner?.kind === "location-off" && saved.stops.length > 0;
  const updated = !routeId && nearby.data && <UpdatedAgo compact at={new Date(nearby.dataUpdatedAt).toISOString()} onRefresh={() => void nearby.refetch()} />;

  return (
    // D4 has one way back, "Back to my location" (its UpdatedAgo shares that row, as a place name
    // fills the title row); D3 keeps the sheet's "‹ Back".
    <ExploreSheet ariaLabel={title} header={<SheetHeader title={title} sub={place ? undefined : updated} />} onBack={routeId ? back : undefined}>
      <div className={styles.body}>
        {place && !routeId && (
          <div className={styles.backToMe}>
            <Button variant="tonal" icon="close" label={t("home.backToMe")} onPress={() => navigate("/explore")} />
            {updated}
          </div>
        )}
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
            afterSaved={banner && offFirst ? <SheetBanner {...banner} /> : undefined}
          />
        )}
      </div>
    </ExploreSheet>
  );
}
