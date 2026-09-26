// The root frame around every screen: the one persistent map (shown only under ExploreLayout),
// the bottom nav (all screens but Welcome), focus-on-navigate and the Explore tab's memory.

import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router";
import type { LatLon } from "../api/types.ts";
import { MapView } from "../map/MapView.tsx";
import { MapCenterContext, MapSceneContext, type MapScene } from "../map/scene.ts";
import { useLocation as useRiderLocation } from "../state/location.tsx";
import styles from "./AppShell.module.css";
import { BottomNav } from "./BottomNav.tsx";
import { useFocusOnNavigate } from "./focus.ts";
import { rememberExploreUrl } from "./lastExplore.ts";
import { MapHostContext } from "./mapHost.ts";

export function AppShell() {
  const { pathname, search } = useLocation();
  const rider = useRiderLocation();
  useFocusOnNavigate();

  useEffect(() => {
    if (pathname === "/explore" || pathname.startsWith("/explore/")) rememberExploreUrl(pathname + search);
  }, [pathname, search]);

  const [mapVisible, setMapVisible] = useState(false);
  // Created on the first Explore visit, then kept (hidden) so camera and tiles survive other screens.
  const [mapMounted, setMapMounted] = useState(false);
  if (mapVisible && !mapMounted) setMapMounted(true);

  const [scene, setScene] = useState<MapScene>({});
  const [sheetH, setSheetH] = useState(0);
  const [center, setCenter] = useState<LatLon>();
  const [locateNonce, setLocateNonce] = useState(0);

  const host = useMemo(() => ({ sheetH, setSheetH, setMapVisible, locate: () => setLocateNonce((n) => n + 1) }), [sheetH]);

  return (
    <MapSceneContext value={setScene}>
      <MapCenterContext value={center}>
        <MapHostContext value={host}>
          <div className={styles.root}>
            <div className={styles.stage}>
              {mapMounted && (
                <div className={`${styles.map} ${mapVisible ? "" : styles.hidden}`}>
                  <MapView
                    scene={scene}
                    user={rider.status === "fix" ? rider.fix : undefined}
                    bottomPadding={sheetH}
                    locateNonce={locateNonce}
                    onCenterChange={setCenter}
                  />
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
