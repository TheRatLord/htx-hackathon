// Persists the TanStack Query cache to IndexedDB (D22), so a cold start offline still shows the
// last stops, arrivals and alerts (as scheduled clock times, with their age), for up to 24 h.

import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { Query, QueryCache } from "@tanstack/react-query";
import type { PersistQueryClientOptions } from "@tanstack/react-query-persist-client";
import { createStore, del, get, set } from "idb-keyval";

/** Also the minimum `gcTime` for queries, or restored entries are dropped before they are used. */
export const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000;

const store = createStore("ridemetro", "query-cache");

// Every IndexedDB call can fail (private mode, storage full); the app then runs from memory.
const storage = {
  getItem: (key: string) => get<string>(key, store).catch(() => null),
  setItem: (key: string, value: string) => set(key, value, store).catch(() => undefined),
  removeItem: (key: string) => del(key, store).catch(() => undefined),
};

/**
 * The query roots written to disk: what an offline cold start shows. Search, plan, walk and
 * vehicle answers are not persisted (they are large, or a record of where the rider went), and
 * only the latest nearby answer is kept rather than one per location the rider passed.
 */
export const PERSISTED_ROOTS = ["health", "nearby", "stop", "arrivals", "stopSchedule", "route", "routeNext", "transitCenters", "transitCenter", "alerts"];

export const persistOptions: Omit<PersistQueryClientOptions, "queryClient"> = {
  persister: createAsyncStoragePersister({ storage, key: "ridemetro.queries", throttleTime: 5000 }),
  maxAge: PERSIST_MAX_AGE,
  // Bump when an API response shape changes, so old caches are dropped instead of restored.
  buster: "1",
};

/** Which queries are written to disk: PERSISTED_ROOTS, and of nearby only the newest answer per radius. */
export function shouldPersist(cache: QueryCache): (q: Query) => boolean {
  return (q) => {
    if (q.state.status !== "success" || !PERSISTED_ROOTS.includes(String(q.queryKey[0]))) return false;
    if (q.queryKey[0] !== "nearby") return true;
    const newest = cache
      .findAll({ queryKey: ["nearby"], predicate: (o) => o.queryKey[2] === q.queryKey[2] && o.state.status === "success" })
      .reduce((a, b) => (b.state.dataUpdatedAt > a.state.dataUpdatedAt ? b : a), q);
    return newest === q;
  };
}
