import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-keys";
import { checkoutService } from "../services/checkout.service";
import type {
  CheckoutPreviewResponse,
  CheckoutResultResponse,
  CheckoutRequest,
  DirectCheckoutRequest,
} from "@edumind/shared-types";

/**
 * Preview checkout for items in cart
 */
export const useCheckoutPreview = (enabled = true) => {
  return useQuery<CheckoutPreviewResponse>({
    queryKey: ['checkout', 'preview'],
    queryFn: () => checkoutService.previewCheckout(),
    enabled,
    staleTime: 1000 * 30, // 30 seconds - prices may change
  });
};

/**
 * Preview direct checkout for a single course
 */
export const useDirectCheckoutPreview = (courseId: number, enabled = true) => {
  return useQuery<CheckoutPreviewResponse>({
    queryKey: ['checkout', 'direct-preview', courseId],
    queryFn: () => checkoutService.previewDirectCheckout(courseId),
    enabled: enabled && courseId > 0,
    staleTime: 1000 * 30,
  });
};

/**
 * Process checkout mutation
 */
export const useCheckout = () => {
  const queryClient = useQueryClient();

  return useMutation<CheckoutResultResponse, Error, CheckoutRequest>({
    mutationFn: (request) => checkoutService.checkout(request),
    onSuccess: (result) => {
      if (result.success) {
        // Clear cart after successful checkout
        queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.cart.count });
        // Refresh orders
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
        // Refresh enrollments
        queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all });
      }
    },
  });
};

/**
 * Direct checkout (Buy Now) mutation
 */
export const useDirectCheckout = () => {
  const queryClient = useQueryClient();

  return useMutation<CheckoutResultResponse, Error, DirectCheckoutRequest>({
    mutationFn: (request) => checkoutService.directCheckout(request),
    onSuccess: (result) => {
      if (result.success) {
        // Refresh orders
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
        // Refresh enrollments
        queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all });
        // Invalidate cart check for this course
        queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
      }
    },
  });
};
