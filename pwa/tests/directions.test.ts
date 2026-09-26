import { describe, expect, it } from "vitest";
import { findStop } from "../server/gtfs/store.ts";

describe("stop direction derivation", () => {
  it("tells apart the two same-name stops at UH (#11424 / #11425)", () => {
    const a = findStop("11424")!;
    const b = findStop("11425")!;
    expect(a.name).toBe(b.name);
    expect(a.dir).toBe("Southbound");
    expect(b.dir).toBe("Northbound");
    expect(a.side).toBe("West side of M L King Blvd");
    expect(b.side).toBe("East side of M L King Blvd");
  });

  it("does not claim a travel direction for transit centers", () => {
    expect(findStop("11031")!.kind).toBe("transit-center");
    expect(findStop("11031")!.dir).toBeUndefined();
  });

  it("labels rail platforms by direction", () => {
    expect(findStop("25023")!).toMatchObject({ kind: "rail", dir: "Northbound" });
    expect(findStop("25024")!).toMatchObject({ kind: "rail", dir: "Southbound" });
  });
});
