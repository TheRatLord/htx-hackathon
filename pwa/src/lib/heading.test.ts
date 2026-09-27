import { describe, expect, it } from "vitest";
import { normalize, orientationHeading, smooth, turn } from "./heading.ts";

const near = (actual: number | undefined, expected: number) => {
  expect(actual).toBeDefined();
  expect(Math.abs(turn(actual!, expected))).toBeLessThan(0.5);
};

describe("orientationHeading", () => {
  it("reads the top edge of a phone lying flat (alpha turns anticlockwise)", () => {
    near(orientationHeading(0, 0, 0), 0);
    near(orientationHeading(90, 0, 0), 270);
    near(orientationHeading(180, 0, 0), 180);
    near(orientationHeading(270, 0, 0), 90);
    near(orientationHeading(30, 0, 0), 330);
  });

  it("reads the back of a phone held upright, as when looking at the map", () => {
    near(orientationHeading(0, 90, 0), 0);
    near(orientationHeading(90, 90, 0), 270);
    near(orientationHeading(300, 90, 0), 60);
  });

  it("gives the same heading at every tilt in between", () => {
    for (const beta of [10, 30, 45, 60, 80, 100, 120]) near(orientationHeading(45, beta, 0), 315);
  });

  it("ignores a roll to either side while flat or tilted", () => {
    for (const gamma of [-40, -15, 15, 40]) {
      near(orientationHeading(0, 0, gamma), 0);
      near(orientationHeading(0, 45, gamma), 0);
    }
  });

  it("turns with the phone held upright and swung left or right", () => {
    // Upright, gamma turns the phone about its own long axis: the back swings round with it.
    near(orientationHeading(0, 90, 30), 330);
    near(orientationHeading(0, 90, -30), 30);
  });

  it("follows the screen's rotation in landscape", () => {
    // Screen turned a quarter anticlockwise: its up is the device's right side.
    near(orientationHeading(0, 0, 0, 90), 90);
    near(orientationHeading(0, 0, 0, 270), 270);
    near(orientationHeading(0, 0, 0, 180), 180);
    // Landscape, held up to look at the map (screen facing west): the back of the phone leads, east.
    near(orientationHeading(0, 0, -90, 90), 90);
  });

  it("blends from the top edge to the back without a jump as the phone tips up", () => {
    // Tipped up and rolled: the two disagree; the beam moves steadily from one to the other.
    let prev = orientationHeading(0, 40, 30)!;
    for (let beta = 41; beta <= 90; beta++) {
      const h = orientationHeading(0, beta, 30)!;
      expect(Math.abs(turn(prev, h))).toBeLessThan(4);
      prev = h;
    }
    near(orientationHeading(0, 40, 30), 0);
    near(orientationHeading(0, 90, 30), 330);
  });

  it("reads a phone standing on its long edge by its top", () => {
    near(orientationHeading(0, 0, 90), 0);
    near(orientationHeading(90, 0, -90), 270);
  });
});

describe("smooth", () => {
  it("starts at the first reading", () => {
    expect(smooth(undefined, 370, 0.3)).toBe(10);
  });

  it("eases the short way round north", () => {
    near(smooth(350, 10, 0.5), 0);
    near(smooth(10, 350, 0.5), 0);
    near(smooth(90, 180, 0.5), 135);
  });
});

describe("turn / normalize", () => {
  it("measures the signed shortest turn", () => {
    expect(turn(350, 10)).toBe(20);
    expect(turn(10, 350)).toBe(-20);
    expect(turn(0, 180)).toBe(180);
    expect(normalize(-90)).toBe(270);
    expect(normalize(720)).toBe(0);
  });
});
