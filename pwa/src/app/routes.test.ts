import { describe, expect, it } from "vitest";
import { parentOf } from "./routes.ts";

describe("parentOf", () => {
  it("maps each screen to its logical parent (G.3)", () => {
    expect(parentOf("/explore/stop/342")).toBe("/explore");
    expect(parentOf("/explore/route/40")).toBe("/explore");
    expect(parentOf("/more/alerts/abc")).toBe("/more/alerts");
    expect(parentOf("/more/settings")).toBe("/more");
    expect(parentOf("/fares")).toBe("/explore");
  });

  it("keeps the route on the way back to the Stop sheet", () => {
    expect(parentOf("/explore/stop/342/walk", "?from=29.75,-95.36&route=040&d=200")).toBe("/explore/stop/342?route=040");
    expect(parentOf("/explore/stop/342/schedule")).toBe("/explore/stop/342");
  });

  it("steps from Select Itinerary back to the form, then to the map", () => {
    expect(parentOf("/explore/plan", "?from=29.72%2C-95.34&fromName=UH&to=landmark%3Ahobby&toName=Hobby")).toBe(
      "/explore/plan?from=29.72%2C-95.34&fromName=UH&to=landmark%3Ahobby&toName=Hobby&edit=1",
    );
    expect(parentOf("/explore/plan", "?to=landmark%3Ahobby&toName=Hobby&edit=1")).toBe("/explore");
    expect(parentOf("/explore/plan")).toBe("/explore");
  });

  it("keeps the trip on the way back from an itinerary", () => {
    expect(parentOf("/explore/plan/0", "?from=29.72,-95.34&fromName=UH&to=landmark%3Ahobby&toName=Hobby&sort=walk")).toBe(
      "/explore/plan?from=29.72%2C-95.34&fromName=UH&to=landmark%3Ahobby&toName=Hobby&sort=walk",
    );
  });
});
