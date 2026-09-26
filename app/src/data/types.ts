/** [longitude, latitude], the order MapLibre and GeoJSON use. */
export type LngLat = [number, number];

/** Minutes since midnight on the sample day. */
export type ClockMinutes = number;

/** How trustworthy a time is. Shown on every time in the app. */
export type TimeStatus = 'live' | 'scheduled' | 'lost';

export type LineId = '5' | '25' | '65' | '700';

export interface Line {
  id: LineId;
  /** Colour of the band on the route-number card. */
  color: string;
  kind: 'bus' | 'rail';
}

export interface Place {
  id: string;
  name: string;
  /** Second line in search results, e.g. neighbourhood. */
  area: string;
  position: LngLat;
  /** Extra words that should match in search ("zoo" finds Houston Zoo). */
  keywords: string[];
  category: 'attraction' | 'museum' | 'park' | 'shopping' | 'saved';
}

export interface SavedPlace {
  id: 'home' | 'work';
  label: string;
  placeId: string;
  icon: 'home' | 'work';
}

export interface Arrival {
  /** Minutes from the sample "now". */
  inMinutes: number;
  status: Exclude<TimeStatus, 'lost'>;
}

export interface TimetableHour {
  /** 0-23 */
  hour: number;
  minutes: number[];
}

export interface StopRoute {
  lineId: LineId;
  direction: 'Eastbound' | 'Westbound' | 'Northbound' | 'Southbound' | 'Outbound' | 'Inbound';
  headsign: string;
  upcoming: Arrival[];
  timetable: TimetableHour[];
  tracking: { status: 'ok' } | { status: 'lost'; lostMinutesAgo: number };
}

export interface Stop {
  id: string;
  name: string;
  /** Kept as a sample of METRO's own stop IDs. Not shown on pins. */
  code?: string;
  position: LngLat;
  routes: StopRoute[];
}

export type Leg =
  | { kind: 'walk'; minutes: number; to: string; path: LngLat[] }
  | {
      kind: 'ride';
      lineId: LineId;
      direction: StopRoute['direction'];
      headsign: string;
      board: string;
      alight: string;
      departAt: ClockMinutes;
      rideMinutes: number;
      status: TimeStatus;
      path: LngLat[];
    }
  | { kind: 'wait'; minutes: number; at: string };

export type RouteOptionId = 'A' | 'B' | 'C';

export interface RouteOption {
  id: RouteOptionId;
  color: string;
  leaveBy: ClockMinutes;
  arriveAt: ClockMinutes;
  legs: Leg[];
}

export interface SavedTrip {
  id: string;
  placeId: string;
  optionId: RouteOptionId;
  /** e.g. "Route 700 + 65 · 34 min" */
  summary: string;
  savedAt: number;
}
