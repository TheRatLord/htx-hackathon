// The one offline signal (spec D22): the browser says so, or the last API request failed
// with a network error (a fetch TypeError) and nothing has succeeded since.

import { useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { ApiError } from "../api/client.ts";

let networkDown = false;
const listeners = new Set<() => void>();

/** Called by the QueryCache after every query: a success clears the flag, a network error sets it. */
export function reportQueryResult(error: unknown) {
  const down = error instanceof ApiError && error.code === "network";
  if (down === networkDown) return;
  networkDown = down;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

const get = () => !navigator.onLine || networkDown;

/** True while offline: every time renders as a scheduled clock time (the offline rule, C.2). */
export function useOffline(): boolean {
  return useSyncExternalStore(subscribe, get, () => false);
}

/** When the newest cached data was fetched (ms), for "Offline · times from 7:42 PM". */
export function useOfflineSince(): number | undefined {
  const offline = useOffline();
  const client = useQueryClient();
  if (!offline) return undefined;
  const newest = Math.max(0, ...client.getQueryCache().getAll().map((q) => q.state.dataUpdatedAt));
  return newest || undefined;
}
