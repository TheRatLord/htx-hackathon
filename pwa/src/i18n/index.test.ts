import { describe, expect, it } from "vitest";
import { hasKey, t } from "./index.ts";

describe("t", () => {
  it("picks the plural form from count", () => {
    expect(t("time.minutesA11y", { count: 1 }, "en")).toBe("1 minute");
    expect(t("time.minutesA11y", { count: 5 }, "es")).toBe("5 minutos");
  });

  it("fills placeholders and leaves unknown ones visible", () => {
    expect(t("stopLine.title", { name: "Lamar St @ Main St", id: "342" }, "en")).toBe("Lamar St @ Main St (342)");
    expect(t("stopLine.title", { name: "Lamar St @ Main St" }, "en")).toBe("Lamar St @ Main St ({id})");
  });

  it("falls back to the key when no language has it", () => {
    expect(hasKey("nope.missing", "es")).toBe(false);
    expect(t("nope.missing", undefined, "es")).toBe("nope.missing");
  });
});
