import { QueryClient } from "@tanstack/react-query";

// Single shared QueryClient instance for the entire app.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

