import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { isDev } from "@edumind/shared-utils";
import { CACHE_TIME } from "./query-config";

const shouldRetry = (failureCount: number, error: unknown) => {
  const status = (error as any)?.response?.status as number | undefined;

  // Do not retry for most client errors (except 429)
  if (status && status >= 400 && status < 500 && status !== 429) {
    return false;
  }

  // Cap retries
  return failureCount < 2;
};

const queryCache = new QueryCache({
  onError: (error, query) => {
    if (isDev) {
      console.error("[RQ][query] onError", { key: query.queryKey, error });
    }
  },
  onSuccess: (_data, query) => {
    if (isDev) {
      console.info("[RQ][query] onSuccess", { key: query.queryKey });
    }
  },
});

const mutationCache = new MutationCache({
  onError: (error, _variables, _context, mutation) => {
    if (isDev) {
      console.error("[RQ][mutation] onError", {
        key: mutation.options.mutationKey,
        error,
      });
    }
  },
  onSuccess: (_data, _variables, _context, mutation) => {
    if (isDev) {
      console.info("[RQ][mutation] onSuccess", {
        key: mutation.options.mutationKey,
      });
    }
  },
});

// Single shared QueryClient instance for the entire app.
export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: shouldRetry,
      // Zero-latency defaults: serve cached data instantly on revisit and
      // revalidate in the background. Hooks that need different freshness
      // still override staleTime explicitly (see query-config.ts).
      staleTime: 30 * 1000, // 30s — treat data as fresh for a short window
      gcTime: CACHE_TIME.long, // 30m — keep cache warm across navigation
    },
  },
});


