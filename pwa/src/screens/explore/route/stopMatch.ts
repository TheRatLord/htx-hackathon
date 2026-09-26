// Matching a typed query against a route's stops (D9 "Find a stop", D5 "82 montrose").
// TODO(requests.md): import from src/lib/text.ts once it re-exports the server tokenizer.
import { tokenize } from "../../../../server/lib/text.ts";

const words = (s: string) => tokenize(s).filter((t) => t.role !== "connector").map((t) => t.text);

/**
 * True when every typed word starts a word of the stop name, or the query is the start of the stop
 * number. "&", "and" and "@" are the same, and so are "Road" and "Rd".
 */
export function stopMatches(stop: { id: string; name: string }, query: string): boolean {
  const q = query.trim().replace(/^#/, "");
  if (!q) return true;
  if (/^\d+$/.test(q)) return stop.id.startsWith(q);
  const want = words(q);
  const have = words(stop.name);
  return want.length > 0 && want.every((w) => have.some((h) => h.startsWith(w)));
}
