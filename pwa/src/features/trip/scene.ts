// An itinerary drawn on the shared map (spec D11–D13): dotted walks, rides in their route colour
// (the map adds the white casing), a blue origin, a red destination and labelled stop pins.

import { useEffect, useState } from "react";
import type { Itinerary, LatLon, TransitLeg } from "../../api/types.ts";
import { t, type Lang } from "../../i18n/index.ts";
import { legCoords } from "../../lib/polyline.ts";
import { useMapPadding, type MapScene } from "../../map/scene.ts";

type Markers = NonNullable<MapScene["markers"]>;

export function itineraryLegs(it: Itinerary): NonNullable<MapScene["legs"]> {
  return it.legs.map((l) => ({ coords: legCoords(l.geometry), kind: l.type === "walk" ? "walk" : "ride", color: l.type === "walk" ? "" : l.route.color }));
}

/** `hide`: board stops left out, e.g. one the scene enlarges with its own callout. */
export function itineraryMarkers(it: Itinerary, lang: Lang, hide: (string | undefined)[] = []): Markers {
  const first = it.legs[0];
  const last = it.legs.at(-1);
  const markers: Markers = [];
  if (first) markers.push({ id: "origin", point: first.type === "walk" ? first.from : first.board, kind: "origin" });
  it.legs
    .filter((l): l is TransitLeg => l.type === "transit")
    .forEach((l, ride) => {
      const id = l.board.id ?? "";
      if (hide.includes(id)) return;
      markers.push(
        ride === 0
          ? { id: `board-${id}`, point: l.board, kind: "board", label: t("plan.map.board", { route: l.route.name, id }, lang) }
          : { id: `transfer-${id}`, point: l.board, kind: "transfer", label: t("plan.map.transfer", { id }, lang) },
      );
    });
  if (last) markers.push({ id: "destination", point: last.type === "walk" ? last.to : last.alight, kind: "destination" });
  return markers;
}

/** The smallest box around every point, for `focus: { kind: "bounds" }`. */
export function boundsOf(points: LatLon[]): [LatLon, LatLon] | undefined {
  if (!points.length) return undefined;
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  return [
    { lat: Math.min(...lats), lon: Math.min(...lons) },
    { lat: Math.max(...lats), lon: Math.max(...lons) },
  ];
}

export function itineraryScene(it: Itinerary, lang: Lang): MapScene {
  const legs = itineraryLegs(it);
  const bounds = boundsOf(legs.flatMap((l) => l.coords.map(([lon, lat]) => ({ lat, lon }))));
  return { legs, markers: itineraryMarkers(it, lang), ...(bounds && { focus: { kind: "bounds", bounds } }) };
}

/** Sheet height after it stops moving, SETTLE_MS later: a scene that depends on it is re-fitted above the sheet. */
const SETTLE_MS = 300;

export function useSettledSheetHeight(): number {
  const { bottom } = useMapPadding();
  const [settled, setSettled] = useState(bottom);
  useEffect(() => {
    const id = setTimeout(() => setSettled(bottom), SETTLE_MS);
    return () => clearTimeout(id);
  }, [bottom]);
  return settled;
}
