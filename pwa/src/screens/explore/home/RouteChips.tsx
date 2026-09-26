import type { RouteRef } from "../../../api/types.ts";
import { useT } from "../../../i18n/index.ts";
import { ChipRow } from "../../../ui/ChipRow.tsx";
import { RouteBadge } from "../../../ui/RouteBadge.tsx";

interface RouteChipsProps {
  routes: RouteRef[];
  selectedId?: string;
  onPress: (route: RouteRef) => void;
}

/** D2 item 4: "Routes here:" (near the rider or a place alike) and one chip per route near the anchor. Once one is chosen (D3) the chips speak for themselves. */
export function RouteChips({ routes, selectedId, onPress }: RouteChipsProps) {
  const t = useT();
  if (!routes.length) return null;
  return (
    <ChipRow label={selectedId ? undefined : t("home.chipLabel")} ariaLabel={t("home.chipGroup")} inlineLabel>
      {routes.map((r) => (
        <RouteBadge
          key={r.id}
          route={r}
          size="md"
          selected={r.id === selectedId}
          ariaLabel={t("routeName.filterA11y", { name: r.name })}
          onPress={() => onPress(r)}
        />
      ))}
    </ChipRow>
  );
}
