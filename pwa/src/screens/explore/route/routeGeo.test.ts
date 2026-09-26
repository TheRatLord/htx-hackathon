import { describe, expect, it } from "vitest";
import { placeVehicles, type RouteDirectionDetail } from "./routeGeo.ts";

// Three stops ~1.1 km apart along a meridian.
const stop = (id: string, lat: number) => ({ sequence: 0, id, name: id, lat, lon: -95.4, kind: "stop" });
const direction = { label: "Northbound", stops: [stop("A", 29.7), stop("B", 29.71), stop("C", 29.72)] } as unknown as RouteDirectionDetail;
const bus = (lat: number, lon = -95.4, directionLabel = "Northbound") => ({ lat, lon, directionLabel });

describe("placeVehicles", () => {
  it("keys a bus by the stop it is heading to", () => {
    expect([...placeVehicles([bus(29.702)], direction).keys()]).toEqual(["B"]);
    expect([...placeVehicles([bus(29.712)], direction).keys()]).toEqual(["C"]);
    expect([...placeVehicles([bus(29.698)], direction).keys()]).toEqual(["A"]);
  });

  it("leaves out buses of the other direction or far from every stop", () => {
    expect(placeVehicles([bus(29.702, -95.4, "Southbound")], direction).size).toBe(0);
    expect(placeVehicles([bus(29.705, -95.41)], direction).size).toBe(0);
  });
});
