// Geocoding via Photon (OpenStreetMap), biased to the Houston area.

import type { LatLon } from "../../shared/types.ts";
import { TtlCache } from "../lib/cache.ts";
import { normalize } from "../lib/text.ts";
import { fetchUpstream } from "../lib/upstream.ts";

const PHOTON = "https://photon.komoot.io/api/";
/** Greater Houston / METRO service area (minLon,minLat,maxLon,maxLat). */
const HOUSTON_BBOX = "-95.95,29.45,-94.9,30.25";
export const HOUSTON_CENTER: LatLon = { lat: 29.7604, lon: -95.3698 };

export interface Place {
  name: string;
  address?: string;
  lat: number;
  lon: number;
  kind: string;
}

export type PlaceProvider = (q: string, near: LatLon) => Promise<Place[]>;

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    housenumber?: string;
    street?: string;
    district?: string;
    city?: string;
    osm_value?: string;
  };
}

const cache = new TtlCache<Place[]>(24 * 3600_000, 1000);

export const photonPlaces: PlaceProvider = (q, near) => {
  const key = normalize(q);
  return cache.get(key, async () => {
    const params = new URLSearchParams({
      q,
      lat: near.lat.toFixed(3),
      lon: near.lon.toFixed(3),
      limit: "8",
      bbox: HOUSTON_BBOX,
      lang: "en",
    });
    const { body } = await fetchUpstream<{ features: PhotonFeature[] }>({
      service: "photon",
      url: `${PHOTON}?${params}`,
      fixtureKey: `search/${key}`,
      timeoutMs: 4000,
    });
    return body.features.flatMap((f): Place[] => {
      const p = f.properties;
      const street = [p.housenumber, p.street].filter(Boolean).join(" ");
      const name = p.name ?? street;
      if (!name) return [];
      const address = [street && street !== name ? street : "", p.district ?? p.city].filter(Boolean).join(", ");
      return [{ name, ...(address && { address }), lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], kind: p.osm_value ?? "place" }];
    });
  });
};
