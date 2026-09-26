import { QueryCache, QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { RouterProvider } from "react-router";
import { LocationProvider } from "../state/location.tsx";
import { reportQueryResult } from "../state/offline.ts";
import { PERSIST_MAX_AGE, persistOptions } from "../sw/persister.ts";
import { ToastProvider } from "../ui/Toast.tsx";
import { router } from "./router.tsx";

const queryClient = new QueryClient({
  // Feeds the offline signal: a network failure means offline until the next success (D22).
  queryCache: new QueryCache({ onError: reportQueryResult, onSuccess: () => reportQueryResult(null) }),
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      gcTime: PERSIST_MAX_AGE,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

export function App() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <LocationProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </LocationProvider>
    </PersistQueryClientProvider>
  );
}
