// The root frame around every screen: the one persistent map (shown only under ExploreLayout),
// the bottom nav (all screens but Welcome), focus-on-navigate and the Explore tab's memory.

import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigationType } from "react-router";
import type { LatLon } from "../api/types.ts";
import { MapCenterContext, MapSceneContext, type MapScene } from "../map/scene.ts";
import { useLocation as useRiderLocation } from "../state/location.tsx";
import styles from "./AppShell.module.css";
import { BottomNav } from "./BottomNav.tsx";
import { useFocusOnNavigate } from "./focus.ts";
import { rememberExploreUrl } from "./lastExplore.ts";
import { MapHostContext } from "./mapHost.ts";
import { recordEntry } from "./tabEntries.ts";

/**
 * MapLibre (about 285 kB gzipped, and its CSS) loads with the first Explore visit, not with every
 * cold start: Welcome, Fares, Recent and More never show the map.
 */
const MapView = lazy(() => import("../map/MapView.tsx").then((m) => ({ default: m.MapView })));

export function AppShell() {
  const { pathname, search, key } = useLocation();
  const navType = useNavigationType();
  const rider = useRiderLocation();
  useFocusOnNavigate();

  useEffect(() => {
    if (pathname === "/explore" || pathname.startsWith("/explore/")) rememberExploreUrl(pathname + search);
  }, [pathname, search]);

  useEffect(() => {
    recordEntry((window.history.state as { idx?: number } | null)?.idx ?? 0, navType);
  }, [key, navType]);

  const [mapVisible, setMapVisible] = useState(false);
  // Created on the first Explore visit, then kept (hidden) so camera and tiles survive other screens.
  const [mapMounted, setMapMounted] = useState(false);
  if (mapVisible && !mapMounted) setMapMounted(true);

  const [scene, setScene] = useState<MapScene>({});
  const [sheetH, setSheetH] = useState(0);
  const [center, setCenter] = useState<LatLon>();
  const [locateNonce, setLocateNonce] = useState(0);
  // Follow mode belongs to the screen Locate was pressed on: another screen frames its own scene.
  const [followPath, setFollowPath] = useState<string>();
  const following = followPath === pathname;
  useEffect(() => {
    setFollowPath((p) => (p === pathname ? p : undefined));
  }, [pathname]);
  const endFollow = useCallback(() => setFollowPath(undefined), []);

  const host = useMemo(
    () => ({
      sheetH,
      setSheetH,
      setMapVisible,
      following,
      locate: () => {
        setFollowPath(pathname);
        setLocateNonce((n) => n + 1);
      },
    }),
    [sheetH, following, pathname],
  );

  return (
    <MapSceneContext value={setScene}>
      <MapCenterContext value={center}>
        <MapHostContext value={host}>
          <div className={styles.root}>
            <div className={styles.stage}>
              {mapMounted && (
                <div className={`${styles.map} ${mapVisible ? "" : styles.hidden}`}>
                  <Suspense fallback={null}>
                    <MapView
                      scene={scene}
                      user={rider.status === "fix" ? rider.fix : undefined}
                      bottomPadding={sheetH}
                      locateNonce={locateNonce}
                      following={following}
                      onFollowEnd={endFollow}
                      onCenterChange={setCenter}
                    />
                  </Suspense>
                </div>
              )}
              <Outlet />
            </div>
            {pathname !== "/welcome" && <BottomNav />}
          </div>
        </MapHostContext>
      </MapCenterContext>
    </MapSceneContext>
  );
}
