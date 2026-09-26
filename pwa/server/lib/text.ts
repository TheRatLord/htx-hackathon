// Name cleanup, search normalization and fuzzy token matching.

const UPPER_WORDS = new Set([
  "UH", "TMC", "TC", "HCC", "NRG", "IAH", "MLK", "TSU", "NB", "SB", "EB", "WB", "FM", "US", "HISD",
  "VA", "YMCA", "NW", "SW", "NE", "SE", "II", "III", "IV", "ISD", "HPD", "MD", "UTMB", "P&R", "PR",
]);

/** Fix GTFS title-casing artifacts: "Uh" -> "UH", "Tmc" -> "TMC", "Greenspoint Tc" -> "Greenspoint TC". */
export function cleanName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[A-Za-z&]+/g, (w) => (UPPER_WORDS.has(w.toUpperCase()) && w !== w.toLowerCase() ? w.toUpperCase() : w));
}

const SUFFIXES: Record<string, string> = {
  street: "st", st: "st", str: "st",
  road: "rd", rd: "rd",
  drive: "dr", dr: "dr",
  avenue: "ave", ave: "ave", av: "ave",
  boulevard: "blvd", blvd: "blvd", bl: "blvd",
  parkway: "pkwy", pkwy: "pkwy", pky: "pkwy",
  freeway: "fwy", fwy: "fwy",
  highway: "hwy", hwy: "hwy",
  lane: "ln", ln: "ln",
  court: "ct", ct: "ct",
  place: "pl", pl: "pl",
  circle: "cir", cir: "cir",
  trail: "trl", trl: "trl",
  expressway: "expy", expy: "expy",
  way: "way",
};

const DIRECTIONALS: Record<string, string> = {
  north: "n", n: "n", south: "s", s: "s", east: "e", e: "e", west: "w", w: "w",
};

/** Words that join cross streets or add no meaning in a query. */
const CONNECTORS = new Set(["and", "at", "on", "near", "by", "of", "the", "corner", "intersection", "stop", "stn"]);

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\bmartin luther king( jr)?\b|\bm l king\b/g, "mlk")
    .replace(/\bp\s*&\s*r\b/g, "park and ride")
    .replace(/[@&/]/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type TokenRole = "core" | "suffix" | "dir" | "connector";

export interface Token {
  text: string;
  role: TokenRole;
}

export function tokenize(s: string): Token[] {
  return normalize(s)
    .split(" ")
    .filter(Boolean)
    .map((t): Token => {
      if (CONNECTORS.has(t)) return { text: t, role: "connector" };
      if (t in SUFFIXES) return { text: SUFFIXES[t], role: "suffix" };
      if (t in DIRECTIONALS) return { text: DIRECTIONALS[t], role: "dir" };
      return { text: t, role: "core" };
    });
}

/** Distinctive words of a street name: "W Westheimer Rd" -> ["westheimer"]. */
export function streetCore(street: string): string[] {
  const toks = tokenize(street).filter((t) => t.role === "core");
  // Streets named only by suffix/directional words ("N Loop") keep their raw tokens.
  return toks.length ? toks.map((t) => t.text) : tokenize(street).map((t) => t.text);
}

/**
 * Canonical intersection key: "Westheimer Rd @ Kirby Dr", "Kirby & Westheimer"
 * and "westheimer and kirby" all produce "kirby|westheimer".
 */
export function intersectionKey(name: string): string | null {
  const parts = name.split(/\s+(?:@|&|and|at)\s+/i);
  if (parts.length !== 2) return null;
  return parts
    .map((p) => streetCore(p).join(" "))
    .sort()
    .join("|");
}

/** Optimal string alignment distance, bailing out above `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2 = new Array<number>(b.length + 1).fill(0);
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur.push(v);
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
    prev2.splice(0, prev2.length, ...prev);
    prev = cur;
  }
  return prev[b.length];
}

/** Similarity of one query token against one candidate token (0..1). */
export function tokenSimilarity(q: string, c: string, allowPrefix: boolean): number {
  if (q === c) return 1;
  if (allowPrefix && q.length >= 2 && c.startsWith(q)) return 0.85;
  if (/^\d+$/.test(q) || /^\d+$/.test(c)) return 0;
  const max = q.length >= 7 ? 2 : q.length >= 4 ? 1 : 0;
  if (max && editDistance(q, c, max) <= max) return 0.7;
  return 0;
}

/**
 * Score how well a query matches candidate text. Every core query word must
 * match (street types and directions are optional); returns 0 when not.
 */
export function matchScore(queryTokens: Token[], candidate: string[]): number {
  const significant = queryTokens.filter((t) => t.role !== "connector");
  if (!significant.length) return 0;
  let total = 0;
  let weight = 0;
  significant.forEach((qt, i) => {
    const isLast = i === significant.length - 1;
    const best = Math.max(0, ...candidate.map((c) => tokenSimilarity(qt.text, c, isLast || qt.role === "core")));
    const w = qt.role === "core" ? 1 : 0.3;
    weight += w;
    total += best * w;
    if (qt.role === "core" && best === 0) total = -Infinity;
  });
  return total <= 0 ? 0 : total / weight;
}
