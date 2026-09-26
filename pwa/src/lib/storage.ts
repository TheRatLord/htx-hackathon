// localStorage-backed stores. Every access is guarded: when storage is unavailable
// (private mode, blocked site data) the app keeps working with in-memory state.

import { useSyncExternalStore } from "react";
import { createSignal } from "./signal.ts";

export function readJson<T>(key: string, fallback: T, storage: "local" | "session" = "local"): T {
  try {
    const raw = (storage === "local" ? localStorage : sessionStorage).getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown, storage: "local" | "session" = "local") {
  try {
    const s = storage === "local" ? localStorage : sessionStorage;
    if (value === undefined) s.removeItem(key);
    else s.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the in-memory value still applies for this session.
  }
}

export interface Store<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(listener: () => void): () => void;
  use(): T;
}

/** A persisted value with change notification; `normalize` repairs values written by older versions. */
export function persistentStore<T>(key: string, initial: T, normalize: (stored: T) => T = (v) => v): Store<T> {
  let value = normalize(readJson(key, initial));
  const signal = createSignal();
  const store: Store<T> = {
    get: () => value,
    set(next) {
      value = typeof next === "function" ? (next as (prev: T) => T)(value) : next;
      writeJson(key, value);
      signal.notify();
    },
    subscribe: signal.subscribe,
    use: () => useSyncExternalStore(store.subscribe, store.get, store.get),
  };
  // Another tab (the PWA open twice) wrote this key: take its value, so the last writer doesn't
  // silently overwrite the other's saved stops, recents or active trip.
  if (typeof window !== "undefined")
    window.addEventListener("storage", (e) => {
      if (e.key !== key && e.key !== null) return;
      value = normalize(readJson(key, initial));
      signal.notify();
    });
  return store;
}
