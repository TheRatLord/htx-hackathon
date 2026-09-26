// The rider's location (spec C.17). "Finding" states (unknown / prompt / granted-waiting)
// and "off" states (denied / unavailable) must never be conflated by screens.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { LatLon } from "../api/types.ts";
import { parseLatLon } from "../lib/geo.ts";
import { readJson, writeJson } from "../lib/storage.ts";

export type LocationStatus = "unknown" | "prompt" | "granted-waiting" | "fix" | "denied" | "unavailable";

export interface Fix extends LatLon {
  accuracyM: number;
  at: number;
}

export interface LocationState {
  status: LocationStatus;
  fix?: Fix;
  /** True when the fix comes from `?demoLoc=` (the UI shows the "Demo location" chip). */
  demo: boolean;
  /**
   * True once watching has started (permission already granted, or request() called). `prompt`
   * with `requested === false` means nobody has asked yet: show "Turn on location", not a spinner.
   */
  requested: boolean;
  /** Starts (or restarts, after `unavailable`) watching; the browser asks for permission if needed. */
  request(): void;
}

const NO_FIX_TIMEOUT_MS = 15_000;
const DEMO_KEY = "ridemetro.demoLoc";

/** `?demoLoc=lat,lon` pins the fix for emulator screenshots; `?demoLoc=off` clears it. */
function demoLocation(): LatLon | undefined {
  const param = new URLSearchParams(location.search).get("demoLoc");
  if (param === "off") writeJson(DEMO_KEY, undefined, "session");
  else if (param && parseLatLon(param)) writeJson(DEMO_KEY, param, "session");
  return parseLatLon(readJson<string | null>(DEMO_KEY, null, "session"));
}

const LocationContext = createContext<LocationState | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [demo] = useState(demoLocation);
  const [status, setStatus] = useState<LocationStatus>(demo ? "fix" : "unknown");
  const [fix, setFix] = useState<Fix | undefined>(demo && { ...demo, accuracyM: 5, at: Date.now() });
  // Watching starts once permission is granted or the rider asks; each request() restarts it.
  const [requests, setRequests] = useState(0);
  const hasFix = useRef(false);

  useEffect(() => {
    if (demo) return;
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }
    let perm: PermissionStatus | undefined;
    const onChange = () => {
      if (!perm) return;
      if (perm.state === "granted") setRequests((n) => n + 1);
      else if (perm.state === "denied") setStatus("denied");
      else if (!hasFix.current) setStatus("prompt");
    };
    if (!navigator.permissions) {
      setStatus("prompt");
      return;
    }
    navigator.permissions
      .query({ name: "geolocation" })
      .then((p) => {
        perm = p;
        p.addEventListener("change", onChange);
        onChange();
      })
      .catch(() => setStatus("prompt"));
    return () => perm?.removeEventListener("change", onChange);
  }, [demo]);

  useEffect(() => {
    if (demo || !requests) return;
    let watchId: number | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      if (watchId !== undefined) return;
      if (!hasFix.current) setStatus("granted-waiting");
      timeout = setTimeout(() => !hasFix.current && setStatus("unavailable"), NO_FIX_TIMEOUT_MS);
      watchId = navigator.geolocation.watchPosition(
        (p) => {
          hasFix.current = true;
          clearTimeout(timeout);
          setFix({ lat: p.coords.latitude, lon: p.coords.longitude, accuracyM: p.coords.accuracy, at: p.timestamp });
          setStatus("fix");
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            clearTimeout(timeout);
            setStatus("denied");
          }
        },
        { enableHighAccuracy: true, maximumAge: 10_000 },
      );
    };
    const stop = () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
      clearTimeout(timeout);
      watchId = undefined;
    };
    const onVisibility = () => (document.visibilityState === "visible" ? start() : stop());
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [demo, requests]);

  const request = useCallback(() => setRequests((n) => n + 1), []);
  const value = useMemo(
    () => ({ status, fix, demo: Boolean(demo), requested: Boolean(demo) || requests > 0, request }),
    [status, fix, demo, requests, request],
  );
  return <LocationContext value={value}>{children}</LocationContext>;
}

export function useLocation(): LocationState {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used inside <LocationProvider>");
  return ctx;
}

export const isFinding = (s: LocationStatus) => s === "unknown" || s === "prompt" || s === "granted-waiting";
export const isOff = (s: LocationStatus) => s === "denied" || s === "unavailable";
