// "82 montrose": the matching stops of route 82 in each direction, straight to the Route page.

import { useRoute } from "../../../api/hooks.ts";
import { useT } from "../../../i18n/index.ts";
import { routeRef, useRoutesLoaded } from "../../../lib/routes.ts";
import { SectionHeader } from "../../../ui/SectionHeader.tsx";
import type { RouteStop } from "../route/routeGeo.ts";
import { stopMatches } from "../route/stopMatch.ts";
import { useDirectionWord } from "../route/useDirectionWord.ts";
import { SEP, SimpleRow } from "./ResultRows.tsx";
import styles from "./Search.module.css";

interface Props {
  route: string;
  stop: string;
  onPick: (routeId: string, dir: 0 | 1, s: RouteStop) => void;
}

export function RouteStopShortcut(props: Props) {
  useRoutesLoaded();
  const known = routeRef(props.route);
  return known ? <Matches {...props} route={known.id} name={known.name} /> : null;
}

function Matches({ route, name, stop, onPick }: Props & { name: string }) {
  const t = useT();
  const dirLabel = useDirectionWord();
  const detail = useRoute(route);
  if (!detail.data) return null;
  const matches = detail.data.directions.flatMap((d) => d.stops.filter((s) => stopMatches(s, stop)).map((s) => ({ d, s })));
  if (!matches.length) return null;
  return (
    <section className={styles.section}>
      <SectionHeader tone="variant" label={t("search.routeStops", { route: name, q: stop })} />
      {matches.map(({ d, s }) => (
        <SimpleRow
          key={`${d.directionId}-${s.id}`}
          icon="bus_stop"
          title={`${t("stopLine.title", { name: s.name, id: s.id })}${SEP}${dirLabel(d.label)}`}
          onPress={() => onPick(route, d.directionId, s)}
        />
      ))}
    </section>
  );
}
