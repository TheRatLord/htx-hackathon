// "▶ Start trip" / "( ▶ Start )" on D11 and D12: start the itinerary and open Live trip (D13).

import { useNavigate } from "react-router";
import type { Itinerary, PlanResponse } from "../../../api/types.ts";
import { usePrefs } from "../../../state/prefs.ts";
import { tripActions } from "../../../state/trip.ts";
import { startableFixture } from "./shiftFixture.ts";

export function useStartTrip(response: PlanResponse | undefined): (it: Itinerary) => void {
  const navigate = useNavigate();
  const { walkPace } = usePrefs();
  return (it) => {
    tripActions.start(response?.source === "offline-fixture" ? startableFixture(it, Date.now(), walkPace) : it);
    navigate("/explore/trip");
  };
}
