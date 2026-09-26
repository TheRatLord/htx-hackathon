import { describe, expect, it } from "vitest";
import { formatClock, formatDeparture, formatDistance, headsignLine, sideLine, statusOf, upcoming } from "./format.ts";
import { localiseSide, walkStepText } from "./i18nServer.ts";

// 7:00 PM CDT on 2026-09-25.
const NOW = Date.parse("2026-09-26T00:00:00Z");
const at = (min: number) => new Date(NOW + min * 60_000).toISOString();

describe("formatDeparture", () => {
  const fmt = (min: number, status: "live" | "scheduled" | "canceled" | "simulated", offline = false) =>
    formatDeparture(at(min), NOW, { status, offline, lang: "en" });

  it("shows minutes under an hour and the clock time after", () => {
    expect(fmt(16, "scheduled")).toBe("16 min");
    expect(fmt(59.5, "live")).toBe("59 min");
    expect(fmt(65, "scheduled")).toBe("8:05 PM");
  });

  it("says Now only for live times; a scheduled time at or past its minute shows the clock", () => {
    expect(fmt(0.5, "live")).toBe("Now");
    expect(fmt(-0.5, "simulated")).toBe("Now");
    expect(fmt(0.5, "scheduled")).toBe("7:00 PM");
    expect(fmt(-0.5, "canceled")).toBe("6:59 PM");
  });

  it("always shows the clock offline", () => {
    expect(fmt(16, "live", true)).toBe("7:16 PM");
  });

  it("localises", () => {
    expect(formatDeparture(at(0.5), NOW, { status: "live", lang: "es" })).toBe("Ahora");
    expect(formatClock(at(65), "es")).toMatch(/^8:05\sp/);
  });
});

describe("upcoming", () => {
  it("drops departures more than a minute past and keeps order", () => {
    const deps = [at(-2), at(-0.9), at(3)].map((departureTime) => ({ departureTime }));
    expect(upcoming(deps, NOW).map((d) => d.departureTime)).toEqual([at(-0.9), at(3)]);
  });
});

describe("statusOf", () => {
  it("prefers canceled, then simulated, then live", () => {
    expect(statusOf({ canceled: true, isRealtime: true, source: "gtfs-rt" })).toBe("canceled");
    expect(statusOf({ canceled: false, isRealtime: true, source: "simulated" })).toBe("simulated");
    expect(statusOf({ canceled: false, isRealtime: true, source: "gtfs-rt" })).toBe("live");
    expect(statusOf({ canceled: false, isRealtime: false, source: "schedule" })).toBe("scheduled");
  });
});

describe("sideLine and localiseSide", () => {
  const stop = { kind: "stop", directionLabel: "Westbound", side: "North side of Lamar St" };

  it("drops the compass word next to a route line", () => {
    expect(sideLine(stop, { withCompass: false, lang: "en" })).toBe("On the north side of Lamar St");
    expect(sideLine(stop, { withCompass: false, lang: "es" })).toBe("En el lado norte de Lamar St");
  });

  it("keeps it where no route line is shown", () => {
    expect(sideLine(stop, { withCompass: true, lang: "en" })).toBe("Westbound stop · North side of Lamar St");
    expect(sideLine({ kind: "stop", directionLabel: "Eastbound" }, { withCompass: true, lang: "en" })).toBe("Eastbound stop");
  });

  it("says Rail station for rail", () => {
    expect(sideLine({ kind: "rail", side: "West side of Main St" }, { withCompass: true, lang: "en" })).toBe("Rail station");
  });

  it("localises side strings and leaves unknown ones alone", () => {
    expect(localiseSide("West side of Fannin St", "es")).toBe("Lado oeste de Fannin St");
    expect(localiseSide("Median of Main St", "es")).toBe("Median of Main St");
  });
});

describe("formatDistance", () => {
  it("uses feet and miles in both languages", () => {
    expect(formatDistance(76, "en")).toBe("250 ft");
    expect(formatDistance(76, "es")).toBe("250 pies");
    expect(formatDistance(1931, "en")).toBe("1.2 mi");
  });
});

describe("headsignLine", () => {
  it("omits the unreliable rail direction", () => {
    expect(headsignLine({ mode: "bus" }, "Northbound", "N Shepherd P&R", "en")).toBe("NORTHBOUND to N SHEPHERD P&R");
    expect(headsignLine({ mode: "rail" }, "Southbound", "Fannin South", "en")).toBe("to FANNIN SOUTH");
    expect(headsignLine({ mode: "bus" }, "Inbound", "Downtown", "es")).toBe("HACIA EL CENTRO a DOWNTOWN");
  });
});

describe("walkStepText", () => {
  const step = { distanceM: 10, distanceText: "50 ft", lat: 0, lon: 0, instruction: "Turn left onto Main St, walk 50 ft" };
  it("composes from structured fields", () => {
    expect(walkStepText({ ...step, maneuver: "turn", modifier: "left", street: "Main St" }, "es")).toBe("Gire a la izquierda en Main St");
    expect(walkStepText({ ...step, maneuver: "end of road", modifier: "right" }, "en")).toBe("Turn right");
    expect(walkStepText({ ...step, maneuver: "new name", modifier: "straight", street: "Main St" }, "en")).toBe("Continue on Main St");
    expect(walkStepText({ ...step, maneuver: "arrive", street: "Lamar St @ Main St" }, "en")).toBe("Arrive at Lamar St @ Main St");
  });
});
