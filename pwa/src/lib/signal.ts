// The change signal behind every module-level store read with useSyncExternalStore (clock,
// offline, language, saved stops, install prompt, walk distances, routes).

export interface Signal {
  /** For useSyncExternalStore: adds a listener and returns its removal. */
  subscribe: (listener: () => void) => () => void;
  /** Tells every listener the value changed. */
  notify: () => void;
  /** How many listeners there are (a store can pause its work with none). */
  size: () => number;
}

export function createSignal(): Signal {
  const listeners = new Set<() => void>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    notify: () => listeners.forEach((l) => l()),
    size: () => listeners.size,
  };
}
