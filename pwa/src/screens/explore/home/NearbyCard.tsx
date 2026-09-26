import { useNavigate } from "react-router";
import type { LatLon, NearbyStop } from "../../../api/types.ts";
import { useWalkDistance } from "../../../state/walkDistance.ts";
import { NearbyStopCard } from "../../../ui/NearbyStopCard.tsx";
import { walkUrl } from "../walk/walkUrl.ts";
import type { Place } from "./anchor.ts";

interface NearbyCardProps {
  item: NearbyStop;
  origin: LatLon;
  /** D4: walk times are measured from this place. */
  place?: Place;
}

/** A NearbyStopCard whose walk distance is the one shared with the Stop sheet and Walk (C.17). */
export function NearbyCard({ item, origin, place }: NearbyCardProps) {
  const navigate = useNavigate();
  const { stop } = item;
  const { distanceM } = useWalkDistance(origin, stop.id, item.walkDistanceM, item.walkSource);
  const stopPath = `/explore/stop/${encodeURIComponent(stop.id)}`;
  return (
    <NearbyStopCard
      stop={stop}
      walkDistanceM={distanceM}
      routes={item.routes}
      walkFrom={place && { label: place.short, param: place.param, name: place.name }}
      onOpen={() => navigate(stopPath)}
      onOpenRoute={(routeId) => navigate(`${stopPath}?route=${encodeURIComponent(routeId)}`)}
      onWalk={() => navigate(walkUrl(stop.id, { d: distanceM, from: place?.param, fromName: place?.name }))}
    />
  );
}
