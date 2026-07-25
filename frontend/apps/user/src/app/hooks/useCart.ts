import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-keys";
import { cartService } from "../services/cart.service";
import { useAuthStore } from "../stores/auth.store";
import type { CartResponse } from "@edumind/shared-types";

/**
 * Fetch current user's cart
 * Only fetches when user is authenticated to prevent 401 errors on public pages
 */
export const useCart = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  return useQuery<CartResponse>({
    queryKey: queryKeys.cart.all,
    queryFn: () => cartService.getCart(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: isAuthenticated, // Only fetch when authenticated
  });
};

/**
 * Get cart item count (for badge display)
 * Only fetches when user is authenticated to prevent 401 errors on public pages
 */
export const useCartCount = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  return useQuery<number>({
    queryKey: queryKeys.cart.count,
    queryFn: () => cartService.getCartCount(),
    staleTime: 1000 * 60 * 5,
    enabled: isAuthenticated, // Only fetch when authenticated
  });
};

/**
 * Check if a course is in cart
 * Only fetches when user is authenticated to prevent 401 errors on public pages
 */
export const useIsInCart = (courseId: number, enabled = true) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  return useQuery<boolean>({
    queryKey: queryKeys.cart.check(courseId),
    queryFn: () => cartService.isInCart(courseId),
    enabled: enabled && courseId > 0 && isAuthenticated, // Only fetch when authenticated
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Add course to cart mutation
 */
export const useAddToCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (courseId: number) => cartService.addToCart(courseId),
    onSuccess: () => {
      // Invalidate cart queries
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.count });
    },
  });
};

/**
 * Remove course from cart mutation
 *
 * Optimistic: the item disappears from the cart (and the badge count drops)
 * instantly, before the server responds. Rolls back if the request fails.
 */
export const useRemoveFromCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (courseId: number) => cartService.removeFromCart(courseId),
    onMutate: async (courseId) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: queryKeys.cart.all }),
        queryClient.cancelQueries({ queryKey: queryKeys.cart.count }),
      ]);

      const previousCart = queryClient.getQueryData<CartResponse>(
        queryKeys.cart.all
      );
      const previousCount = queryClient.getQueryData<number>(
        queryKeys.cart.count
      );

      if (previousCart) {
        const remaining = previousCart.items.filter(
          (item) => item.courseId !== courseId
        );
        // Recompute totals from the remaining items so the summary stays correct
        queryClient.setQueryData<CartResponse>(queryKeys.cart.all, {
          ...previousCart,
          items: remaining,
          itemCount: remaining.length,
          subtotal: remaining.reduce((sum, i) => sum + i.originalPrice, 0),
          discountTotal: remaining.reduce(
            (sum, i) => sum + (i.discountAmount ?? 0),
            0
          ),
          totalAmount: remaining.reduce((sum, i) => sum + i.effectivePrice, 0),
        });
      }

      if (typeof previousCount === "number") {
        queryClient.setQueryData<number>(
          queryKeys.cart.count,
          Math.max(0, previousCount - 1)
        );
      }

      return { previousCart, previousCount };
    },
    onError: (_err, _courseId, context) => {
      // Restore the pre-mutation snapshots
      if (context?.previousCart !== undefined) {
        queryClient.setQueryData(queryKeys.cart.all, context.previousCart);
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(queryKeys.cart.count, context.previousCount);
      }
    },
    onSettled: (_data, _err, courseId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.count });
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.check(courseId) });
    },
  });
};

/**
 * Clear entire cart mutation
 */
export const useClearCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cartService.clearCart(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.count });
    },
  });
};
