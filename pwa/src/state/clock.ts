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

function schedule() {
  clearInterval(timer);
  timer = document.visibilityState === "visible" && listeners.size ? setInterval(tick, TICK_MS) : undefined;
}

function onVisibility() {
  if (document.visibilityState === "visible") tick();
  schedule();
}

function subscribe(listener: () => void) {
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

const get = () => now;

/** Date.now(), re-rendering every 15s while the page is visible and immediately when it becomes visible. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, get, get);
}
