// The shared clock every relative time and "can I make it" check reads (spec C.2).

import { useSyncExternalStore } from "react";

const TICK_MS = 15_000;

let now = Date.now();
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function tick() {
  now = Date.now();
  listeners.forEach((l) => l());
}

/** Starts the interval if it should run and isn't running; never restarts a running one. */
function schedule() {
  const run = document.visibilityState === "visible" && listeners.size > 0;
  if (run && !timer) timer = setInterval(tick, TICK_MS);
  if (!run && timer) {
    clearInterval(timer);
    timer = undefined;
  }
}

function onVisibility() {
  if (document.visibilityState === "visible") tick();
  schedule();
}

export function subscribeNow(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    document.addEventListener("visibilitychange", onVisibility);
    tick();
  }
  schedule();
  return () => {
    listeners.delete(listener);
    if (!listeners.size) document.removeEventListener("visibilitychange", onVisibility);
    schedule();
  };
}

const getNow = () => now;

/** Date.now(), re-rendering every 15s while the page is visible and immediately when it becomes visible. */
export function useNow(): number {
  return useSyncExternalStore(subscribeNow, getNow, getNow);
}
