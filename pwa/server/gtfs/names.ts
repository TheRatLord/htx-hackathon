import { cleanName } from "../lib/text.ts";

const RAIL_NAMES: Record<string, string> = { "700": "Red", "800": "Green", "900": "Purple" };

/** "080" -> "80"; rail lines use their color name. */
export function displayRouteName(shortName: string): string {
  return RAIL_NAMES[shortName] ?? shortName.replace(/^0+(?=\d)/, "");
}

/** "METRORAIL RED LINE" -> "METRORail Red Line"; other long names are already readable. */
export function cleanRouteLongName(longName: string): string {
  if (longName !== longName.toUpperCase()) return cleanName(longName);
  return longName
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
    .replace(/\bMetrorail\b/, "METRORail");
}
