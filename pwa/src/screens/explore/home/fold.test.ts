import { afterEach, describe, expect, it, vi } from "vitest";
import { foldCap, noSearchBarCap, routeCap } from "./fold.ts";

describe("foldCap", () => {
  it("never takes more than 45% of the screen", () => {
    expect(foldCap(800)).toBe(0.45 * 800);
    expect(foldCap(640)).toBe(0.45 * 640);
  });

  it("keeps M1's map strip on a short screen: 120dp at 360x400", () => {
    expect(foldCap(400)).toBe(400 - 80 - 60 - 120);
  });
});

describe("noSearchBarCap", () => {
  it("never takes more than 45% of the screen", () => {
    expect(noSearchBarCap(800)).toBe(0.45 * 800);
  });
});

describe("routeCap", () => {
  it("never takes more than 45% of the screen", () => {
    expect(routeCap(800)).toBe(0.45 * 800);
    expect(routeCap(640 * 3)).toBe(0.45 * 640 * 3);
  });

  it("leaves two FABs below the search bar on a short screen", () => {
    expect(routeCap(400)).toBe(400 - 80 - 60 - 120);
  });
});

describe("Extra large on a narrow phone", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("leaves room for the taller Plan Trip FAB (label under the icon) below the search bar", () => {
    vi.stubGlobal("document", { documentElement: { dataset: { textSize: "xlarge" } } });
    vi.stubGlobal("window", { innerWidth: 360 });
    expect(foldCap(400)).toBe(400 - 80 - 60 - 144);
    expect(routeCap(400)).toBe(400 - 80 - 60 - 144);
    expect(foldCap(640)).toBe(0.45 * 640);
  });
});
