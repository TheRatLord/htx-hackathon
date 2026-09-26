import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A minimal document: the clock only reads visibilityState and listens for visibilitychange.
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("document", { visibilityState: "visible", addEventListener: vi.fn(), removeEventListener: vi.fn() });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("shared clock", () => {
  it("keeps ticking every 15 s while other time displays mount and unmount", async () => {
    const { subscribeNow } = await import("./clock.ts");
    const ticks = vi.fn();
    const stop = subscribeNow(ticks);
    ticks.mockClear();
    for (let i = 0; i < 3; i++) {
      vi.advanceTimersByTime(10_000);
      subscribeNow(() => {})(); // a TimeValue mounts and unmounts
    }
    // 30 s passed: the tick is due twice even though subscribers came and went every 10 s.
    expect(ticks).toHaveBeenCalledTimes(2);
    stop();
    vi.advanceTimersByTime(60_000);
    expect(ticks).toHaveBeenCalledTimes(2);
  });
});
