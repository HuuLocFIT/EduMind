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

/**
 * Capture payment mutation (for PayPal after user approval)
 */
export const useCapturePayment = () => {
  const queryClient = useQueryClient();

  return useMutation<CheckoutResultResponse, Error, string>({
    mutationFn: (token) => checkoutService.capturePayment(token),
    onSuccess: (result) => {
      if (result.success) {
        // Clear cart
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
 * Cancel payment mutation (user cancelled on PayPal page)
 */
export const useCancelPayment = () => {
  return useMutation<CheckoutResultResponse, Error, number>({
    mutationFn: (orderId) => checkoutService.cancelPayment(orderId),
  });
};

/**
 * Check payment status query (for polling Sepay QR payments)
 * Polls every interval until payment is confirmed via webhook
 */
export const usePaymentStatus = (
  orderId: number | null,
  options?: {
    enabled?: boolean;
    refetchInterval?: number | false;
    onSuccess?: (data: CheckoutResultResponse) => void;
  }
) => {
  const queryClient = useQueryClient();

  return useQuery<CheckoutResultResponse>({
    queryKey: ['checkout', 'status', orderId],
    queryFn: () => checkoutService.checkPaymentStatus(orderId!),
    enabled: options?.enabled !== false && orderId !== null && orderId > 0,
    refetchInterval: options?.refetchInterval ?? 3000, // Default 3 seconds polling
    refetchIntervalInBackground: false, // Stop polling when tab is not active
    select: (data) => {
      // When payment is successful, invalidate relevant queries
      if (data.success && data.orderStatus === 'COMPLETED') {
        queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.cart.count });
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all });
      }
      return data;
    },
  });
};
