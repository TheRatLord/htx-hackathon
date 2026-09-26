import { describe, expect, it } from "vitest";
import { stopMatches } from "./stopMatch.ts";

const montrose = { id: "2958", name: "Westheimer Rd @ Montrose Blvd" };

describe("stopMatches", () => {
  it("matches word prefixes in any order", () => {
    expect(stopMatches(montrose, "montrose")).toBe(true);
    expect(stopMatches(montrose, "montr west")).toBe(true);
    expect(stopMatches(montrose, "kirby")).toBe(false);
  });

  it("treats &, and, @ and street suffixes alike", () => {
    expect(stopMatches(montrose, "Westheimer and Montrose")).toBe(true);
    expect(stopMatches(montrose, "westheimer & montrose")).toBe(true);
    expect(stopMatches(montrose, "Westheimer Road")).toBe(true);
  });

  it("matches the stop number from its start", () => {
    expect(stopMatches(montrose, "295")).toBe(true);
    expect(stopMatches(montrose, "#2958")).toBe(true);
    expect(stopMatches(montrose, "958")).toBe(false);
  });

  it("matches everything for an empty query", () => {
    expect(stopMatches(montrose, "  ")).toBe(true);
  });
});
