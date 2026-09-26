import { describe, expect, it } from "vitest";
import type { Alert } from "../api/types.ts";
import { alertsForStop } from "./alerts.ts";

const alert = (id: string, routeIds: string[], stopIds: string[]): Alert =>
  ({ id, effect: "OTHER_EFFECT", header: { en: id }, description: {}, routes: routeIds.map((routeId) => ({ routeId })), stopIds }) as unknown as Alert;

describe("alertsForStop", () => {
  const hobby = alert("hobby-elevator", ["040", "073"], ["10567"]);
  const routeWide = alert("route40-detour", ["040"], []);

  it("keeps a stop-specific alert off other stops on the same route", () => {
    expect(alertsForStop([hobby, routeWide], "342", ["040", "041"]).map((a) => a.id)).toEqual(["route40-detour"]);
  });

  it("shows a stop-specific alert at its own stop", () => {
    expect(alertsForStop([hobby], "10567", ["073"]).map((a) => a.id)).toEqual(["hobby-elevator"]);
  });
});
