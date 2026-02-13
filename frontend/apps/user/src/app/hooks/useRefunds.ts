import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-keys";
import { refundService, type RefundPaginationParams } from "../services/refund.service";
import type { RefundResponse, RefundPolicyResponse, RefundRequest, PagedResponse } from "@edumind/shared-types";

export const useRefundPolicy = (orderId: number, enabled = true) => {
  return useQuery<RefundPolicyResponse>({
    queryKey: queryKeys.refunds.policy(orderId),
    queryFn: () => refundService.getRefundPolicy(orderId),
    enabled: enabled && orderId > 0,
    staleTime: 1000 * 60 * 5,
  });
};

export const useMyRefunds = (params: RefundPaginationParams = {}) => {
  return useQuery<PagedResponse<RefundResponse>>({
    queryKey: queryKeys.refunds.list(params),
    queryFn: () => refundService.getMyRefunds(params),
    staleTime: 1000 * 60 * 2,
  });
};

export const useRefund = (refundId: number, enabled = true) => {
  return useQuery<RefundResponse>({
    queryKey: queryKeys.refunds.detail(refundId),
    queryFn: () => refundService.getRefundById(refundId),
    enabled: enabled && refundId > 0,
    staleTime: 1000 * 60 * 5,
  });
};

export const useSubmitRefundRequest = () => {
  const queryClient = useQueryClient();
  return useMutation<RefundResponse, Error, RefundRequest>({
    mutationFn: (data) => refundService.requestRefund(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.refunds.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.count });
    },
  });
};

/**
 * Get refund for a specific order
 * Returns the refund if it exists, null otherwise
 */
export const useRefundByOrder = (orderId: number, enabled = true) => {
  return useQuery<RefundResponse | null>({
    queryKey: [...queryKeys.refunds.all, 'byOrder', orderId],
    queryFn: () => refundService.getRefundByOrderId(orderId),
    enabled: enabled && orderId > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};
