import { describe, expect, it } from "vitest";
import { clusterLabel, clusterPoints, placeChip, placeSceneLabel, pointAlong, roomAround, trimLoops } from "./placement.ts";

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
  it("never goes below or beside its pin: with the chrome above, it is left out (and the map nudged)", () => {
    const bar = { l: 0, t: 0, r: 400, b: 190 };
    expect(placeChip({ x: 200, y: 200 }, "342", { ...open, hard: [bar] })).toBeUndefined();
  });
  it("sets the tag to one side of its pin, pointer still on it, when a neighbour's pin is in the way", () => {
    const pin = { l: 150, t: 150, r: 186, b: 190 };
    const spot = placeChip({ x: 200, y: 200 }, "3340", { ...open, hard: [pin] });
    expect(spot?.key).toBe("above-r");
    expect(spot!.box.l).toBeLessThanOrEqual(200);
    expect(spot!.box.b).toBeLessThanOrEqual(200);
  });
});

describe("clusterPoints", () => {
  it("merges pins closer than the radius, the first (listed) one leading", () => {
    const groups = clusterPoints([
      { id: "567", p: { x: 100, y: 100 } },
      { id: "259", p: { x: 120, y: 110 } },
      { id: "246", p: { x: 200, y: 100 } },
    ]);
    expect(groups.map((g) => g.members.map((m) => m.id))).toEqual([["567", "259"], ["246"]]);
    expect(groups[0].p).toEqual({ x: 110, y: 105 });
    expect(clusterLabel(["567", "259"])).toBe("567 · 259");
    expect(clusterLabel(["1", "2", "3", "4", "5"])).toBe("1 · 2 · 3 +2");
  });
});

describe("trimLoops", () => {
  it("goes straight to the last stop from where a bus first comes near it (the 73 into Hobby)", () => {
    // East 2 km, then a 900 m loop that ends 300 m from where it began.
    const line: [number, number][] = [
      [-95.3, 29.65],
      [-95.28, 29.65],
      [-95.276, 29.652],
      [-95.272, 29.65],
      [-95.276, 29.648],
      [-95.277, 29.65],
    ];
    const out = trimLoops(line);
    expect(out.at(-1)).toEqual(line.at(-1));
    expect(out.length).toBeLessThan(line.length);
  });
  it("leaves a plain approach alone", () => {
    const line: [number, number][] = [
      [-95.3, 29.65],
      [-95.29, 29.65],
      [-95.28, 29.65],
      [-95.279, 29.65],
    ];
    expect(trimLoops(line)).toEqual(line);
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
  it("takes the same side in every language", () => {
    const soft = Array.from({ length: 12 }, (_, i) => ({ l: 196, t: 200 - i * 8 - 4, r: 204, b: 200 - i * 8 + 4 }));
    const s = { width: 400, hard: [], soft };
    expect(placeSceneLabel({ x: 200, y: 200 }, "Transfer · #4789", "dot", s)?.key).toBe(placeSceneLabel({ x: 200, y: 200 }, "Transbordo · #4789", "dot", s)?.key);
  });
});

describe("roomAround", () => {
  it("is the label's extent around its pin, at least `min` each side", () => {
    const p = { x: 100, y: 100 };
    // A tag centred above: 60 wide, 40 tall, ending 6px above the pin.
    expect(roomAround(p, { l: 70, t: 54, r: 130, b: 94 }, 16)).toEqual({ l: -30, t: -46, r: 30, b: 16 });
    // A tag beside, to the left: the room reaches left, and right by `min`.
    expect(roomAround(p, { l: 30, t: 88, r: 90, b: 112 }, 12)).toEqual({ l: -70, t: -12, r: 12, b: 12 });
    // A fixed room below the pin.
    expect(roomAround(p, { l: 30, t: 88, r: 90, b: 130 }, 16, 16).b).toBe(16);
  });
});
