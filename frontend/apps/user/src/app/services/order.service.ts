import { apiClient } from "./api-client.service.js";
import {
  OrderResponseSchema,
  OrderCountResponseSchema,
  type OrderResponse,
  type OrderSummaryResponse,
  type OrderCountResponse,
  type PagedResponse,
} from "@edumind/shared-types";
import { OrderStatus } from "@edumind/shared-constants";
import { ORDER_ENDPOINTS } from "@edumind/shared-utils";

export interface OrderPaginationParams {
  status?: OrderStatus;
  page?: number;
  size?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

const parseOrderResponse = (payload: unknown): OrderResponse =>
  OrderResponseSchema.parse(payload);

const parseOrderCountResponse = (payload: unknown): OrderCountResponse =>
  OrderCountResponseSchema.parse(payload);

export const orderService = {
  /**
   * Get current user's orders (paginated)
   */
  async getMyOrders(
    params: OrderPaginationParams = {}
  ): Promise<PagedResponse<OrderSummaryResponse>> {
    const response = await apiClient.get<PagedResponse<OrderSummaryResponse>>(
      ORDER_ENDPOINTS.BASE,
      { params }
    );
    return response.data!;
  },

  /**
   * Get order detail by ID
   */
  async getOrderById(orderId: number): Promise<OrderResponse> {
    const response = await apiClient.get<OrderResponse>(
      ORDER_ENDPOINTS.DETAIL(orderId)
    );
    return parseOrderResponse(response.data);
  },

  /**
   * Get order detail by order number
   */
  async getOrderByNumber(orderNumber: string): Promise<OrderResponse> {
    const response = await apiClient.get<OrderResponse>(
      ORDER_ENDPOINTS.BY_NUMBER(orderNumber)
    );
    return parseOrderResponse(response.data);
  },

  /**
   * Cancel a pending order
   */
  async cancelOrder(orderId: number): Promise<OrderResponse> {
    const response = await apiClient.post<OrderResponse>(
      ORDER_ENDPOINTS.CANCEL(orderId)
    );
    return parseOrderResponse(response.data);
  },

  /**
   * Request refund for a completed order
   * @deprecated Use refundService.requestRefund instead
   */
  async requestRefund(orderId: number, reason?: string): Promise<OrderResponse> {
    const response = await apiClient.post<OrderResponse>(
      ORDER_ENDPOINTS.REFUND(orderId),
      null,
      { params: reason ? { reason } : undefined }
    );
    return parseOrderResponse(response.data);
  },

  /**
   * Get order count by status
   */
  async getOrderCounts(): Promise<OrderCountResponse> {
    const response = await apiClient.get<OrderCountResponse>(
      ORDER_ENDPOINTS.COUNT
    );
    return parseOrderCountResponse(response.data);
  },
};

export type OrderService = typeof orderService;
