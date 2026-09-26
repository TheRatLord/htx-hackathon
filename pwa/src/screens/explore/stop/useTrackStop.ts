// D6 Track Bus Stop: while on, the expanded route's next bus fires one alert when it is 5 min away.
// It works only while this screen is open (no background tracking, A.1.9).

import { useEffect, useRef } from "react";
import type { Dep } from "../../../api/types.ts";
import { useT } from "../../../i18n/index.ts";
import { upcoming } from "../../../lib/format.ts";
import { BUZZ, notify, notifyPermission, vibrate } from "../../../lib/notify.ts";
import { useNow } from "../../../state/clock.ts";
import { useToast } from "../../../ui/Toast.tsx";

const ALERT_MS = 5 * 60_000;

interface Tracked {
  on: boolean;
  deps: Dep[];
  routeName: string;
  headsign: string;
  stopName: string;
}

export function useTrackStop({ on, deps, routeName, headsign, stopName }: Tracked): void {
  const t = useT();
  const toast = useToast();
  const now = useNow();
  const fired = useRef(new Set<string>());
  const next = upcoming(deps, now).find((d) => !d.canceled);
  const due = on && next !== undefined && Date.parse(next.departureTime) - now <= ALERT_MS;

  useEffect(() => {
    if (!due || !next || fired.current.has(next.tripId)) return;
    fired.current.add(next.tripId);
    const title = t("stop.trackToast", { name: routeName });
    toast({ message: title });
    // A granted notification buzzes by itself.
    if (notifyPermission() === "granted") void notify(title, t("stop.trackBody", { headsign, stop: stopName }), `track-${next.tripId}`);
    else vibrate(BUZZ);
  }, [due, next, t, toast, routeName, headsign, stopName]);
}
