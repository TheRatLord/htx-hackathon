// Pieces shared by More (D18) and Settings (D19).

import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import type { useT } from "../../i18n/index.ts";
import { notifyPermission } from "../../lib/notify.ts";
import type { LocationState } from "../../state/location.tsx";
import { setPrefs } from "../../state/prefs.ts";

type T = ReturnType<typeof useT>;

/** "On", "Finding your location…", "Blocked in browser settings", "Can't find your location" or "Not asked yet". */
export function locationStatusText(loc: Pick<LocationState, "status" | "requested">, t: T): string {
  switch (loc.status) {
    case "fix":
      return t("more.locationStatus.on");
    case "denied":
      return t("more.locationStatus.blocked");
    case "unavailable":
      return t("more.locationStatus.unavailable");
    case "prompt":
      return loc.requested ? t("more.locationStatus.finding") : t("more.locationStatus.notAsked");
    default:
      return t("more.locationStatus.finding");
  }
}

export function notifyStatusText(t: T): string {
  return t(`more.notifyStatus.${notifyPermission()}`);
}

/** "Show welcome again": Welcome shows until the rider leaves it again. */
export function useShowWelcome(): () => void {
  const navigate = useNavigate();
  return () => {
    setPrefs({ welcomed: false });
    navigate("/welcome");
  };
}

/** Scrolls to the element named by the URL hash (/more/settings#text-size, /fares#reduced). */
export function useScrollToHash(): void {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
  }, [hash]);
}
