import { QueryCache, QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { RouterProvider } from "react-router";
import { LocationProvider } from "../state/location.tsx";
import { reportQueryResult } from "../state/offline.ts";
import { PERSIST_MAX_AGE, PERSISTED_ROOTS, persistOptions, shouldPersist } from "../sw/persister.ts";
import { ToastProvider } from "../ui/Toast.tsx";
import { router } from "./router.tsx";

/** Unused entries (search, plan, walk, superseded nearby cells) leave memory after this. */
const GC_MS = 10 * 60_000;

const queryClient = new QueryClient({
  // Feeds the offline signal: a network failure means offline until the next success (D22).
  queryCache: new QueryCache({ onError: reportQueryResult, onSuccess: () => reportQueryResult(null) }),
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      gcTime: GC_MS,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});
// What a cold start offline needs (D22) lives as long as the persisted cache; see persister.ts.
for (const root of PERSISTED_ROOTS) queryClient.setQueryDefaults([root], { gcTime: PERSIST_MAX_AGE });
const persist = { ...persistOptions, dehydrateOptions: { shouldDehydrateQuery: shouldPersist(queryClient.getQueryCache()) } };

export function App() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persist}>
      <LocationProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </LocationProvider>
    </PersistQueryClientProvider>
  );
}
