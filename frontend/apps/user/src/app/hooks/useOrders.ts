import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-keys";
import { orderService, type OrderPaginationParams } from "../services/order.service";
import type {
  OrderResponse,
  OrderSummaryResponse,
  OrderCountResponse,
  PagedResponse,
} from "@edumind/shared-types";

/**
 * Fetch user's orders (paginated)
 */
export const useOrders = (params: OrderPaginationParams = {}) => {
  return useQuery<PagedResponse<OrderSummaryResponse>>({
    queryKey: queryKeys.orders.list(params),
    queryFn: () => orderService.getMyOrders(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

/**
 * Fetch order detail by ID
 */
export const useOrder = (orderId: number, enabled = true) => {
  return useQuery<OrderResponse>({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => orderService.getOrderById(orderId),
    enabled: enabled && orderId > 0,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Fetch order by order number
 */
export const useOrderByNumber = (orderNumber: string, enabled = true) => {
  return useQuery<OrderResponse>({
    queryKey: queryKeys.orders.byNumber(orderNumber),
    queryFn: () => orderService.getOrderByNumber(orderNumber),
    enabled: enabled && !!orderNumber,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Get order counts by status
 */
export const useOrderCounts = () => {
  return useQuery<OrderCountResponse>({
    queryKey: queryKeys.orders.count,
    queryFn: () => orderService.getOrderCounts(),
    staleTime: 1000 * 60 * 2,
  });
};

/**
 * Cancel order mutation
 */
export const useCancelOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<OrderResponse, Error, number>({
    mutationFn: (orderId) => orderService.cancelOrder(orderId),
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.count });
    },
  });
};

/**
 * Request refund mutation
 */
export const useRequestRefund = () => {
  const queryClient = useQueryClient();

  return useMutation<OrderResponse, Error, { orderId: number; reason?: string }>({
    mutationFn: ({ orderId, reason }) => orderService.requestRefund(orderId, reason),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.count });
    },
  });
};
