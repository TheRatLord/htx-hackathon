// localStorage-backed stores. Every access is guarded: when storage is unavailable
// (private mode, blocked site data) the app keeps working with in-memory state.

import { useSyncExternalStore } from "react";

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
  const listeners = new Set<() => void>();
  const store: Store<T> = {
    get: () => value,
    set(next) {
      value = typeof next === "function" ? (next as (prev: T) => T)(value) : next;
      writeJson(key, value);
      listeners.forEach((l) => l());
    },
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    use: () => useSyncExternalStore(store.subscribe, store.get, store.get),
  };
  return store;
}
