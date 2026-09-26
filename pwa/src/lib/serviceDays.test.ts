import { describe, expect, it } from "vitest";
import { dayKindOf, serviceDateOf, serviceDayTabs } from "./serviceDays.ts";

describe("serviceDayTabs", () => {
  it("uses today for its own kind and the next Saturday and Sunday", () => {
    // 2026-09-25 is a Friday.
    expect(dayKindOf("20260925")).toBe("weekday");
    expect(serviceDayTabs("20260925")).toEqual({ weekday: "20260925", saturday: "20260926", sunday: "20260927" });
  });
  it("on a Sunday, the weekday tab is Monday", () => {
    expect(serviceDayTabs("20260927")).toEqual({ sunday: "20260927", weekday: "20260928", saturday: "20261003" });
  });
  it("reads the Houston calendar day", () => {
    expect(serviceDateOf(Date.parse("2026-09-26T03:30:00Z"))).toBe("20260925"); // 10:30 PM CDT Friday
  });
});
