import { useNavigate } from "react-router";
import type { Arrival, LatLon, NearbyTransitCenter, TransitCenterDetail } from "../../../api/types.ts";
import { haversineM } from "../../../lib/geo.ts";
import { toRouteRef } from "../../../lib/routes.ts";
import { TransitCenterCard } from "../../../ui/TransitCenterCard.tsx";
import type { TcDeparture } from "../../../ui/types.ts";
import { walkUrl } from "../walk/walkUrl.ts";

const toTcDeparture = (a: Arrival): TcDeparture => ({
  ...a,
  route: toRouteRef({ id: a.routeId, name: a.routeShortName, color: a.routeColor, textColor: a.routeTextColor }),
});

/** The platform nearest to `origin`: where Walk should lead. */
export function nearestPlatform(detail: TransitCenterDetail, origin: LatLon): string {
  const byDistance = [...detail.bays].sort((a, b) => haversineM(origin.lat, origin.lon, a.lat, a.lon) - haversineM(origin.lat, origin.lon, b.lat, b.lon));
  return byDistance[0]?.stopId ?? detail.stopIds[0];
}

interface NearbyTcCardProps {
  tc: NearbyTransitCenter;
  detail?: TransitCenterDetail;
  origin: LatLon;
  /** D4: walk from this place. */
  place?: { param: string; name: string };
}

/** D2 item 7: the transit center within 1,000 m, placed after the first stop card. */
export function NearbyTcCard({ tc, detail, origin, place }: NearbyTcCardProps) {
  const navigate = useNavigate();
  const deps = detail ? [...detail.bays.flatMap((b) => b.departures), ...detail.unassignedDepartures].map(toTcDeparture) : [];
  const tcPath = `/explore/tc/${encodeURIComponent(tc.id)}`;
  return (
    <TransitCenterCard
      tc={tc}
      nextDeps={deps}
      onOpen={() => navigate(tcPath)}
      onWalk={() => navigate(detail ? walkUrl(nearestPlatform(detail, origin), { d: tc.walkDistanceM, from: place?.param, fromName: place?.name }) : tcPath)}
    />
  );
}
