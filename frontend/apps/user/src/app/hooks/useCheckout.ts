import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useCallback } from "react";
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

// Order expires after 15 minutes (matches backend payment.sepay.qr-expire-minutes)
const ORDER_EXPIRATION_MS = 15 * 60 * 1000; // 15 minutes in milliseconds
const DEFAULT_POLLING_INTERVAL_MS = 3000; // 3 seconds

/**
 * Check payment status query (for polling Sepay QR payments)
 * Polls every interval until payment is confirmed via webhook
 *
 * Features:
 * - Automatically stops polling after 15 minutes (order expiration)
 * - Stops polling when status becomes COMPLETED, FAILED, CANCELLED, or REFUNDED
 * - Handles pending status for async payments (SePay bank transfer)
 */
export const usePaymentStatus = (
  orderId: number | null,
  options?: {
    enabled?: boolean;
    refetchInterval?: number | false;
    onSuccess?: (data: CheckoutResultResponse) => void;
    onExpired?: () => void;
  }
) => {
  const queryClient = useQueryClient();

  // Use ref to track polling start time (persists across re-renders)
  const pollingStartTimeRef = useRef<number | null>(null);

  // Initialize polling start time when hook is first enabled
  const getPollingStartTime = useCallback(() => {
    if (pollingStartTimeRef.current === null) {
      pollingStartTimeRef.current = Date.now();
    }
    return pollingStartTimeRef.current;
  }, []);

  // Reset polling start time when orderId changes
  const resetPollingStartTime = useCallback(() => {
    pollingStartTimeRef.current = Date.now();
  }, []);

  return useQuery<CheckoutResultResponse>({
    queryKey: ['checkout', 'status', orderId],
    queryFn: async () => {
      // Ensure polling start time is set
      getPollingStartTime();
      return checkoutService.checkPaymentStatus(orderId!);
    },
    enabled: options?.enabled !== false && orderId !== null && orderId > 0,
    refetchIntervalInBackground: false, // Stop polling when tab is not active
    refetchInterval: (query) => {
      const data = query.state.data;

      // Check if polling has exceeded max duration (15 minutes)
      const startTime = pollingStartTimeRef.current || Date.now();
      const elapsed = Date.now() - startTime;

      if (elapsed > ORDER_EXPIRATION_MS) {
        // Order has likely expired - stop polling
        options?.onExpired?.();
        return false;
      }

      // Stop polling if order has reached a terminal state
      if (data) {
        const terminalStatuses = ['COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'];
        if (data.orderStatus && terminalStatuses.includes(data.orderStatus)) {
          return false;
        }

        // Also stop if success is explicitly true (completed)
        if (data.success && data.orderStatus === 'COMPLETED') {
          return false;
        }
      }

      // Continue polling for PENDING status or if data hasn't loaded yet
      return options?.refetchInterval ?? DEFAULT_POLLING_INTERVAL_MS;
    },
    select: (data) => {
      // When payment is successful, invalidate relevant queries
      if (data.success && data.orderStatus === 'COMPLETED') {
        queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.cart.count });
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all });

        // Call onSuccess callback if provided
        options?.onSuccess?.(data);
      }
      return data;
    },
  });
};

/**
 * Helper to calculate time remaining for order expiration
 * Returns seconds remaining, or 0 if expired
 */
export const calculateTimeRemaining = (orderCreatedAt: Date | string): number => {
  const createdTime = typeof orderCreatedAt === 'string'
    ? new Date(orderCreatedAt).getTime()
    : orderCreatedAt.getTime();

  const expiresAt = createdTime + ORDER_EXPIRATION_MS;
  const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));

  return remaining;
};

/**
 * Format seconds as MM:SS string
 */
export const formatTimeRemaining = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
