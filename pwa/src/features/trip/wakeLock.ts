// Keeps the screen on during a Live trip (spec D13): a PWA can't track in the background, so the
// lock is held while the page is visible and taken again when the rider comes back to it.

import { useEffect } from "react";

export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | undefined;
    let cancelled = false;
    // One request at a time: a visibilitychange during the first request must not take a second
    // sentinel that would overwrite (and leak) the first.
    let pending = false;
    const acquire = async () => {
      if (pending || document.visibilityState !== "visible" || (lock && !lock.released)) return;
      pending = true;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (cancelled) void next.release();
        else lock = next;
      } catch {
        // Denied (e.g. battery saver): the trip still works, the screen may just dim.
      } finally {
        pending = false;
      }
    };
    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", acquire);
      void lock?.release();
    };
  }, [enabled]);
}
