// The Explore frame (G.3): one map, the search bar, the overlay slot, the FAB stack, the
// screen's bottom sheet and the bottom nav. Screens drive it through ExploreChrome.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { useAlerts } from "../../api/alertsStore.ts";
import { useLang, useT } from "../../i18n/index.ts";
import { formatClock } from "../../lib/format.ts";
import { MapView } from "../../map/MapView.tsx";
import { MapContext, type MapScene } from "../../map/scene.ts";
import type { LatLon } from "../../api/types.ts";
import { formatLatLon } from "../../lib/geo.ts";
import { useLocation as useRiderLocation } from "../../state/location.tsx";
import { useOnline } from "../../state/online.ts";
import { useTrip } from "../../state/trip.ts";
import { Fab } from "../../ui/Fab.tsx";
import { MapSearchBar } from "../../ui/MapSearchBar.tsx";
import { StatusBanner } from "../../ui/StatusBanner.tsx";
import { useToast } from "../../ui/Toast.tsx";
import type { FabProps, OverlayItem, Snap } from "../../ui/types.ts";
import { BottomNav } from "../BottomNav.tsx";
import { useFocusOnNavigate } from "../focus.ts";
import { rememberExploreUrl } from "../lastExplore.ts";
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
  const online = useOnline();
  const trip = useTrip();
  const alerts = useAlerts();
  const toast = useToast();
  useFocusOnNavigate();

  const [snap, setSnap] = usePerScreen<Snap>(location.pathname, "half");
  const [minHalf, setMinHalf] = usePerScreen<number | undefined>(location.pathname, undefined);
  const [chrome, setChrome] = useState<ExploreChromeOptions | null>(null);
  const [scene, setScene] = useState<MapScene>({});
  const [sheetH, setSheetH] = useState(0);
  const [center, setCenter] = useState<LatLon>();
  const observer = useRef<ResizeObserver | null>(null);

  useEffect(() => rememberExploreUrl(location.pathname + location.search), [location.pathname, location.search]);

  const sheetRef = useCallback((el: HTMLElement | null) => {
    observer.current?.disconnect();
    if (!el) return;
    observer.current = new ResizeObserver(([entry]) => setSheetH(entry.borderBoxSize[0]?.blockSize ?? el.offsetHeight));
    observer.current.observe(el);
  }, []);

  const [locateNonce, setLocateNonce] = useState(0);
  const onTrip = location.pathname === "/explore/trip";

  const overlay: OverlayItem | undefined = !online
    ? { kind: "offline" }
    : trip.active && !onTrip
      ? { kind: "trip-active", arriveAt: formatClock(trip.active.itinerary.endTime, lang), onOpen: () => navigate("/explore/trip") }
      : chrome?.banner === "search-this-area"
        ? { kind: "search-this-area", onPress: () => center && navigate(`/explore?at=${formatLatLon(center)}&label=${encodeURIComponent(t("map.thisArea"))}`) }
        : chrome?.banner
          ? { kind: chrome.banner }
          : undefined;

  const fabs: FabProps[] = (chrome?.fabs ?? DEFAULT_FABS).flatMap((f): FabProps[] => {
    if (f === "locate")
      return [{ kind: "locate", onPress: () => (rider.fix ? setLocateNonce((n) => n + 1) : toast({ message: t("map.noFix") })) }];
    if (f === "planTrip")
      return [trip.active ? { kind: "myTrip", onPress: () => navigate("/explore/trip") } : { kind: "planTrip", onPress: () => navigate("/explore/plan") }];
    const count = alerts.source === "unavailable" ? 0 : alerts.forRoute(f.routeId).length;
    return count ? [{ kind: "routeAlerts", count, onPress: () => navigate(`/more/alerts?route=${encodeURIComponent(f.routeId)}`) }] : [];
  });

  const exploreValue = useMemo(
    () => ({ snap, setSnap, minHalf, setMinHalf, setChrome, sheetRef }),
    [snap, setSnap, minHalf, setMinHalf, sheetRef],
  );
  const mapValue = useMemo(() => ({ scene, setScene, padding: { bottom: sheetH }, center }), [scene, sheetH, center]);
  const full = snap === "full";

  return (
    <ExploreContext value={exploreValue}>
      <MapContext value={mapValue}>
        <div className={styles.root}>
          <main className={styles.stage}>
            <MapView
              scene={scene}
              user={rider.status === "fix" ? rider.fix : undefined}
              bottomPadding={sheetH}
              locateNonce={locateNonce}
              onCenterChange={setCenter}
            />
            {!full && (
              <div className={styles.top}>
                {!chrome?.hideSearchBar && <MapSearchBar onPress={() => navigate("/explore/search")} />}
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
          <BottomNav />
        </div>
      </MapContext>
    </ExploreContext>
  );
}
