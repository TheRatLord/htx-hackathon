// Matching a typed query against a route's stops (D9 "Find a stop", D5 "82 montrose").
// A small local normaliser, so the web bundle doesn't pull in the server's search code.

/** Street words riders type in full or short ("Road" and "Rd" are the same word). */
const SHORT: Record<string, string> = {
  street: "st", road: "rd", drive: "dr", avenue: "ave", boulevard: "blvd", parkway: "pkwy",
  freeway: "fwy", highway: "hwy", lane: "ln", court: "ct", place: "pl", circle: "cir",
};
/** Words that join cross streets ("&", "@" and "/" become "and"). */
const CONNECTORS = new Set(["and", "at"]);

const words = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[@&/]/g, " and ")
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !CONNECTORS.has(w))
    .map((w) => SHORT[w] ?? w);

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
