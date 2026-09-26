import type { Line, LineId, Place, SavedPlace, Stop, TimetableHour } from './types';

/**
 * Everything in this file is SAMPLE data for a design concept.
 * Only the Wheeler Transit Center Bay F stop name and the
 * "5 Eastbound to Richey St" route come from real app screenshots.
 */

/** The sample clock is frozen at 4:19 PM so every screen is repeatable. */
export const SAMPLE_NOW = 16 * 60 + 19;

export const LINES: Record<LineId, Line> = {
  '5': { id: '5', color: '#1c4f9c', kind: 'bus' },
  '25': { id: '25', color: '#1c4f9c', kind: 'bus' },
  '65': { id: '65', color: '#1c4f9c', kind: 'bus' },
  '700': { id: '700', color: '#c8102e', kind: 'bus' },
};

/** Colours for the A, B and C route options, drawn on the map together. */
export const OPTION_COLORS = {
  A: '#1c4f9c',
  B: '#0e7c86',
  C: '#7a4cc2',
} as const;

export const PLACES: Place[] = [
  {
    id: 'houston-zoo',
    name: 'Houston Zoo',
    area: 'Hermann Park',
    position: [-95.3895, 29.7148],
    keywords: ['zoo', 'animals', 'hermann'],
    category: 'attraction',
  },
  {
    id: 'mfah',
    name: 'Museum of Fine Arts',
    area: 'Museum District',
    position: [-95.3905, 29.7258],
    keywords: ['museum', 'art', 'mfah', 'fine arts'],
    category: 'museum',
  },
  {
    id: 'hermann-park',
    name: 'Hermann Park',
    area: 'Museum District',
    position: [-95.3925, 29.7185],
    keywords: ['park', 'lake', 'hermann'],
    category: 'park',
  },
  {
    id: 'heb-midtown',
    name: 'H-E-B',
    area: 'Midtown',
    position: [-95.3745, 29.7335],
    keywords: ['heb', 'grocery', 'store', 'food'],
    category: 'shopping',
  },
  {
    id: 'place-home',
    name: 'Home',
    area: 'Montrose · sample address',
    position: [-95.3985, 29.7461],
    keywords: ['home'],
    category: 'saved',
  },
  {
    id: 'place-work',
    name: 'Work',
    area: 'Downtown · sample address',
    position: [-95.3668, 29.7561],
    keywords: ['work', 'office', 'downtown'],
    category: 'saved',
  },
];

export const SAVED_PLACES: SavedPlace[] = [
  { id: 'home', label: 'Home', placeId: 'place-home', icon: 'home' },
  { id: 'work', label: 'Work', placeId: 'place-work', icon: 'work' },
];

function timetable(rows: [number, number[]][]): TimetableHour[] {
  return rows.map(([hour, minutes]) => ({ hour, minutes }));
}

export const STOPS: Stop[] = [
  {
    id: 'wheeler-bay-f',
    name: 'Wheeler Transit Center · Bay F',
    code: '11030',
    position: [-95.3829, 29.7412],
    routes: [
      {
        lineId: '5',
        direction: 'Eastbound',
        headsign: 'Richey St',
        upcoming: [
          { inMinutes: 6, status: 'live' },
          { inMinutes: 36, status: 'scheduled' },
          { inMinutes: 65, status: 'scheduled' },
        ],
        timetable: timetable([
          [16, [25, 55]],
          [17, [25, 55]],
          [18, [25, 55]],
          [19, [35]],
          [20, [20]],
          [21, [5]],
        ]),
        tracking: { status: 'ok' },
      },
    ],
  },
  {
    id: 'fannin-alabama',
    name: 'Fannin St @ Alabama St',
    position: [-95.38, 29.7395],
    routes: [
      {
        lineId: '25',
        direction: 'Westbound',
        headsign: 'Richmond Ave',
        upcoming: [
          { inMinutes: 12, status: 'scheduled' },
          { inMinutes: 42, status: 'scheduled' },
          { inMinutes: 72, status: 'scheduled' },
        ],
        timetable: timetable([
          [16, [1, 31]],
          [17, [1, 31]],
          [18, [1, 31]],
          [19, [1, 41]],
          [20, [21]],
          [21, [1]],
        ]),
        tracking: { status: 'ok' },
      },
      {
        lineId: '65',
        direction: 'Westbound',
        headsign: 'Synott Rd',
        upcoming: [
          { inMinutes: 18, status: 'scheduled' },
          { inMinutes: 48, status: 'scheduled' },
          { inMinutes: 78, status: 'scheduled' },
        ],
        timetable: timetable([
          [16, [37, 57]],
          [17, [17, 37, 57]],
          [18, [17, 37, 57]],
          [19, [27, 57]],
          [20, [27, 57]],
          [21, [27]],
        ]),
        tracking: { status: 'lost', lostMinutesAgo: 4 },
      },
    ],
  },
  {
    id: 'almeda-tuam',
    name: 'Almeda Rd @ Tuam St',
    position: [-95.3771, 29.7412],
    routes: [
      {
        lineId: '700',
        direction: 'Outbound',
        headsign: 'TMC Transit Center',
        upcoming: [
          { inMinutes: 9, status: 'live' },
          { inMinutes: 24, status: 'live' },
          { inMinutes: 39, status: 'scheduled' },
        ],
        timetable: timetable([
          [16, [13, 28, 43, 58]],
          [17, [13, 28, 43, 58]],
          [18, [13, 28, 43, 58]],
          [19, [13, 43]],
          [20, [13, 43]],
          [21, [13]],
        ]),
        tracking: { status: 'ok' },
      },
    ],
  },
];

export function getPlace(id: string): Place | undefined {
  return PLACES.find((p) => p.id === id);
}

export function getStop(id: string): Stop | undefined {
  return STOPS.find((s) => s.id === id);
}

/** Case-insensitive search over name, area and keywords. Empty query gives nothing. */
export function searchPlaces(query: string): Place[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return PLACES.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.area.toLowerCase().includes(q) ||
      p.keywords.some((k) => k.includes(q) || q.includes(k)),
  );
}
