import { normalize } from "../../server/lib/text.ts";

export { normalize };

/** Live filter for stop lists: every query word must appear in the name, or the query is the stop id. */
export function matchesStop(query: string, stop: { id: string; name: string }): boolean {
  const q = normalize(query);
  if (!q) return true;
  if (/^\d+$/.test(q)) return stop.id.startsWith(q);
  const name = normalize(stop.name);
  return q.split(" ").every((w) => name.includes(w));
}
