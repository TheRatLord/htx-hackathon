// A UH → Hobby Airport itinerary shaped like the recorded plan, for unit tests.

import type { Itinerary, PlanStop, TransitLeg, WalkLeg } from "../../api/types.ts";

const noGeometry = { polyline: "", precision: 6 };

export const UH: PlanStop = { name: "My current location", lat: 29.7199, lon: -95.3422 };
export const BOARD_80: PlanStop = { id: "11424", name: "M L King Blvd @ UH University Dr", lat: 29.718212, lon: -95.339505, directionLabel: "Southbound", side: "West side of M L King Blvd" };
export const ALIGHT_80: PlanStop = { id: "3938", name: "M L King Blvd @ Bellfort", lat: 29.666724, lon: -95.337365 };
export const BOARD_73: PlanStop = { id: "4789", name: "Bellfort Av @ M L King Blvd", lat: 29.666163, lon: -95.33749, side: "South side of Bellfort Av" };
export const HOBBY_STOP: PlanStop = { id: "10567", name: "Hobby Airport", lat: 29.65532, lon: -95.27577 };
export const HOBBY: PlanStop = { name: "Hobby Airport", lat: 29.655337, lon: -95.275771 };

function walk(from: PlanStop, to: PlanStop, start: string, end: string, distanceM: number): WalkLeg {
  return { type: "walk", from, to, startTime: start, endTime: end, durationMin: 1, distanceM, distanceText: "", instruction: "", walkDirectionsUrl: "", geometry: noGeometry };
}

function ride(route: string, headsign: string, board: PlanStop, alight: PlanStop, dep: string, arr: string, middle: string[], transfer?: TransitLeg["transfer"]): TransitLeg {
  return {
    type: "transit",
    mode: "bus",
    route: { id: route.padStart(3, "0"), name: route, longName: "", color: "#004080", textColor: "#FFFFFF" },
    headsign,
    tripId: `trip-${route}`,
    board,
    alight,
    departureTime: dep,
    arrivalTime: arr,
    durationMin: Math.round((Date.parse(arr) - Date.parse(dep)) / 60_000),
    numStops: middle.length + 1,
    intermediateStops: middle.map((id) => ({ id, name: `Stop ${id}` })),
    isRealtime: false,
    instruction: "",
    ...(transfer && { transfer }),
    geometry: noGeometry,
  };
}

export const itinerary: Itinerary = {
  id: "itin-0",
  startTime: "2026-09-25T23:59:00Z",
  endTime: "2026-09-26T00:49:00Z",
  durationMin: 50,
  transfers: 1,
  walkDistanceM: 490,
  walkDistanceText: "0.3 mi",
  hasTightTransfer: false,
  summary: "",
  legs: [
    walk(UH, BOARD_80, "2026-09-25T23:59:00Z", "2026-09-26T00:05:00Z", 407),
    ride("80", "MLK & PARK VILLAGE", BOARD_80, ALIGHT_80, "2026-09-26T00:05:00Z", "2026-09-26T00:25:00Z", ["11474", "1931", "3485"]),
    walk(ALIGHT_80, BOARD_73, "2026-09-26T00:25:00Z", "2026-09-26T00:27:00Z", 83),
    ride("73", "HOBBY AIRPORT", BOARD_73, HOBBY_STOP, "2026-09-26T00:36:00Z", "2026-09-26T00:48:00Z", ["4790"], { waitMin: 11, tight: false, sameStop: false }),
    walk(HOBBY_STOP, HOBBY, "2026-09-26T00:48:00Z", "2026-09-26T00:49:00Z", 0),
  ],
};
