import { decodePolyline } from "../../server/lib/geo.ts";

/** An itinerary leg's encoded geometry as MapLibre [lon, lat] coordinates. */
export function legCoords(geometry: { polyline: string; precision: number }): [number, number][] {
  return decodePolyline(geometry.polyline, geometry.precision).map(([lat, lon]) => [lon, lat]);
}
