import { describe, expect, it } from "vitest";
import { walkUrl } from "./walkUrl.ts";

describe("walkUrl", () => {
  it("carries the shown distance, rounded, and the route", () => {
    expect(walkUrl("342", { d: 176.6, route: "040" })).toBe("/explore/stop/342/walk?route=040&d=177");
  });

  it("walks from a place (D4)", () => {
    expect(walkUrl("688", { from: "29.722,-95.3897", fromName: "Houston Museum of Natural Science" })).toBe(
      "/explore/stop/688/walk?from=29.722%2C-95.3897&fromName=Houston+Museum+of+Natural+Science",
    );
  });

  it("has no query without a link", () => {
    expect(walkUrl("342")).toBe("/explore/stop/342/walk");
  });
});
