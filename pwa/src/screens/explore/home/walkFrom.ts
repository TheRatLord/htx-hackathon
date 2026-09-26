// D4: the short "walk from …" label under a card's walk time ("from the museum").

import { t, type Lang } from "../../../i18n/index.ts";

const KINDS: [RegExp, string][] = [
  [/museum|museo/i, "museum"],
  [/airport|aeropuerto/i, "airport"],
  [/stadium|park\b.*field|arena|estadio/i, "stadium"],
  [/park|parque/i, "park"],
  [/hospital|medical|clinic/i, "hospital"],
  [/university|college|campus|universidad/i, "university"],
  [/station|estación/i, "station"],
];

export function walkFromLabel(place: string, lang: Lang): string {
  const kind = KINDS.find(([re]) => re.test(place))?.[1] ?? "other";
  return t(`home.walkFrom.${kind}`, undefined, lang);
}
