import { describe, expect, it } from "vitest";
import { cleanName, intersectionKey, matchScore, tokenize } from "../server/lib/text.ts";

describe("cross-street normalization", () => {
  it("gives every spelling of an intersection the same key", () => {
    const expected = intersectionKey("Westheimer Rd @ Kirby Dr");
    expect(expected).toBe("kirby|westheimer");
    for (const q of ["Westheimer and Kirby", "Westheimer & Kirby", "Kirby Dr @ Westheimer Rd", "kirby at westheimer road"]) {
      expect(intersectionKey(q)).toBe(expected);
    }
  });

  it("matches queries in any order, with or without street types", () => {
    const stop = tokenize("Westheimer Rd @ Kirby Dr").map((t) => t.text);
    for (const q of ["Westheimer and Kirby", "Westheimer & Kirby", "Kirby Westheimer", "westheimer rd kirby drive"]) {
      expect(matchScore(tokenize(q), stop)).toBeGreaterThanOrEqual(0.85);
    }
    expect(matchScore(tokenize("Westheimer and Shepherd"), stop)).toBe(0);
  });

  it("treats MLK spellings as the same street", () => {
    const stop = tokenize("M L King Blvd @ UH University Dr").map((t) => t.text);
    expect(matchScore(tokenize("Martin Luther King and UH"), stop)).toBe(1);
    expect(matchScore(tokenize("MLK & University"), stop)).toBeGreaterThan(0.8);
  });

  it("tolerates small typos", () => {
    expect(matchScore(tokenize("westhiemer"), ["westheimer"])).toBeGreaterThan(0);
  });
});

describe("cleanName", () => {
  it("restores acronyms", () => {
    expect(cleanName("M L King Blvd @ Uh University Dr")).toBe("M L King Blvd @ UH University Dr");
    expect(cleanName("Greenspoint Tc")).toBe("Greenspoint TC");
    expect(cleanName("Dryden/Tmc Stn NB")).toBe("Dryden/TMC Stn NB");
  });
});
