import { hashKey, QueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";

const authenticatedQueryHash = (queryKey: readonly unknown[]) =>
  hashKey([
    "authenticated-user",
    useAuthStore.getState().user?.id ?? "anonymous",
    ...queryKey,
  ]);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
      queryKeyHashFn: authenticatedQueryHash,
    },
  },
});

export const clearPrivateQueryState = () => {
  void queryClient.cancelQueries();
  queryClient.clear();
};
