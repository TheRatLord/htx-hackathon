import { describe, expect, it } from "vitest";
import { placeChip, placeSceneLabel, pointAlong } from "./placement.ts";

describe("pointAlong", () => {
  it("finds a point by length along the line", () => {
    const line: [number, number][] = [[0, 0], [10, 0], [10, 10]];
    expect(pointAlong(line)).toEqual([10, 0]);
    expect(pointAlong(line, 0.25)).toEqual([5, 0]);
    expect(pointAlong(line, 0.75)).toEqual([10, 5]);
  });
});

describe("placeChip", () => {
  const open = { width: 400, hard: [], soft: [] };
  it("puts a stop's chip above its pin first", () => {
    expect(placeChip({ x: 200, y: 200 }, "342", open)?.key).toBe("above");
  });
  it("moves below when the chrome is above", () => {
    const bar = { l: 0, t: 0, r: 400, b: 190 };
    expect(placeChip({ x: 200, y: 200 }, "342", { ...open, hard: [bar] })?.key).toBe("below");
  });
});

describe("placeSceneLabel", () => {
  it("with no clear side, takes the one crossing the fewest line boxes", () => {
    // A line running up through the point and out to the right: above and right cross it most.
    const soft = [
      ...Array.from({ length: 10 }, (_, i) => ({ l: 196, t: 200 - i * 8 - 4, r: 204, b: 200 - i * 8 + 4 })),
      ...Array.from({ length: 20 }, (_, i) => ({ l: 200 + i * 8 - 4, t: 196, r: 200 + i * 8 + 4, b: 204 })),
      { l: 150, t: 220, r: 160, b: 240 },
    ];
    const spot = placeSceneLabel({ x: 200, y: 200 }, "Transfer · #4789", "dot", { width: 400, hard: [], soft });
    expect(spot?.key).toBe("l");
  });
});
