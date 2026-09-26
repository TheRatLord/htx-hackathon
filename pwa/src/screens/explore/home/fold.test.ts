import { describe, expect, it } from "vitest";
import { foldCap } from "./fold.ts";

describe("foldCap", () => {
  it("keeps M1's map strip: 180dp at 412x800, 120dp at 360x640", () => {
    expect(foldCap(800)).toBe(800 - 80 - 60 - 180);
    expect(foldCap(640)).toBe(640 - 80 - 60 - 120);
  });
});
