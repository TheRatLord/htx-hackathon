import { describe, expect, it } from "vitest";
import { search } from "../server/services/search.ts";

const run = (q: string) => search(q, { places: null }).then((r) => r.results);

describe("search ranking", () => {
  it("'UH' returns the University of Houston first", async () => {
    const [first] = await run("UH");
    expect(first).toMatchObject({ type: "landmark", id: "university-of-houston" });
  });

  it("'hobby airprt' (typo) finds Hobby Airport", async () => {
    const results = await run("hobby airprt");
    expect(results[0]).toMatchObject({ type: "landmark", id: "hobby-airport" });
    expect(results.some((r) => r.type === "stop" && r.id === "10567")).toBe(true);
  });

  it("'Westheimer and Kirby' returns the intersection's stops, grouped, with directions", async () => {
    for (const q of ["Westheimer and Kirby", "Westheimer & Kirby", "Kirby Westheimer"]) {
      const stops = (await run(q)).filter((r) => r.type === "stop");
      expect(stops.length).toBeGreaterThanOrEqual(2);
      expect(stops.slice(0, 4).every((s) => s.group === "kirby|westheimer")).toBe(true);
      const directions = new Set(stops.slice(0, 4).map((s) => s.stop?.directionLabel));
      expect(directions.size).toBeGreaterThan(1);
    }
  });

  it("'342' returns stop 342 first", async () => {
    const [first] = await run("342");
    expect(first).toMatchObject({ type: "stop", id: "342", title: "Lamar St @ Main St" });
    expect(first.subtitle).toMatch(/^Stop #342 · Westbound · Routes 40, 41$/);
  });

  it("ranks an exact stop id before a route with the same number", async () => {
    const results = await run("82");
    expect(results.map((r) => r.type).slice(0, 2)).toEqual(["stop", "route"]);
  });

  it("finds rail lines by color", async () => {
    const [first] = await run("red line");
    expect(first).toMatchObject({ type: "route", id: "700" });
  });
});
