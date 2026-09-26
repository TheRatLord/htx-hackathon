// "82 montrose": the matching stops of route 82 in each direction, straight to the Route page.

import { useRoute } from "../../../api/hooks.ts";
import { useLang, useT } from "../../../i18n/index.ts";
import { directionWord } from "../../../lib/format.ts";
import { routeRef, useRoutesLoaded } from "../../../lib/routes.ts";
import { SectionHeader } from "../../../ui/SectionHeader.tsx";
import type { RouteStop } from "../route/routeGeo.ts";
import { stopMatches } from "../route/stopMatch.ts";
import { SEP, SimpleRow } from "./ResultRows.tsx";
import styles from "./Search.module.css";

interface Props {
  route: string;
  stop: string;
  onPick: (routeId: string, dir: 0 | 1, s: RouteStop) => void;
}

export function RouteStopShortcut({ route: typed, stop, onPick }: Props) {
  const t = useT();
  const lang = useLang();
  useRoutesLoaded();
  const known = routeRef(typed);
  const detail = useRoute(known?.id ?? "", { enabled: Boolean(known) });
  if (!known || !detail.data) return null;
  const { id: route, name } = known;
  const matches = detail.data.directions.flatMap((d) => d.stops.filter((s) => stopMatches(s, stop)).map((s) => ({ d, s })));
  if (!matches.length) return null;
  return (
    <section className={styles.section}>
      <SectionHeader tone="variant" label={t("search.routeStops", { route: name, q: stop })} />
      {matches.map(({ d, s }) => (
        <SimpleRow
          key={`${d.directionId}-${s.id}`}
          icon="bus_stop"
          title={`${t("stopLine.title", { name: s.name, id: s.id })}${SEP}${directionWord(d.label, lang)}`}
          onPress={() => onPick(route, d.directionId, s)}
        />
      ))}
    </section>
  );
}
