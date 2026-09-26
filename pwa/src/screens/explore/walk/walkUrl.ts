// The D8 URL, built in one place for every link that opens Walk (cards, Stop sheet, TC card).

export interface WalkLink {
  /** The distance the link's screen showed, so Walk starts from the same minutes (C.17). */
  d?: number;
  /** D4: walk from a place rather than the rider. */
  from?: string;
  fromName?: string;
  route?: string;
}

export function walkUrl(stopId: string, link: WalkLink = {}): string {
  const q = new URLSearchParams();
  if (link.from) q.set("from", link.from);
  if (link.fromName) q.set("fromName", link.fromName);
  if (link.route) q.set("route", link.route);
  if (link.d !== undefined) q.set("d", String(Math.round(link.d)));
  const qs = q.toString();
  return `/explore/stop/${encodeURIComponent(stopId)}/walk${qs ? `?${qs}` : ""}`;
}
