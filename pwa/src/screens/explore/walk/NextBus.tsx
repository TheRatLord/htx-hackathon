import { useArrivals } from "../../../api/hooks.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { departureView, upcoming } from "../../../lib/format.ts";
import { canonicalRouteId, routeRef, useRoutesLoaded } from "../../../lib/routes.ts";
import { canMakeIt } from "../../../lib/walk.ts";
import { useNow } from "../../../state/clock.ts";
import { useOffline } from "../../../state/offline.ts";
import { Icon } from "../../../ui/Icon.tsx";
import { RouteBadge } from "../../../ui/RouteBadge.tsx";
import { Skeleton } from "../../../ui/Skeleton.tsx";
import { refOfArrival } from "../stop/refs.ts";
import styles from "./Walk.module.css";

const ARRIVALS = 6;

/** "[40] next bus: 16 min. You have time." with the one "can I make it" rule (C.17). */
export function NextBus({ stopId, routeId, walkMin }: { stopId: string; routeId?: string; walkMin?: number }) {
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const offline = useOffline();
  useRoutesLoaded();
  const route = routeId ? canonicalRouteId(routeId) : undefined;
  const arrivals = useArrivals(stopId, { route, limit: ARRIVALS });
  if (!arrivals.data) return arrivals.isError ? <p className={styles.box}>{t("walk.nextBusError")}</p> : <Skeleton variant="row" />;

  const deps = upcoming(arrivals.data.arrivals, now).filter((d) => !d.canceled);
  const first = deps[0];
  if (!first) {
    const text = route ? t("walk.noBus", { route: routeRef(route)?.name ?? routeId! }) : t("strip.noBuses3h");
    return <p className={styles.box}>{text}</p>;
  }
  // Without ?route=, the soonest route; then only that route's buses count as "the next one".
  const same = deps.filter((d) => d.routeId === first.routeId);
  const shown = (d: typeof first) => departureView(d, now, { offline, lang }).text;
  const verdict = walkMin === undefined ? undefined : canMakeIt(walkMin, first, now);
  const later = verdict === "no" ? same.find((d) => canMakeIt(walkMin!, d, now) !== "no") : undefined;

  return (
    <div className={styles.box}>
      <p className={styles.nextBus}>
        <RouteBadge route={refOfArrival(first)} size="sm" />
        {t("walk.nextBus", { time: shown(first) })}
      </p>
      {verdict && (
        <p className={verdict === "yes" ? styles.ok : styles.warn}>
          {verdict !== "yes" && <Icon name="warning" size={20} color="var(--c-alert-icon)" />}
          {t(`canMakeIt.${verdict}`)} {later && t("walk.nextOne", { time: shown(later) })}
        </p>
      )}
    </div>
  );
}
