import type { Arrival } from "../../../api/types.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { departureA11y, headsignLine, upcoming } from "../../../lib/format.ts";
import { useNow } from "../../../state/clock.ts";
import { useOffline } from "../../../state/offline.ts";
import { DepTimes } from "../../../ui/DepTimes.tsx";
import { Icon } from "../../../ui/Icon.tsx";
import { RouteBadge } from "../../../ui/RouteBadge.tsx";
import { refOfServing } from "./refs.ts";
import type { Serving } from "./serving.ts";
import styles from "./StopSheet.module.css";

/** D6: a route that is not expanded: badge, headsign, 2 times. Tapping expands it. */
export function CollapsedRoute({ entry, deps, onExpand }: { entry: Serving; deps: Arrival[]; onExpand: () => void }) {
  const t = useT();
  const lang = useLang();
  const now = useNow();
  const offline = useOffline();
  const route = refOfServing(entry);
  const headline = headsignLine(route, entry.directionLabel, entry.headsign, lang);
  const next = upcoming(deps, now).slice(0, 2);
  const times = next.length ? next.map((d) => departureA11y(d, now, { offline, lang })).join(`; ${t("card.then")} `) : t("strip.noBuses3h");
  return (
    <button
      type="button"
      className={styles.collapsed}
      aria-expanded={false}
      aria-label={`${t("routeName.a11y", { name: entry.name })} ${headline}, ${times}`}
      onClick={onExpand}
    >
      <RouteBadge route={route} size="sm" />
      <span className={styles.routeText}>
        <span className={styles.headsign}>{headline}</span>
        {next.length ? <DepTimes deps={next} /> : <span className={styles.noService}>{t("strip.noBuses3h")}</span>}
      </span>
      <Icon name="chevron_right" />
    </button>
  );
}
