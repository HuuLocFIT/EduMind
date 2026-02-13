import { apiClient } from "./api-client.service.js";
import {
  PayoutResponseSchema,
  PayoutSummaryResponseSchema,
  PayoutSettingsSchema,
  type PayoutResponse,
  type PayoutSummaryResponse,
  type PayoutSettings,
  type PagedResponse,
} from "@edumind/shared-types";
import { PAYOUT_ENDPOINTS } from "@edumind/shared-utils";

export interface PayoutPaginationParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

const parsePayoutResponse = (payload: unknown): PayoutResponse =>
  PayoutResponseSchema.parse(payload);

const parsePayoutSummary = (payload: unknown): PayoutSummaryResponse =>
  PayoutSummaryResponseSchema.parse(payload);

const parsePayoutSettings = (payload: unknown): PayoutSettings =>
  PayoutSettingsSchema.parse(payload);

export const payoutService = {
  async getMyPayouts(params: PayoutPaginationParams = {}): Promise<PagedResponse<PayoutResponse>> {
    const response = await apiClient.get<PagedResponse<PayoutResponse>>(
      PAYOUT_ENDPOINTS.BASE, { params }
    );
    return response.data!;
  },

  async getPayoutById(payoutId: number): Promise<PayoutResponse> {
    const response = await apiClient.get<PayoutResponse>(PAYOUT_ENDPOINTS.DETAIL(payoutId));
    return parsePayoutResponse(response.data);
  },

  async getPayoutSummary(): Promise<PayoutSummaryResponse> {
    const response = await apiClient.get<PayoutSummaryResponse>(PAYOUT_ENDPOINTS.SUMMARY);
    return parsePayoutSummary(response.data);
  },

  async getPayoutSettings(): Promise<PayoutSettings> {
    const response = await apiClient.get<PayoutSettings>(PAYOUT_ENDPOINTS.SETTINGS);
    return parsePayoutSettings(response.data);
  },

  async updatePayoutSettings(payload: PayoutSettings): Promise<PayoutSettings> {
    const response = await apiClient.put<PayoutSettings>(PAYOUT_ENDPOINTS.SETTINGS, payload);
    return parsePayoutSettings(response.data);
  },
};
