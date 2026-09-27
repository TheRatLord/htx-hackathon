// An itinerary drawn on the shared map (spec D11–D13): dotted walks, rides in their route colour
// (the map adds the white casing), a blue origin, a red destination and labelled stop pins.

import type { Itinerary, TransitLeg } from "../../api/types.ts";
import { t, type Lang } from "../../i18n/index.ts";
import { boundsOf } from "../../lib/geo.ts";
import { legCoords } from "../../lib/polyline.ts";
import type { MapScene } from "../../map/scene.ts";

type Markers = NonNullable<MapScene["markers"]>;

/** With two or more rides, each ride is labelled with its route ("80", "73") so the transfer shows (25). */
export function itineraryLegs(it: Itinerary): NonNullable<MapScene["legs"]> {
  const rides = it.legs.filter((l) => l.type === "transit").length;
  return it.legs.map((l) => ({
    coords: legCoords(l.geometry),
    ...(l.type === "walk" ? { kind: "walk" } : { kind: "ride", color: l.route.color, ...(rides > 1 && { label: l.route.name }) }),
  }));
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

/**
 * Select Itinerary: `it` drawn as usual, the other options faded under it, and the camera framing
 * them all, so tapping another card redraws the lines without moving the map.
 */
export function planScene(it: Itinerary, others: Itinerary[], lang: Lang): MapScene {
  const altLegs = others.filter((o) => o.id !== it.id).flatMap((o) => itineraryLegs(o).map(({ coords, kind }) => ({ coords, kind })));
  const scene = itineraryScene(it, lang);
  const all = [...(scene.legs ?? []), ...altLegs];
  const bounds = boundsOf(all.flatMap((l) => l.coords.map(([lon, lat]) => ({ lat, lon }))));
  return { ...scene, altLegs, ...(bounds && { focus: { kind: "bounds", bounds } }) };
}

export function itineraryScene(it: Itinerary, lang: Lang): MapScene {
  const legs = itineraryLegs(it);
  const bounds = boundsOf(legs.flatMap((l) => l.coords.map(([lon, lat]) => ({ lat, lon }))));
  return { legs, markers: itineraryMarkers(it, lang), ...(bounds && { focus: { kind: "bounds", bounds } }) };
}
