import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import { LocationProvider } from "../state/location.tsx";
import { ToastProvider } from "../ui/Toast.tsx";
import { router } from "./router.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LocationProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </LocationProvider>
    </QueryClientProvider>
  );
}
