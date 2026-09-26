// Persists the TanStack Query cache to IndexedDB (D22), so a cold start offline still shows the
// last stops, arrivals and alerts (as scheduled clock times, with their age), for up to 24 h.

import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { Query } from "@tanstack/react-query";
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

/** Only answers are worth keeping; a failed or pending query would restore as an error. */
const shouldDehydrateQuery = (query: Query) => query.state.status === "success";

export const persistOptions: Omit<PersistQueryClientOptions, "queryClient"> = {
  persister: createAsyncStoragePersister({ storage, key: "ridemetro.queries", throttleTime: 2000 }),
  maxAge: PERSIST_MAX_AGE,
  // Bump when an API response shape changes, so old caches are dropped instead of restored.
  buster: "1",
  dehydrateOptions: { shouldDehydrateQuery },
};
