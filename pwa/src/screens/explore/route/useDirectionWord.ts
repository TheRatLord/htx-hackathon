import { hasKey, useT } from "../../../i18n/index.ts";

/** "Eastbound" (es "Rumbo este") for a route direction label; unknown labels stay as METRO wrote them. */
export function useDirectionWord(): (label: string) => string {
  const t = useT();
  return (label) => (hasKey(`dir.${label}`) ? t(`dir.${label}`) : label);
}
