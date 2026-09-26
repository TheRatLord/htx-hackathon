import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client.ts";
import type { Dep } from "../api/types.ts";
import { departureA11y, directionWord, displayHeadsign, formatClock, formatDateRange, formatDayTime, formatDeparture, formatDistance, formatServiceDate, showsClock, headsignLine, platformLabel, sideLine, statusOf, stopTitle, upcoming } from "./format.ts";
import { errorText, localiseSide, walkStepText } from "./i18nServer.ts";

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
    // Still ahead: "1 min", never a clock time beside minutes (judges, round 1).
    expect(fmt(0.5, "scheduled")).toBe("1 min");
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

describe("showsClock", () => {
  const dep = (min: number, isRealtime = false) => ({ departureTime: at(min), isRealtime, canceled: false, source: "schedule" as const, tripId: "t" });
  it("is true for clock times only", () => {
    expect(showsClock(dep(16), NOW)).toBe(false);
    expect(showsClock(dep(65), NOW)).toBe(true);
    expect(showsClock(dep(0), NOW)).toBe(true);
    expect(showsClock(dep(0, true), NOW)).toBe(false);
    expect(showsClock(dep(16), NOW, true)).toBe(true);
  });
});

describe("upcoming", () => {
  it("drops departures more than a minute past and keeps order", () => {
    const deps = [at(-2), at(-0.9), at(3)].map((departureTime) => ({ departureTime }));
    expect(upcoming(deps, NOW).map((d) => d.departureTime)).toEqual([at(-0.9), at(3)]);
  });
  it("drops a scheduled time once it has passed, but keeps a live one for a minute", () => {
    const dep = (min: number, isRealtime = false) => ({ departureTime: at(min), isRealtime });
    expect(upcoming([dep(-0.1), dep(0.5)], NOW).map((d) => d.departureTime)).toEqual([at(0.5)]);
    expect(upcoming([dep(-0.5, true)], NOW)).toHaveLength(1);
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
    expect(sideLine(stop, { withCompass: true, lang: "en" })).toBe("North side of Lamar St");
    expect(sideLine({ kind: "stop", directionLabel: "Eastbound" }, { withCompass: true, lang: "en" })).toBe("");
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

describe("dates", () => {
  it("formats days and ranges in Houston time", () => {
    // 10:12 UTC is 5:12 AM in Houston (CDT).
    expect(formatDayTime("2026-09-26T10:12:00Z", "en")).toBe("Sat 5:12 AM");
    expect(formatServiceDate("20260925", "en")).toBe("Fri, Sep 25");
    expect(formatDateRange("2026-09-25T10:00:00Z", "2026-10-03T10:00:00Z", "en", { withTime: true })).toBe("From Sep 25, 5:00 AM until Oct 3");
    expect(formatDateRange(null, "2026-10-03T10:00:00Z", "en")).toBe("Until Oct 3");
  });
});

describe("headsignLine", () => {
  it("omits the unreliable rail direction", () => {
    expect(headsignLine({ mode: "bus" }, "Northbound", "N Shepherd P&R", "en")).toBe("NORTHBOUND to N SHEPHERD P&R");
    expect(headsignLine({ mode: "rail" }, "Southbound", "Fannin South", "en")).toBe("to FANNIN SOUTH");
    expect(headsignLine({ mode: "bus" }, "Inbound", "Downtown", "es")).toBe("HACIA EL CENTRO a DOWNTOWN");
  });

  it("drops the METRORail prefix of rail headsigns", () => {
    expect(displayHeadsign("METRORail - FANNIN SOUTH")).toBe("FANNIN SOUTH");
    expect(displayHeadsign("METRORail -NORTH LINE TC")).toBe("NORTH LINE TC");
    expect(displayHeadsign("DOWNTOWN")).toBe("DOWNTOWN");
    expect(headsignLine({ mode: "rail" }, "", "METRORail - Fannin South", "en")).toBe("to FANNIN SOUTH");
  });

  it("names directions, keeping unknown labels", () => {
    expect(directionWord("Eastbound", "en")).toBe("Eastbound");
    expect(directionWord("Loop", "en")).toBe("Loop");
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

  it("gives the first heading in the rider's language", () => {
    const depart = { ...step, maneuver: "depart", compass: "southeast" as const, street: "Calhoun Rd" };
    expect(walkStepText(depart, "en")).toBe("Head southeast on Calhoun Rd");
    expect(walkStepText(depart, "es")).toBe("Camine hacia el sureste por Calhoun Rd");
  });

  it("falls back to the server's instruction when a needed field is missing", () => {
    expect(walkStepText({ ...step, maneuver: "depart", street: "Calhoun Rd" }, "en")).toBe(step.instruction);
  });
});

describe("departureA11y", () => {
  const dep = (min: number, extra: Partial<Dep> = {}): Dep => ({
    departureTime: at(min),
    isRealtime: false,
    canceled: false,
    source: "schedule",
    tripId: "t",
    ...extra,
  });

  it("speaks minutes and every non-default status", () => {
    expect(departureA11y(dep(16), NOW, { lang: "en" })).toBe("16 minutes");
    expect(departureA11y(dep(16), NOW, { markScheduled: true, lang: "en" })).toBe("16 minutes, Scheduled");
    expect(departureA11y(dep(4, { isRealtime: true, source: "metro-arrivals-api" }), NOW, { lang: "en" })).toBe("4 minutes, Live");
    expect(departureA11y(dep(4, { isRealtime: true, source: "simulated" }), NOW, { lang: "en" })).toBe("4 minutes, Live (demo)");
    expect(departureA11y(dep(12, { canceled: true }), NOW, { walkMin: 20, lang: "en" })).toBe("12 minutes, Canceled");
  });

  it("says when the bus leaves before the rider can walk there, and uses clock times offline", () => {
    expect(departureA11y(dep(2), NOW, { walkMin: 5, lang: "en" })).toBe("2 minutes, Leaves before you get there");
    expect(departureA11y(dep(16, { isRealtime: true, source: "metro-arrivals-api" }), NOW, { offline: true, lang: "en" })).toBe("7:16 PM");
  });
});

describe("platformLabel", () => {
  it("takes the part after the dash, or the stop number", () => {
    expect(platformLabel({ id: "79", name: "Northwest Transit Center - Platform 2" }, "en")).toBe("Platform 2");
    expect(platformLabel({ id: "79", name: "Northwest Transit Center" }, "es")).toBe("Parada #79");
  });
});

describe("errorText", () => {
  it("localises by code and falls back when a placeholder has no value", () => {
    const err = new ApiError("stop_not_found", 404, "We couldn't find stop #99.");
    expect(errorText(err, { id: "99" }, "es")).toBe("No encontramos la parada #99. Revise el número en el letrero de la parada.");
    expect(errorText(err, undefined, "en")).toBe("We couldn't find stop #99.");
    expect(errorText(err, undefined, "es")).toBe("Algo salió mal. Intente de nuevo.");
    expect(errorText(new ApiError("brand_new_code", 500, "Server text"), undefined, "en")).toBe("Server text");
  });
});

describe("stopTitle", () => {
  it("keeps the stop number on the last word's line", () => {
    expect(stopTitle("Westheimer Rd @ Montrose Blvd", "2958", "en")).toBe("Westheimer Rd @ Montrose Blvd (2958)");
  });
});
