import { apiClient } from "./api-client.service.js";
import {
  RefundResponseSchema,
  RefundPolicyResponseSchema,
  type RefundResponse,
  type RefundPolicyResponse,
  type RefundRequest,
  type PagedResponse,
} from "@edumind/shared-types";
import { REFUND_ENDPOINTS } from "@edumind/shared-utils";

export interface RefundPaginationParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

const parseRefundResponse = (payload: unknown): RefundResponse =>
  RefundResponseSchema.parse(payload);

const parseRefundPolicy = (payload: unknown): RefundPolicyResponse =>
  RefundPolicyResponseSchema.parse(payload);

export const refundService = {
  async requestRefund(data: RefundRequest): Promise<RefundResponse> {
    const response = await apiClient.post<RefundResponse>(REFUND_ENDPOINTS.REQUEST, data);
    return parseRefundResponse(response.data);
  },

  async getRefundPolicy(orderId: number): Promise<RefundPolicyResponse> {
    const response = await apiClient.get<RefundPolicyResponse>(REFUND_ENDPOINTS.POLICY, {
      params: { orderId },
    });
    return parseRefundPolicy(response.data);
  },

  async getMyRefunds(params: RefundPaginationParams = {}): Promise<PagedResponse<RefundResponse>> {
    const response = await apiClient.get<PagedResponse<RefundResponse>>(
      REFUND_ENDPOINTS.MY_REFUNDS, { params }
    );
    return response.data!;
  },

  async getRefundById(refundId: number): Promise<RefundResponse> {
    const response = await apiClient.get<RefundResponse>(REFUND_ENDPOINTS.DETAIL(refundId));
    return parseRefundResponse(response.data);
  },

  async getRefundByOrderId(orderId: number): Promise<RefundResponse | null> {
    try {
      const response = await apiClient.get<RefundResponse>(REFUND_ENDPOINTS.BY_ORDER(orderId));
      return parseRefundResponse(response.data);
    } catch {
      // 404 = no refund exists for this order
      return null;
    }
  },
};
