import { afterEach, describe, expect, it, vi } from "vitest";
import { foldCap, routeCap } from "./fold.ts";

describe("foldCap", () => {
  it("keeps M1's map strip: 180dp at 412x800, 120dp at 360x640", () => {
    expect(foldCap(800)).toBe(800 - 80 - 60 - 180);
    expect(foldCap(640)).toBe(640 - 80 - 60 - 120);
  });
});

describe("routeCap", () => {
  it("leaves two FABs below the search bar", () => {
    expect(routeCap(800)).toBe(800 - 80 - 60 - 120);
    expect(routeCap(640)).toBe(foldCap(640));
  });

  it("never takes more than 75% of the screen", () => {
    expect(routeCap(640 * 3)).toBe(0.75 * 640 * 3);
  });
});

describe("Extra large on a narrow phone", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("leaves room for the taller Plan Trip FAB (label under the icon) below the search bar", () => {
    vi.stubGlobal("document", { documentElement: { dataset: { textSize: "xlarge" } } });
    vi.stubGlobal("window", { innerWidth: 360 });
    expect(foldCap(640)).toBe(640 - 80 - 60 - 144);
    expect(routeCap(640)).toBe(640 - 80 - 60 - 144);
    expect(foldCap(800)).toBe(800 - 80 - 60 - 180);
  });
});
