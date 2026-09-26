// The Explore frame (G.3) over AppShell's persistent map: the search bar (or D13's trip bar),
// the overlay slot, the FAB stack and the screen's bottom sheet. Screens drive it through
// ExploreChrome.

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { useAlerts } from "../../api/alertsStore.ts";
import { useLang, useT } from "../../i18n/index.ts";
import { formatClock } from "../../lib/format.ts";
import { formatLatLon } from "../../lib/geo.ts";
import { useMapCenter } from "../../map/scene.ts";
import { useLocation as useRiderLocation } from "../../state/location.tsx";
import { useOffline, useOfflineSince } from "../../state/offline.ts";
import { useTrip } from "../../state/trip.ts";
import { Fab } from "../../ui/Fab.tsx";
import { MapSearchBar } from "../../ui/MapSearchBar.tsx";
import { StatusBanner } from "../../ui/StatusBanner.tsx";
import { useToast } from "../../ui/Toast.tsx";
import { useUpdatedAgoShown } from "../../ui/UpdatedAgo.tsx";
import type { FabProps, OverlayItem, Snap } from "../../ui/types.ts";
import { useMapHost } from "../mapHost.ts";
import { ExploreContext, type ExploreChromeOptions, type FabRequest } from "./ExploreChrome.tsx";
import styles from "./ExploreLayout.module.css";

const DEFAULT_FABS: FabRequest[] = ["locate", "planTrip"];
/** C.9: a 48dp FAB and the 8dp gap under it. */
const FAB_STEP = 56;
const GAP = 8;

/** Where an element's box ends, from the top of its offset parent, kept current. */
function useBottom(): [(el: HTMLElement | null) => void, number] {
  const [bottom, setBottom] = useState(0);
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: HTMLElement | null) => {
    observer.current?.disconnect();
    if (!el) return;
    observer.current = new ResizeObserver(() => setBottom(el.offsetTop + el.offsetHeight));
    observer.current.observe(el);
  }, []);
  return [ref, bottom];
}

/** State that belongs to one screen: it resets to its default when the path changes. */
function usePerScreen<T>(pathname: string, initial: T): [T, (v: T) => void] {
  const [state, setState] = useState<{ path: string; value: T }>({ path: pathname, value: initial });
  const value = state.path === pathname ? state.value : initial;
  const set = useCallback((v: T) => setState({ path: pathname, value: v }), [pathname]);
  return [value, set];
}

export function ExploreLayout() {
  const t = useT();
  const lang = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const rider = useRiderLocation();
  const offline = useOffline();
  const offlineSince = useOfflineSince();
  // A sheet showing "Offline · last update 12:07 PM" already says it: no second banner over the map.
  const offlineInSheet = useUpdatedAgoShown();
  const trip = useTrip();
  const alerts = useAlerts();
  const toast = useToast();
  const center = useMapCenter();
  const { sheetH, setSheetH, setMapVisible, locate } = useMapHost();

  const [snap, setSnap] = usePerScreen<Snap>(location.pathname, "half");
  const [minHalf, setMinHalf] = usePerScreen<number | undefined>(location.pathname, undefined);
  const [chrome, setChrome] = useState<ExploreChromeOptions | null>(null);
  const [sheetEl, setSheetEl] = useState<HTMLElement | null>(null);
  const [layerRef, layerH] = useBottom();
  const [topRef, topBottom] = useBottom();
  const observer = useRef<ResizeObserver | null>(null);

  useLayoutEffect(() => {
    setMapVisible(true);
    return () => setMapVisible(false);
  }, [setMapVisible]);

  const sheetRef = useCallback(
    (el: HTMLElement | null) => {
      observer.current?.disconnect();
      setSheetEl(el);
      if (!el) return;
      observer.current = new ResizeObserver(([entry]) => setSheetH(entry.borderBoxSize[0]?.blockSize ?? el.offsetHeight));
      observer.current.observe(el);
    },
    [setSheetH],
  );

  const onTrip = location.pathname === "/explore/trip";
  const arriveAt = trip.active && formatClock(trip.active.itinerary.endTime, lang);
  // "Showing Downtown Houston" is only true where the list is anchored on the rider (D2/D3 without a fix).
  const downtown = !rider.fix && location.pathname === "/explore" && !new URLSearchParams(location.search).has("at");

  // C.12 priority: offline > trip-active > Search this area > Downtown > Demo location.
  const overlay: OverlayItem | undefined = offline && !offlineInSheet
    ? { kind: "offline", since: offlineSince ? formatClock(new Date(offlineSince).toISOString(), lang) : undefined }
    : offline
      ? undefined
      : arriveAt && !onTrip
      ? { kind: "trip-active", arriveAt, onOpen: () => navigate("/explore/trip") }
      : chrome?.banner === "search-this-area" && center
        ? { kind: "search-this-area", onPress: () => navigate(`/explore?at=${formatLatLon(center)}&label=${encodeURIComponent(t("map.thisArea"))}`) }
        : downtown
          ? { kind: "downtown-fallback" }
          : rider.demo
            ? { kind: "demo-location" }
            : undefined;

  const onLocate = () => {
    if (rider.fix) return locate();
    rider.request();
    toast({ message: t("map.noFix") });
  };

  const requested: FabProps[] = (chrome?.fabs ?? DEFAULT_FABS).flatMap((f): FabProps[] => {
    if (f === "locate") return [{ kind: "locate", onPress: onLocate }];
    if (f === "planTrip")
      return [trip.active ? { kind: "myTrip", onPress: () => navigate("/explore/trip") } : { kind: "planTrip", onPress: () => navigate("/explore/plan") }];
    const count = alerts.source === "unavailable" ? 0 : alerts.forRoute(f.routeId).length;
    return count ? [{ kind: "routeAlerts", count, onPress: () => navigate(`/more/alerts?route=${encodeURIComponent(f.routeId)}`) }] : [];
  });
  // The column sits between the sheet and the search bar, 8dp from each; when it doesn't fit (a
  // tall half sheet, extra-large text), the first-listed FABs give way.
  const room = layerH - sheetH - topBottom - 2 * GAP;
  const fit = Math.max(1, Math.floor((room + GAP) / FAB_STEP));
  const fabs = layerH ? requested.slice(Math.max(0, requested.length - fit)) : requested;

  const exploreValue = useMemo(
    () => ({ snap, setSnap, minHalf, setMinHalf, setChrome, sheetRef, sheetEl }),
    [snap, setSnap, minHalf, setMinHalf, sheetRef, sheetEl],
  );
  const full = snap === "full";

  // D13: the trip bar takes the search bar's place (no "Open ›": this is the trip).
  const topBar =
    onTrip && arriveAt ? (
      <StatusBanner item={{ kind: "trip-active", arriveAt, complete: chrome?.tripBar === "complete" }} />
    ) : (
      !chrome?.hideSearchBar && <MapSearchBar onPress={() => navigate("/explore/search")} />
    );

  return (
    <ExploreContext value={exploreValue}>
      <main ref={layerRef} className={styles.layer}>
        {!full && (
          <div ref={topRef} className={styles.top}>
            {topBar}
            {overlay && <StatusBanner item={overlay} />}
          </div>
        )}
        {!full && fabs.length > 0 && (
          <div className={styles.fabs} style={{ bottom: sheetH + 8 }}>
            {fabs.map((f) => (
              <Fab key={f.kind} {...f} />
            ))}
          </div>
        )}
        <Outlet />
      </main>
    </ExploreContext>
  );
}
