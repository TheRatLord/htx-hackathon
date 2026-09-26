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
import { useTrip } from "../../../state/trip.ts";
import { Button } from "../../../ui/Button.tsx";
import { ScheduleCaption } from "../../../ui/ScheduleCaption.tsx";
import { SheetBanner } from "../../../ui/SheetBanner.tsx";
import { SheetHeader } from "../../../ui/SheetHeader.tsx";
import type { SheetBannerProps } from "../../../ui/types.ts";
import { UpdatedAgo } from "../../../ui/UpdatedAgo.tsx";
import { placeQuery, useHomeAnchor, type HomeAnchor, type Place } from "./anchor.ts";
import { homeChips } from "./chips.ts";
import styles from "./Home.module.css";
import { LoadingCards, NearbyList } from "./NearbyList.tsx";
import { RouteChips } from "./RouteChips.tsx";
import { RouteNearYou } from "./RouteNearYou.tsx";
import { SavedRow } from "./SavedRow.tsx";
import { useHalfUpTo } from "./useHalfUpTo.ts";
import { walkFromLabel } from "./walkFrom.ts";

/** Panning further than this from the list's anchor offers "Search this area" (C.16). */
const SEARCH_AREA_M = 300;
const HOME_ZOOM = 16;
/** Bottom nav plus the search bar: what the half sheet and the map strip share the screen with. */
const NAV_H = 80;
const SEARCH_BAR_H = 60;
/** M1: the map strip left above the half sheet. */
const mapMin = (vh: number) => (vh >= 740 ? 180 : 120);
const foldCap = (vh: number) => vh - NAV_H - SEARCH_BAR_H - mapMin(vh);

/** The transit center detail is fetched only when one is within 1,000 m. */
function WithTransitCenter({ id, children }: { id?: string; children: (tc?: TransitCenterDetail) => ReactNode }) {
  return id ? <FetchTransitCenter id={id}>{children}</FetchTransitCenter> : children(undefined);
}

function FetchTransitCenter({ id, children }: { id: string; children: (tc?: TransitCenterDetail) => ReactNode }) {
  return children(useTransitCenter(id).data);
}

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
        ? { focus: { kind: "point", point: at, zoom: HOME_ZOOM }, markers: [{ id: "place", point: at, kind: "destination", label: anchor.kind === "place" ? anchor.label : undefined }] }
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
  tc?: TransitCenterDetail;
}

/** D2 / D4 below the chips: the saved row (D2), the stop cards and the footer. */
function NearbyBody({ anchor, origin, place, nearby, tc }: NearbyBodyProps) {
  const t = useT();
  const firstCard = useRef<HTMLDivElement>(null);
  const ids = nearby.data?.stops.map((s) => s.stop.id).join() ?? "";
  useHalfUpTo(() => firstCard.current?.querySelector("li") ?? firstCard.current, foldCap, `${anchor.kind}|${ids}`);
  return (
    <>
      <HomeScene anchor={anchor} />
      {!place && <SavedRow />}
      {origin ? <NearbyList nearby={nearby} origin={origin} place={place} tcDetail={tc} firstCard={firstCard} /> : anchor.kind === "finding" && <LoadingCards />}
      {nearby.data && (
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
  const lang = useLang();
  const navigate = useNavigate();
  const back = useBack();
  const [params] = useSearchParams();
  const anchor = useHomeAnchor();
  const { walkPace } = usePrefs();
  const center = useMapCenter();
  useRoutesLoaded();

  const routeParam = params.get("route");
  const routeId = routeParam ? canonicalRouteId(routeParam) : undefined;
  const origin = anchor.kind === "place" || anchor.kind === "user" ? anchor.point : undefined;
  const place: Place | undefined =
    anchor.kind === "place" ? { param: anchor.param, name: anchor.label, short: walkFromLabel(anchor.label, lang) } : undefined;
  const nearby = useNearby(origin, { precise: true });
  const banner = useSheetBanner(anchor, nearby.data);

  const panned = Boolean(!routeId && origin && center && haversineM(origin.lat, origin.lon, center.lat, center.lon) > SEARCH_AREA_M);
  useExploreChrome(
    routeId
      ? { fabs: ["locate", "planTrip", { kind: "routeAlerts", routeId }] }
      : { banner: panned ? "search-this-area" : null },
  );

  let title: string;
  if (routeId) title = t("home.route.title", { name: routeRef(routeId)?.name ?? routeParam! });
  else if (place) title = t("home.nearPlace", { place: place.name });
  else title = anchor.kind === "finding" ? t("home.finding") : t("home.title");
  usePageTitle(title);

  const extra = placeQuery(anchor);
  const onChip = (id: string) => {
    if (id === routeId) navigate(`/explore${extra ? `?${extra}` : ""}`, { replace: true });
    else navigate(`/explore?route=${encodeURIComponent(id)}${extra ? `&${extra}` : ""}`, { replace: Boolean(routeId) });
  };
  const updated = !routeId && nearby.data && (
    <UpdatedAgo compact at={new Date(nearby.dataUpdatedAt).toISOString()} onRefresh={() => void nearby.refetch()} />
  );

  return (
    <ExploreSheet ariaLabel={title} header={<SheetHeader title={title} sub={updated} />} onBack={routeId || place ? back : undefined}>
      <WithTransitCenter id={nearby.data?.transitCenters[0]?.id}>
        {(tc) => (
          <div className={styles.body}>
            {place && !routeId && (
              <div className={styles.backToMe}>
                <Button variant="tonal" icon="close" label={t("home.backToMe")} onPress={() => navigate("/explore")} />
              </div>
            )}
            {banner && !place && <SheetBanner {...banner} />}
            {nearby.data && (
              <div className={styles.bleed}>
                <RouteChips routes={homeChips(nearby.data, tc, walkPace)} selectedId={routeId} onPress={(r) => onChip(r.id)} />
              </div>
            )}
            {routeId ? (
              origin ? (
                <RouteNearYou routeId={routeId} origin={origin} place={place} nearby={nearby.data} tc={tc} />
              ) : (
                anchor.kind === "finding" && <LoadingCards />
              )
            ) : (
              <NearbyBody anchor={anchor} origin={origin} place={place} nearby={nearby} tc={tc} />
            )}
          </div>
        )}
      </WithTransitCenter>
    </ExploreSheet>
  );
}
