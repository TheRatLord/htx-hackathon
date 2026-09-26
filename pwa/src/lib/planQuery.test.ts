import { describe, expect, it } from "vitest";
import type { SearchResult } from "../api/types.ts";
import { encodePick, parsePlanQuery, planUrl } from "./planQuery.ts";

describe("plan query", () => {
  it("round-trips through the URL", () => {
    const q = { from: "29.72,-95.34", fromName: "UH", to: "landmark:hobby-airport", toName: "Hobby Airport", arriveBy: true, sort: "walk" as const };
    const url = planUrl(q, { edit: true });
    expect(url.startsWith("/explore/plan?")).toBe(true);
    const parsed = parsePlanQuery(new URL(url, "http://x").searchParams);
    expect(parsed).toEqual(q);
    expect(new URL(url, "http://x").searchParams.get("edit")).toBe("1");
  });

  it("ignores unknown sorts and a missing arriveBy", () => {
    expect(parsePlanQuery(new URLSearchParams("sort=fastest&arriveBy=0"))).toEqual({});
  });

  it("builds detail URLs", () => {
    expect(planUrl({ to: "342" }, { index: 2 })).toBe("/explore/plan/2?to=342");
  });
});

describe("encodePick", () => {
  const returnTo = "/explore/plan?from=29.75630%2C-95.36390&fromName=My+current+location&sort=transfers";

  it("fills To with a landmark and keeps the rest of the query", () => {
    const landmark = { type: "landmark", id: "hobby-airport", title: "Hobby Airport", subtitle: "" } as SearchResult;
    const q = parsePlanQuery(new URL(encodePick(returnTo, "to", landmark), "http://x").searchParams);
    expect(q).toMatchObject({ to: "landmark:hobby-airport", toName: "Hobby Airport", from: "29.75630,-95.36390", sort: "transfers" });
  });

  it("uses the stop id for stops and lat,lon for places", () => {
    const stop = { type: "stop", id: "342", title: "Lamar St @ Main St", subtitle: "" } as SearchResult;
    expect(parsePlanQuery(new URL(encodePick(returnTo, "to", stop), "http://x").searchParams).to).toBe("342");
    const place = { type: "place", id: "x", title: "Galleria", subtitle: "", lat: 29.7392, lon: -95.4637 } as SearchResult;
    expect(parsePlanQuery(new URL(encodePick(returnTo, "to", place), "http://x").searchParams)).toMatchObject({
      to: "29.73920,-95.46370",
      toName: "Galleria",
    });
  });

  it("fills From with my location", () => {
    const url = encodePick("/explore/plan?to=342", "from", { kind: "my-location", point: { lat: 29.7, lon: -95.3 } });
    const q = parsePlanQuery(new URL(url, "http://x").searchParams);
    expect(q).toMatchObject({ from: "29.70000,-95.30000", to: "342" });
    expect(q.fromName).toBeUndefined();
  });
});
