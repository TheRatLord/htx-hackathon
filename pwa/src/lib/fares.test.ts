import { describe, expect, it } from "vitest";
import type { Itinerary, Leg } from "../api/types.ts";
import { fareLine } from "./fares.ts";

const ride = (routeId: string) => ({ type: "transit", route: { id: routeId } }) as Leg;
const walk = { type: "walk" } as Leg;
const it_ = (legs: Leg[]) => ({ legs }) as Itinerary;

describe("fareLine", () => {
  it("shows the local fare for local bus and rail", () => {
    expect(fareLine(it_([walk, ride("080"), ride("700"), walk]))).toEqual({ text: "Local fare $1.25", reducedHref: "/fares#reduced" });
  });

  it("is omitted with any Park & Ride leg or no ride", () => {
    expect(fareLine(it_([ride("080"), ride("228")]))).toBeNull();
    expect(fareLine(it_([walk]))).toBeNull();
  });
});
