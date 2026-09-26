import type { Cardinal, ClientRoute, StopKind } from "../../shared/types.ts";

/** Server-side stop record (server/data/generated/gtfs.json). */
export interface MetaStop {
  id: string;
  name: string;
  desc: string;
  lat: number;
  lon: number;
  dir?: Cardinal;
  bearing?: number;
  side?: string;
  /** Route ids served (boarding allowed). */
  routeIds: string[];
  kind: StopKind;
  wheelchair?: boolean;
}

export interface CalendarEntry {
  serviceId: string;
  /** Monday..Sunday */
  days: number[];
  start: string;
  end: string;
}

export interface GtfsMeta {
  feedVersion: string;
  feedStart: string;
  feedEnd: string;
  generatedAt: string;
  stops: MetaStop[];
  routes: ClientRoute[];
  /** Parallel arrays indexed by trip index (matches stop-times.bin). */
  trips: {
    ids: string[];
    route: number[];
    service: number[];
    direction: number[];
    headsign: number[];
  };
  headsigns: string[];
  services: string[];
  calendar: CalendarEntry[];
  calendarDates: { serviceId: string; date: string; type: 1 | 2 }[];
}

export interface SearchIndexEntry {
  id: string;
  name: string;
  /** Normalized tokens of name + description. */
  tokens: string[];
  /** Intersection key, e.g. "kirby|westheimer". */
  key: string | null;
}
