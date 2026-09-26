import { describe, expect, it, vi } from "vitest";
import { createSignal } from "./signal.ts";

describe("createSignal", () => {
  it("notifies subscribed listeners until they unsubscribe", () => {
    const s = createSignal();
    const a = vi.fn();
    const off = s.subscribe(a);
    expect(s.size()).toBe(1);
    s.notify();
    off();
    s.notify();
    expect(a).toHaveBeenCalledTimes(1);
    expect(s.size()).toBe(0);
  });
});
