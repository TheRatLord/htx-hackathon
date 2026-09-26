// The URL contract (spec G.3): the logical parent of each screen, for "‹ Back" on a cold deep link.

import { parsePlanQuery, planUrl } from "../lib/planQuery.ts";

const PARENTS: [RegExp, (m: RegExpMatchArray, query: URLSearchParams) => string][] = [
  // Full Schedule and Walk return to the Stop sheet with the same route expanded.
  [/^\/explore\/stop\/([^/]+)\/(schedule|walk)$/, (m, q) => `/explore/stop/${m[1]}${q.get("route") ? `?route=${encodeURIComponent(q.get("route")!)}` : ""}`],
  // An itinerary returns to its list, keeping the trip.
  [/^\/explore\/plan\/\d+$/, (_, q) => planUrl(parsePlanQuery(q))],
  [/^\/explore\/.+$/, () => "/explore"],
  [/^\/more\/alerts\/.+$/, () => "/more/alerts"],
  [/^\/more\/.+$/, () => "/more"],
];

export function parentOf(pathname: string, search = ""): string {
  const query = new URLSearchParams(search);
  for (const [re, parent] of PARENTS) {
    const m = pathname.match(re);
    if (m) return parent(m, query);
  }
  return "/explore";
}

/** Deep links that render without the welcome screen, so a shared link always works (D1). */
export const WELCOME_EXEMPT = [/^\/explore\/stop\//, /^\/explore\/route\//, /^\/explore\/tc\//, /^\/more\/alerts/, /^\/fares/];
