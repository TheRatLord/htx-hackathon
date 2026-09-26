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
import type { FabProps, OverlayItem, Snap } from "../../ui/types.ts";
import { useMapHost } from "../mapHost.ts";
import { ExploreContext, type ExploreChromeOptions, type FabRequest } from "./ExploreChrome.tsx";
import styles from "./ExploreLayout.module.css";

const DEFAULT_FABS: FabRequest[] = ["locate", "planTrip"];

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
  const trip = useTrip();
  const alerts = useAlerts();
  const toast = useToast();
  const center = useMapCenter();
  const { sheetH, setSheetH, setMapVisible, locate } = useMapHost();

  const [snap, setSnap] = usePerScreen<Snap>(location.pathname, "half");
  const [minHalf, setMinHalf] = usePerScreen<number | undefined>(location.pathname, undefined);
  const [chrome, setChrome] = useState<ExploreChromeOptions | null>(null);
  const observer = useRef<ResizeObserver | null>(null);

  useLayoutEffect(() => {
    setMapVisible(true);
    return () => setMapVisible(false);
  }, [setMapVisible]);

  const sheetRef = useCallback(
    (el: HTMLElement | null) => {
      observer.current?.disconnect();
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
  const overlay: OverlayItem | undefined = offline
    ? { kind: "offline", since: offlineSince ? formatClock(new Date(offlineSince).toISOString(), lang) : undefined }
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

  const fabs: FabProps[] = (chrome?.fabs ?? DEFAULT_FABS).flatMap((f): FabProps[] => {
    if (f === "locate") return [{ kind: "locate", onPress: onLocate }];
    if (f === "planTrip")
      return [trip.active ? { kind: "myTrip", onPress: () => navigate("/explore/trip") } : { kind: "planTrip", onPress: () => navigate("/explore/plan") }];
    const count = alerts.source === "unavailable" ? 0 : alerts.forRoute(f.routeId).length;
    return count ? [{ kind: "routeAlerts", count, onPress: () => navigate(`/more/alerts?route=${encodeURIComponent(f.routeId)}`) }] : [];
  });

  const exploreValue = useMemo(
    () => ({ snap, setSnap, minHalf, setMinHalf, setChrome, sheetRef }),
    [snap, setSnap, minHalf, setMinHalf, sheetRef],
  );
  const full = snap === "full";

  // D13: the trip bar takes the search bar's place (no "Open ›": this is the trip).
  const topBar =
    onTrip && arriveAt ? (
      <StatusBanner item={{ kind: "trip-active", arriveAt }} />
    ) : (
      !chrome?.hideSearchBar && <MapSearchBar onPress={() => navigate("/explore/search")} />
    );

  return (
    <ExploreContext value={exploreValue}>
      <main className={styles.layer}>
        {!full && (
          <div className={styles.top}>
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
